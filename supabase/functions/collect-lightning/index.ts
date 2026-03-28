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

    // Fetch Lightning Network stats from mempool.space (no auth needed)
    const res = await fetch("https://mempool.space/api/v1/lightning/statistics/latest");
    if (!res.ok) throw new Error(`Lightning stats API error: ${res.status}`);
    const data = await res.json();

    const capacityBtc = data.latest.total_capacity / 1e8;
    const channelCount = data.latest.channel_count;
    const nodeCount = data.latest.node_count;

    const metrics = [
      { key: "lightning.capacity_btc", value: capacityBtc, name: "Lightning Capacity", unit: "BTC" },
      { key: "lightning.channel_count", value: channelCount, name: "Lightning Channels", unit: "channels" },
      { key: "lightning.node_count", value: nodeCount, name: "Lightning Nodes", unit: "nodes" },
    ];

    // Find all users with an active lightning integration
    const { data: integrations } = await supabase
      .from("user_integrations")
      .select("user_id")
      .eq("provider", "lightning")
      .eq("is_active", true);

    let synced = 0;

    for (const integration of integrations || []) {
      for (const m of metrics) {
        // Find or create the metric
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
        .eq("provider", "lightning");
    }

    return new Response(
      JSON.stringify({ capacity_btc: capacityBtc, channel_count: channelCount, node_count: nodeCount, synced, total: integrations?.length || 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("collect-lightning error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
