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

    // Fetch Lightning Network stats from mempool.space (no auth needed)
    const res = await fetch("https://mempool.space/api/v1/lightning/statistics/latest");
    if (!res.ok) throw new Error(`Lightning stats API error: ${res.status}`);
    const data = await res.json();

    const capacityBtc = data.latest.total_capacity / 1e8;
    const channelCount = data.latest.channel_count;
    const nodeCount = data.latest.node_count;

    const metrics = [
      { key: "lightning.capacity_btc",  value: capacityBtc,   name: "Lightning Capacity", unit: "BTC"      },
      { key: "lightning.channel_count", value: channelCount,  name: "Lightning Channels", unit: "channels" },
      { key: "lightning.node_count",    value: nodeCount,     name: "Lightning Nodes",    unit: "nodes"    },
    ];

    const { synced, total } = await batchUpsertDatapoints(supabase, "lightning", metrics);

    return new Response(
      JSON.stringify({ capacity_btc: capacityBtc, channel_count: channelCount, node_count: nodeCount, synced, total }),
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
