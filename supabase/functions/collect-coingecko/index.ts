import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { batchUpsertDatapoints } from "../_shared/batch-upsert.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch global crypto market data — CoinGecko public API, no auth needed
    const res = await fetch("https://api.coingecko.com/api/v3/global");
    if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);
    const { data } = await res.json();

    const btcDominance = parseFloat(data.market_cap_percentage.btc.toFixed(2));
    const totalMarketCap = Math.round(data.total_market_cap.usd);
    const totalVolume24h = Math.round(data.total_volume.usd);
    const activeCryptos = data.active_cryptocurrencies;

    const metrics = [
      { key: "coingecko.btc_dominance",         value: btcDominance,   name: "BTC Dominance",           unit: "%" },
      { key: "coingecko.total_market_cap_usd",   value: totalMarketCap, name: "Total Market Cap",        unit: "USD" },
      { key: "coingecko.total_volume_24h",        value: totalVolume24h, name: "24h Total Volume",        unit: "USD" },
      { key: "coingecko.active_cryptocurrencies", value: activeCryptos,  name: "Active Cryptocurrencies", unit: "" },
    ];

    const { synced, total } = await batchUpsertDatapoints(supabase, "coingecko", metrics);

    return new Response(
      JSON.stringify({
        btc_dominance: btcDominance,
        total_market_cap_usd: totalMarketCap,
        total_volume_24h: totalVolume24h,
        active_cryptocurrencies: activeCryptos,
        synced,
        total,
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
