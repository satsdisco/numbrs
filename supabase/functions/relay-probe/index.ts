import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProbeResult {
  connectMs: number;
  firstEventMs: number;
  up: boolean;
}

/**
 * Probe a single Nostr relay via WebSocket.
 * Measures: connect latency, time-to-first-event, up/down.
 *
 * TODO: In a future iteration, this can be replaced or supplemented
 * with Nostr-event-based ingestion (NIP-66 relay monitoring events)
 * where external probes publish results as Nostr events that this
 * service subscribes to, rather than doing HTTP-based probing.
 */
async function probeRelay(url: string): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const start = performance.now();
    const CONNECT_TIMEOUT = 10000;
    const EVENT_TIMEOUT = 8000;

    try {
      const ws = new WebSocket(url);

      const connectTimeout = setTimeout(() => {
        try { ws.close(); } catch { /* ignore */ }
        resolve({ connectMs: 0, firstEventMs: 0, up: false });
      }, CONNECT_TIMEOUT);

      ws.onopen = () => {
        const connectMs = Math.round(performance.now() - start);
        clearTimeout(connectTimeout);

        const subId = "probe_" + Date.now();
        const reqStart = performance.now();
        ws.send(JSON.stringify(["REQ", subId, { kinds: [1], limit: 1 }]));

        const eventTimeout = setTimeout(() => {
          const firstEventMs = Math.round(performance.now() - reqStart);
          try {
            ws.send(JSON.stringify(["CLOSE", subId]));
            ws.close();
          } catch { /* ignore */ }
          resolve({ connectMs, firstEventMs, up: true });
        }, EVENT_TIMEOUT);

        ws.onmessage = (e) => {
          const firstEventMs = Math.round(performance.now() - reqStart);
          clearTimeout(eventTimeout);
          try {
            ws.send(JSON.stringify(["CLOSE", subId]));
            ws.close();
          } catch { /* ignore */ }
          resolve({ connectMs, firstEventMs, up: true });
        };
      };

      ws.onerror = () => {
        clearTimeout(connectTimeout);
        resolve({ connectMs: 0, firstEventMs: 0, up: false });
      };
    } catch {
      resolve({ connectMs: 0, firstEventMs: 0, up: false });
    }
  });
}

/**
 * Check alert rules against probe results and create alert events.
 */
async function checkAlertRules(
  supabase: any,
  relayId: string,
  result: ProbeResult
) {
  try {
    // Fetch active alert rules that match this relay (or are for all relays)
    const { data: rules, error } = await supabase
      .from("alert_rules")
      .select("*")
      .eq("is_active", true)
      .in("metric_key", [
        "relay_latency_connect_ms",
        "relay_latency_first_event_ms",
        "relay_up",
      ]);

    if (error || !rules) return;

    const metricValues: Record<string, number> = {
      relay_latency_connect_ms: result.connectMs,
      relay_latency_first_event_ms: result.firstEventMs,
      relay_up: result.up ? 1 : 0,
    };

    const alertEvents: any[] = [];

    for (const rule of rules) {
      // Skip if rule is for a different relay
      if (rule.relay_id && rule.relay_id !== relayId) continue;

      const value = metricValues[rule.metric_key];
      if (value === undefined) continue;

      let triggered = false;
      if (rule.condition === "gt" && value > rule.threshold) triggered = true;
      if (rule.condition === "lt" && value < rule.threshold) triggered = true;

      if (triggered) {
        alertEvents.push({
          alert_rule_id: rule.id,
          value,
          relay_id: relayId,
          metric_key: rule.metric_key,
          threshold: rule.threshold,
          condition: rule.condition,
        });
      }
    }

    if (alertEvents.length > 0) {
      const { error: insertErr } = await supabase
        .from("alert_events")
        .insert(alertEvents);
      if (insertErr) {
        console.error("Alert event insert error:", insertErr);
      } else {
        console.log(`Triggered ${alertEvents.length} alert(s) for relay ${relayId}`);
      }
    }
  } catch (err) {
    console.error("Alert check error:", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Fetch all relays
    const { data: relays, error: relayError } = await supabase
      .from("relays")
      .select("id, url, name");

    if (relayError) throw relayError;
    if (!relays || relays.length === 0) {
      return new Response(
        JSON.stringify({ message: "No relays to probe", probed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch system metric IDs
    const { data: metrics, error: metricError } = await supabase
      .from("metrics")
      .select("id, key")
      .in("key", [
        "relay_latency_connect_ms",
        "relay_latency_first_event_ms",
        "relay_up",
      ]);

    if (metricError) throw metricError;

    const metricMap: Record<string, string> = {};
    for (const m of metrics || []) {
      metricMap[m.key] = m.id;
    }

    if (!metricMap["relay_latency_connect_ms"] || !metricMap["relay_up"]) {
      return new Response(
        JSON.stringify({ error: "System metric definitions not found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Probe all relays concurrently
    const results = await Promise.allSettled(
      relays.map(async (relay) => {
        const result = await probeRelay(relay.url);
        const now = new Date().toISOString();

        const datapoints = [
          {
            metric_id: metricMap["relay_latency_connect_ms"],
            relay_id: relay.id,
            value: result.connectMs,
            created_at: now,
          },
          {
            metric_id: metricMap["relay_up"],
            relay_id: relay.id,
            value: result.up ? 1 : 0,
            created_at: now,
          },
        ];

        if (metricMap["relay_latency_first_event_ms"] && result.up) {
          datapoints.push({
            metric_id: metricMap["relay_latency_first_event_ms"],
            relay_id: relay.id,
            value: result.firstEventMs,
            created_at: now,
          });
        }

        const { error: insertError } = await supabase
          .from("datapoints")
          .insert(datapoints);

        if (insertError) {
          console.error(`Insert error for ${relay.name}:`, insertError);
        }

        // Check alert rules for this relay's probe results
        await checkAlertRules(supabase, relay.id, result);

        return {
          relay: relay.name,
          url: relay.url,
          ...result,
        };
      })
    );

    const probed = results.filter((r) => r.status === "fulfilled").length;
    const details = results.map((r) =>
      r.status === "fulfilled" ? r.value : { error: String(r.reason) }
    );

    return new Response(
      JSON.stringify({ probed, total: relays.length, results: details }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Probe error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
