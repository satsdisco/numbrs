import { supabase } from "@/integrations/supabase/client";

// Uptime Kuma status codes: 1=UP  0=DOWN  2=PENDING  3=MAINTENANCE

export interface UptimeMonitor {
  name: string;               // primary key — used as component key
  monitor_type: string | null;
  url: string | null;
  hostname: string | null;
  port: string | null;
  status: number;             // 1=UP 0=DOWN 2=PENDING 3=MAINTENANCE
  response_time_ms: number | null;
  cert_days_remaining: number | null;
  cert_is_valid: boolean | null;
  last_updated: string;
}

export interface UptimeEvent {
  id: string;
  monitor_name: string;
  status: number;             // 1=UP 0=DOWN 2=PENDING 3=MAINTENANCE
  response_time_ms: number | null;
  checked_at: string;
}

export interface UptimeSummary {
  uptime_pct: number | null;
  avg_latency_ms: number | null;
  total_checks: number;
  failed_checks: number;
}

// ─── Monitors ──────────────────────────────────────────────────────────────────

export async function fetchMonitors(): Promise<UptimeMonitor[]> {
  const { data, error } = await supabase
    .from("kuma_monitors")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as UptimeMonitor[];
}

// ─── Heartbeats (event history) ────────────────────────────────────────────────

export async function fetchUptimeEvents(
  monitorName: string,
  limit = 50
): Promise<UptimeEvent[]> {
  const { data, error } = await supabase
    .from("kuma_heartbeats")
    .select("*")
    .eq("monitor_name", monitorName)
    .order("checked_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as UptimeEvent[];
}

// ─── Summary (computed client-side from heartbeat window) ─────────────────────

export async function fetchUptimeSummary(
  monitorName: string,
  hours = 24
): Promise<UptimeSummary | null> {
  const since = new Date(Date.now() - hours * 3_600_000).toISOString();
  const { data, error } = await supabase
    .from("kuma_heartbeats")
    .select("status, response_time_ms")
    .eq("monitor_name", monitorName)
    .gte("checked_at", since);
  if (error) throw error;
  if (!data || data.length === 0) return null;

  const rows = data as { status: number; response_time_ms: number | null }[];
  const total = rows.length;
  const ups = rows.filter((r) => r.status === 1).length;
  const latencies = rows
    .map((r) => r.response_time_ms)
    .filter((v): v is number => v != null && v >= 0);
  const avgLatency =
    latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : null;

  return {
    uptime_pct: (ups / total) * 100,
    avg_latency_ms: avgLatency,
    total_checks: total,
    failed_checks: total - ups,
  };
}
