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

    // Fetch all data in parallel — mempool.space is public, no auth needed
    const [feesRes, hashrateRes, blockHeightRes, mempoolRes] = await Promise.all([
      fetch("https://mempool.space/api/v1/fees/recommended"),
      fetch("https://mempool.space/api/v1/mining/hashrate/1d"),
      fetch("https://mempool.space/api/blocks/tip/height"),
      fetch("https://mempool.space/api/mempool"),
    ]);

    if (!feesRes.ok) throw new Error(`mempool fees API: ${feesRes.status}`);
    if (!hashrateRes.ok) throw new Error(`mempool hashrate API: ${hashrateRes.status}`);
    if (!blockHeightRes.ok) throw new Error(`mempool block height API: ${blockHeightRes.status}`);
    if (!mempoolRes.ok) throw new Error(`mempool stats API: ${mempoolRes.status}`);

    const fees = await feesRes.json();
    const hashrate = await hashrateRes.json();
    const blockHeight = parseInt(await blockHeightRes.text(), 10);
    const mempool = await mempoolRes.json();

    // Convert hashrate from H/s to EH/s for readability
    const hashrateEHs = hashrate.currentHashrate / 1e18;

    const metrics = [
      { key: "mempool.fees.fastest", value: fees.fastestFee, name: "Fastest Fee", unit: "sat/vB" },
      { key: "mempool.fees.half_hour", value: fees.halfHourFee, name: "Half-Hour Fee", unit: "sat/vB" },
      { key: "mempool.fees.hour", value: fees.hourFee, name: "1-Hour Fee", unit: "sat/vB" },
      { key: "mempool.fees.economy", value: fees.economyFee, name: "Economy Fee", unit: "sat/vB" },
      { key: "mempool.fees.minimum", value: fees.minimumFee, name: "Minimum Fee", unit: "sat/vB" },
      { key: "mempool.hashrate", value: hashrateEHs, name: "Hashrate", unit: "EH/s" },
      { key: "mempool.difficulty", value: hashrate.currentDifficulty, name: "Difficulty", unit: "" },
      { key: "mempool.block_height", value: blockHeight, name: "Block Height", unit: "blocks" },
      { key: "mempool.tx_count", value: mempool.count, name: "Mempool TX Count", unit: "txs" },
      { key: "mempool.vsize", value: mempool.vsize, name: "Mempool vSize", unit: "vB" },
    ];

    // Find all users with an active mempool integration
    const { data: integrations } = await supabase
      .from("user_integrations")
      .select("user_id")
      .eq("provider", "mempool")
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
        .eq("provider", "mempool");
    }

    return new Response(
      JSON.stringify({
        fees,
        hashrate_ehs: hashrateEHs,
        block_height: blockHeight,
        tx_count: mempool.count,
        synced,
        total: integrations?.length || 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("collect-mempool error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
