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

    // Fetch BTC price from Coinbase (no auth needed)
    const res = await fetch("https://api.coinbase.com/v2/prices/BTC-USD/spot");
    if (!res.ok) throw new Error(`Coinbase API error: ${res.status}`);
    const data = await res.json();
    const price = Math.round(parseFloat(data.data.amount));
    const moscowTime = Math.round(100_000_000 / price);

    const metrics = [
      { key: "bitcoin.price_usd", value: price, name: "Bitcoin Price", unit: "USD" },
      { key: "bitcoin.moscow_time", value: moscowTime, name: "Moscow Time", unit: "sats/$" },
    ];

    const { synced, total } = await batchUpsertDatapoints(supabase, "bitcoin", metrics);

    return new Response(
      JSON.stringify({ price, moscow_time: moscowTime, synced, total }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("collect-bitcoin error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
