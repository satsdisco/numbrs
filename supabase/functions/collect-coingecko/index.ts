import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch global crypto market data — CoinGecko public API, no auth needed
    const res = await fetch("https://api.coingecko.com/api/v3/global");
    if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);
    const { data } = await res.json();

    const btcDominance = parseFloat(data.market_cap_percentage.btc.toFixed(2));
    const totalMarketCap = Math.round(data.total_market_cap.usd);
    const totalVolume24h = Math.round(data.total_volume.usd);
    const activeCryptos = data.active_cryptocurrencies;

    const metrics = [
      { key: "coingecko.btc_dominance",          value: btcDominance,   name: "BTC Dominance",           unit: "%" },
      { key: "coingecko.total_market_cap_usd",    value: totalMarketCap, name: "Total Market Cap",        unit: "USD" },
      { key: "coingecko.total_volume_24h",         value: totalVolume24h, name: "24h Total Volume",        unit: "USD" },
      { key: "coingecko.active_cryptocurrencies",  value: activeCryptos,  name: "Active Cryptocurrencies", unit: "" },
    ];

    // Find all users with an active coingecko integration
    const { data: integrations } = await supabase
      .from("user_integrations")
      .select("user_id")
      .eq("provider", "coingecko")
      .eq("is_active", true);

    let synced = 0;

    for (const integration of integrations || []) {
      for (const m of metrics) {
        let metricId: string;
        const { data: existing } = await supabase
          .from("metrics")
          .select("id")
          .eq("key", m.key)
          .eq("user_id", integration.user_id)
          .maybeSingle();

        if (existing) {
          metricId = existing.id;
        } else {
          const { data: created, error } = await supabase
            .from("metrics")
            .insert({
              key: m.key,
              name: m.name,
              user_id: integration.user_id,
              value_type: "float",
              category: "custom",
              unit: m.unit,
            })
            .select("id")
            .single();
          if (error) continue;
          metricId = created.id;
        }

        const { error: insertErr } = await supabase.from("datapoints").insert({
          metric_id: metricId,
          value: m.value,
        });

        if (!insertErr) synced++;
      }

      await supabase
        .from("user_integrations")
        .update({ last_synced_at: new Date().toISOString(), last_error: null })
        .eq("user_id", integration.user_id)
        .eq("provider", "coingecko");
    }

    return new Response(
      JSON.stringify({
        btc_dominance: btcDominance,
        total_market_cap_usd: totalMarketCap,
        total_volume_24h: totalVolume24h,
        active_cryptocurrencies: activeCryptos,
        synced,
        total: integrations?.length || 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("collect-coingecko error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
