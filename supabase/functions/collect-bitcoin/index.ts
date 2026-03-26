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

    // Fetch BTC price from Coinbase (no auth needed)
    const res = await fetch("https://api.coinbase.com/v2/prices/BTC-USD/spot");
    if (!res.ok) throw new Error(`Coinbase API error: ${res.status}`);
    const data = await res.json();
    const price = Math.round(parseFloat(data.data.amount));

    // Find all users who have the bitcoin integration active
    const { data: integrations } = await supabase
      .from("user_integrations")
      .select("user_id")
      .eq("provider", "bitcoin")
      .eq("is_active", true);

    let synced = 0;

    for (const integration of integrations || []) {
      // Find or create the metric for this user
      let metricId: string;
      const { data: existing } = await supabase
        .from("metrics")
        .select("id")
        .eq("key", "bitcoin.price_usd")
        .eq("user_id", integration.user_id)
        .maybeSingle();

      if (existing) {
        metricId = existing.id;
      } else {
        const { data: created, error } = await supabase
          .from("metrics")
          .insert({
            key: "bitcoin.price_usd",
            name: "Bitcoin Price",
            user_id: integration.user_id,
            value_type: "float",
            category: "custom",
            unit: "USD",
          })
          .select("id")
          .single();
        if (error) continue;
        metricId = created.id;
      }

      // Insert datapoint
      const { error: insertErr } = await supabase.from("datapoints").insert({
        metric_id: metricId,
        value: price,
      });

      if (!insertErr) synced++;

      // Update last_synced_at
      await supabase
        .from("user_integrations")
        .update({ last_synced_at: new Date().toISOString(), last_error: null })
        .eq("user_id", integration.user_id)
        .eq("provider", "bitcoin");
    }

    return new Response(
      JSON.stringify({ price, synced, total: integrations?.length || 0 }),
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
