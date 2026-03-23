import { supabase } from "@/integrations/supabase/client";

export interface UptimeMonitor {
  id: string;
  user_id: string;
  name: string;
  url: string;
  interval_seconds: number;
  is_active: boolean;
  last_checked_at: string | null;
  last_status: "up" | "down" | "unknown" | null;
  last_latency_ms: number | null;
  created_at: string;
  updated_at: string;
}

export interface UptimeEvent {
  id: string;
  monitor_id: string;
  status: "up" | "down";
  latency_ms: number | null;
  status_code: number | null;
  error_message: string | null;
  checked_at: string;
}

export interface UptimeSummary {
  uptime_pct: number | null;
  avg_latency_ms: number | null;
  total_checks: number;
  failed_checks: number;
}

// ─── CRUD ──────────────────────────────────────────────────────────────────────

export async function fetchMonitors(): Promise<UptimeMonitor[]> {
  const { data, error } = await supabase
    .from("uptime_monitors")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as UptimeMonitor[]) || [];
}

export async function createMonitor(monitor: {
  name: string;
  url: string;
  interval_seconds: number;
  user_id: string;
}): Promise<UptimeMonitor> {
  const { data, error } = await supabase
    .from("uptime_monitors")
    .insert(monitor as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as UptimeMonitor;
}

export async function deleteMonitor(id: string) {
  const { error } = await supabase.from("uptime_monitors").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleMonitor(id: string, is_active: boolean) {
  const { error } = await supabase
    .from("uptime_monitors")
    .update({ is_active })
    .eq("id", id);
  if (error) throw error;
}

// ─── Events ────────────────────────────────────────────────────────────────────

export async function fetchUptimeEvents(
  monitorId: string,
  limit = 50
): Promise<UptimeEvent[]> {
  const { data, error } = await supabase
    .from("uptime_events")
    .select("*")
    .eq("monitor_id", monitorId)
    .order("checked_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as UptimeEvent[]) || [];
}

// ─── Summary ───────────────────────────────────────────────────────────────────

export async function fetchUptimeSummary(
  monitorId: string,
  hours = 24
): Promise<UptimeSummary | null> {
  const { data, error } = await supabase.rpc("get_uptime_summary", {
    p_monitor_id: monitorId,
    p_hours: hours,
  } as any);
  if (error) throw error;
  const rows = data as unknown as UptimeSummary[];
  return rows?.[0] ?? null;
}

// ─── Trigger check ─────────────────────────────────────────────────────────────

export async function triggerUptimeCheck(monitorId?: string) {
  const body = monitorId ? { monitor_id: monitorId } : {};
  const { data, error } = await supabase.functions.invoke("uptime-check", { body });
  if (error) throw error;
  return data;
}
