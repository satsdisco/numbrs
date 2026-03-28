import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FredConfig {
  api_key?: string;
}

const SERIES = [
  { id: "M2SL",     key: "fred.m2_money_supply", name: "M2 Money Supply", unit: "$B" },
  { id: "CPIAUCSL", key: "fred.cpi",              name: "CPI",             unit: ""   },
  { id: "FEDFUNDS", key: "fred.fed_funds_rate",   name: "Fed Funds Rate",  unit: "%"  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active FRED integrations (each user supplies their own API key)
    const { data: integrations } = await supabase
      .from("user_integrations")
      .select("user_id, config")
      .eq("provider", "fred")
      .eq("is_active", true);

    let totalSynced = 0;
    const results: { user_id: string; synced: number; error?: string }[] = [];

    for (const integration of integrations || []) {
      const config = integration.config as FredConfig;
      const apiKey = config.api_key;

      if (!apiKey) {
        await supabase
          .from("user_integrations")
          .update({ last_error: "Missing FRED API key in config" })
          .eq("user_id", integration.user_id)
          .eq("provider", "fred");
        results.push({ user_id: integration.user_id, synced: 0, error: "no api_key" });
        continue;
      }

      let synced = 0;

      try {
        for (const s of SERIES) {
          const url =
            `https://api.stlouisfed.org/fred/series/observations` +
            `?series_id=${s.id}&api_key=${apiKey}&sort_order=desc&limit=1&file_type=json`;

          const res = await fetch(url);
          if (!res.ok) throw new Error(`FRED API error for ${s.id}: ${res.status}`);
          const data = await res.json();

          if (data.error_message) throw new Error(`FRED: ${data.error_message}`);

          const obs = data.observations?.[0];
          if (!obs || obs.value === ".") continue; // series not yet released
          const value = parseFloat(obs.value);

          let metricId: string;
          const { data: existing } = await supabase
            .from("metrics")
            .select("id")
            .eq("key", s.key)
            .eq("user_id", integration.user_id)
            .maybeSingle();

          if (existing) {
            metricId = existing.id;
          } else {
            const { data: created, error } = await supabase
              .from("metrics")
              .insert({
                key: s.key,
                name: s.name,
                user_id: integration.user_id,
                value_type: "float",
                category: "custom",
                unit: s.unit,
              })
              .select("id")
              .single();
            if (error) continue;
            metricId = created.id;
          }

          const { error: insertErr } = await supabase.from("datapoints").insert({
            metric_id: metricId,
            value,
          });

          if (!insertErr) synced++;
        }

        totalSynced += synced;
        results.push({ user_id: integration.user_id, synced });

        await supabase
          .from("user_integrations")
          .update({ last_synced_at: new Date().toISOString(), last_error: null })
          .eq("user_id", integration.user_id)
          .eq("provider", "fred");
      } catch (err) {
        const msg = (err as Error).message;
        await supabase
          .from("user_integrations")
          .update({ last_error: msg })
          .eq("user_id", integration.user_id)
          .eq("provider", "fred");
        results.push({ user_id: integration.user_id, synced: 0, error: msg });
      }
    }

    return new Response(
      JSON.stringify({ synced: totalSynced, users: results.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("collect-fred error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
