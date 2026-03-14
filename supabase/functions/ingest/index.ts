import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing X-API-KEY header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up user from API key
    const { data: userId, error: keyError } = await supabase.rpc(
      "get_user_id_from_api_key",
      { api_key_value: apiKey }
    );

    if (keyError || !userId) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update last_used_at
    await supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() } as any)
      .eq("key", apiKey);

    const body = await req.json();
    const datapoints = Array.isArray(body) ? body : [body];

    if (datapoints.length === 0) {
      return new Response(JSON.stringify({ error: "Empty payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let ingested = 0;
    const errors: string[] = [];

    for (const dp of datapoints) {
      // Support both old format (key) and new format (metric_key + relay_url)
      const metricKey = dp.metric_key || dp.key;
      if (!metricKey || dp.value === undefined) {
        errors.push("Missing metric_key/key or value");
        continue;
      }

      // Find metric definition by key
      let metric: { id: string } | null = null;

      // First try system metrics (no user_id)
      const { data: sysMetric } = await supabase
        .from("metrics")
        .select("id")
        .eq("key", metricKey)
        .is("user_id", null)
        .maybeSingle();

      if (sysMetric) {
        metric = sysMetric;
      } else {
        // Then try user's own metrics
        const { data: userMetric } = await supabase
          .from("metrics")
          .select("id")
          .eq("key", metricKey)
          .eq("user_id", userId)
          .maybeSingle();

        if (userMetric) {
          metric = userMetric;
        } else {
          // Auto-create metric definition for user
          const { data: newMetric, error: createErr } = await supabase
            .from("metrics")
            .insert({
              key: metricKey,
              name: metricKey,
              user_id: userId,
              value_type: "float",
              category: "custom",
            })
            .select("id")
            .single();

          if (createErr) {
            errors.push(`Failed to create metric "${metricKey}": ${createErr.message}`);
            continue;
          }
          metric = newMetric;
        }
      }

      // Resolve relay_id if relay_url is provided
      let relayId: string | null = null;
      if (dp.relay_url) {
        const { data: relay } = await supabase
          .from("relays")
          .select("id")
          .eq("url", dp.relay_url)
          .eq("user_id", userId)
          .maybeSingle();

        if (relay) {
          relayId = relay.id;
        } else {
          // Auto-create relay
          const relayName = dp.relay_url.replace(/^wss?:\/\//, "").replace(/\/$/, "");
          const { data: newRelay, error: relayErr } = await supabase
            .from("relays")
            .insert({ url: dp.relay_url, name: relayName, user_id: userId } as any)
            .select("id")
            .single();

          if (relayErr) {
            errors.push(`Failed to create relay "${dp.relay_url}": ${relayErr.message}`);
            continue;
          }
          relayId = newRelay.id;
        }
      }

      const insertObj: any = {
        metric_id: metric!.id,
        value: Number(dp.value),
        dimensions: dp.tags || dp.dimensions || {},
        created_at: dp.recorded_at || dp.timestamp || new Date().toISOString(),
      };
      if (relayId) insertObj.relay_id = relayId;

      const { error: insertError } = await supabase.from("datapoints").insert(insertObj);

      if (insertError) {
        errors.push(`Failed to insert "${metricKey}": ${insertError.message}`);
      } else {
        ingested++;
      }
    }

    return new Response(
      JSON.stringify({ ingested, errors: errors.length > 0 ? errors : undefined }),
      {
        status: errors.length > 0 && ingested === 0 ? 400 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Ingest error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
