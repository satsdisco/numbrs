import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let monitorIds: string[] | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    if (body?.monitor_id) {
      monitorIds = [body.monitor_id];
    }
  } catch {
    // no body — run all active monitors
  }

  // Fetch monitors to check
  let monitorsQuery = supabase
    .from("uptime_monitors")
    .select("*")
    .eq("is_active", true);

  if (monitorIds) {
    monitorsQuery = monitorsQuery.in("id", monitorIds);
  }

  const { data: monitors, error: fetchError } = await monitorsQuery;
  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results = [];

  for (const monitor of monitors ?? []) {
    const start = Date.now();
    let status: "up" | "down" = "down";
    let latency_ms: number | null = null;
    let status_code: number | null = null;
    let error_message: string | null = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const resp = await fetch(monitor.url, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeout);
      latency_ms = Date.now() - start;
      status_code = resp.status;
      status = resp.status < 500 ? "up" : "down";
    } catch (err: any) {
      latency_ms = Date.now() - start;
      error_message = err?.message ?? "Request failed";
      status = "down";
    }

    // Insert uptime event
    await supabase.from("uptime_events").insert({
      monitor_id: monitor.id,
      status,
      latency_ms,
      status_code,
      error_message,
    });

    // Update monitor last check state
    await supabase
      .from("uptime_monitors")
      .update({
        last_checked_at: new Date().toISOString(),
        last_status: status,
        last_latency_ms: latency_ms,
      })
      .eq("id", monitor.id);

    results.push({ monitor_id: monitor.id, name: monitor.name, status, latency_ms, status_code });
  }

  return new Response(JSON.stringify({ checked: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
