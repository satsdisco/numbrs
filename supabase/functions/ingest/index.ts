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
      if (!dp.key || dp.value === undefined) {
        errors.push(`Missing key or value in datapoint`);
        continue;
      }

      // Find metric by key and user
      const { data: metric, error: metricError } = await supabase
        .from("metrics")
        .select("id")
        .eq("key", dp.key)
        .eq("user_id", userId)
        .maybeSingle();

      if (metricError || !metric) {
        errors.push(`Metric "${dp.key}" not found`);
        continue;
      }

      const { error: insertError } = await supabase.from("datapoints").insert({
        metric_id: metric.id,
        value: Number(dp.value),
        dimensions: dp.tags || dp.dimensions || {},
        created_at: dp.timestamp || new Date().toISOString(),
      });

      if (insertError) {
        errors.push(`Failed to insert "${dp.key}": ${insertError.message}`);
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
