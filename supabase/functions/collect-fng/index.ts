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

    // Fetch Fear & Greed Index from alternative.me (no auth needed)
    const res = await fetch("https://api.alternative.me/fng/?limit=1");
    if (!res.ok) throw new Error(`Fear & Greed API error: ${res.status}`);
    const data = await res.json();
    const entry = data.data[0];
    const fngValue = parseInt(entry.value, 10);
    const fngClassification = entry.value_classification as string;

    // Only store the numeric value — classification is a string and can't go in the numeric datapoints table
    const metrics = [
      { key: "fng.value", value: fngValue, name: "Fear & Greed Index", unit: "" },
    ];

    const { synced, total } = await batchUpsertDatapoints(supabase, "fng", metrics);

    return new Response(
      JSON.stringify({ fng_value: fngValue, fng_classification: fngClassification, synced, total }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("collect-fng error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
