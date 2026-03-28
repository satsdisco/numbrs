import { supabase } from "@/integrations/supabase/client";
import {
  TimeRange,
  TIME_RANGE_CONFIG,
  TimeseriesBucket,
  RelayRow,
  ApiKeyRow,
  MetricRow,
  MetricStats,
} from "@/lib/types";
import { RelayHealthRow } from "@/lib/health";

// ─── Time window helper ────────────────────────────────────────────────────────

function getTimeWindow(range: TimeRange) {
  const config = TIME_RANGE_CONFIG[range];
  const now = new Date();
  const start = new Date(now.getTime() - config.seconds * 1000);
  return { start, end: now, intervalSeconds: config.intervalSeconds };
}

// ─── Relays ────────────────────────────────────────────────────────────────────

export async function fetchRelays(): Promise<RelayRow[]> {
  const { data, error } = await supabase
    .from("relays")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as RelayRow[]) || [];
}

export async function fetchRelayById(id: string): Promise<RelayRow | null> {
  const { data, error } = await supabase
    .from("relays")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as RelayRow | null;
}

export async function createRelay(relay: {
  name: string;
  url: string;
  region?: string;
  user_id: string;
}): Promise<RelayRow> {
  const { data, error } = await supabase
    .from("relays")
    .insert(relay as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as RelayRow;
}

export async function updateRelay(
  id: string,
  updates: Partial<Pick<RelayRow, "name" | "url" | "region">>
): Promise<void> {
  const { error } = await supabase.from("relays").update(updates as any).eq("id", id);
  if (error) throw error;
}

export async function deleteRelay(id: string) {
  const { error } = await supabase.from("relays").delete().eq("id", id);
  if (error) throw error;
}

// ─── Relay Health (enriched summary) ───────────────────────────────────────────

export async function fetchRelayHealth(
  relayId: string,
  range: TimeRange
): Promise<RelayHealthRow | null> {
  const { start, end } = getTimeWindow(range);
  const { data, error } = await supabase.rpc("get_relay_health", {
    p_relay_id: relayId,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
  } as any);
  if (error) throw error;
  const rows = data as unknown as RelayHealthRow[];
  return rows?.[0] ?? null;
}

// ─── Relay Timeseries (for detail page) ────────────────────────────────────────

export async function fetchRelayTimeseries(
  relayId: string,
  metricKey: string,
  range: TimeRange
): Promise<TimeseriesBucket[]> {
  const { start, end, intervalSeconds } = getTimeWindow(range);
  const { data, error } = await supabase.rpc("get_relay_timeseries", {
    p_relay_id: relayId,
    p_metric_key: metricKey,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
    p_interval_seconds: intervalSeconds,
  } as any);
  if (error) throw error;
  return (data as unknown as TimeseriesBucket[]) || [];
}

// ─── Relay Summary (kept for detail page) ──────────────────────────────────────

export async function fetchRelaySummary(relayId: string, range: TimeRange) {
  const { start, end } = getTimeWindow(range);
  const { data, error } = await supabase.rpc("get_relay_summary", {
    p_relay_id: relayId,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
  } as any);
  if (error) throw error;
  return (data as unknown as any[]) || [];
}

// ─── Metrics (global) ──────────────────────────────────────────────────────────

export async function fetchMetrics(): Promise<MetricRow[]> {
  const { data, error } = await supabase
    .from("metrics")
    .select("*")
    .order("category", { ascending: true });
  if (error) throw error;
  return (data as unknown as MetricRow[]) || [];
}

export async function fetchMetricByKey(key: string): Promise<MetricRow | null> {
  const { data, error } = await supabase
    .from("metrics")
    .select("*")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as MetricRow | null;
}

// ─── Generic Timeseries (for global/non-relay metrics) ─────────────────────────

export async function fetchGenericTimeseries(
  metricId: string,
  range: TimeRange
): Promise<TimeseriesBucket[]> {
  const { start, end, intervalSeconds } = getTimeWindow(range);
  const { data, error } = await supabase.rpc("get_timeseries", {
    p_metric_id: metricId,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
    p_interval_seconds: intervalSeconds,
  } as any);
  if (error) throw error;
  return (data as unknown as TimeseriesBucket[]) || [];
}

// ─── Generic Metric Stats (for stat/gauge panels on global metrics) ────────────

export async function fetchMetricStats(
  metricId: string,
  range: TimeRange
): Promise<MetricStats | null> {
  const { start, end } = getTimeWindow(range);
  const { data, error } = await supabase.rpc("get_metric_stats", {
    p_metric_id: metricId,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
  } as any);
  if (error) throw error;
  const rows = data as unknown as MetricStats[];
  return rows?.[0] ?? null;
}

// ─── API Keys ──────────────────────────────────────────────────────────────────

export async function fetchApiKeys(): Promise<ApiKeyRow[]> {
  const { data, error } = await supabase
    .from("api_keys")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as ApiKeyRow[]) || [];
}

export async function createApiKey(
  userId: string,
  name = "Default"
): Promise<ApiKeyRow> {
  const { data, error } = await supabase
    .from("api_keys")
    .insert({ user_id: userId, name })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ApiKeyRow;
}

export async function deleteApiKey(id: string) {
  const { error } = await supabase.from("api_keys").delete().eq("id", id);
  if (error) throw error;
}

// ─── Trigger probe manually ───────────────────────────────────────────────────

export async function triggerProbe() {
  const { data, error } = await supabase.functions.invoke("relay-probe", {
    body: {},
  });
  if (error) throw error;
  return data;
}

// ─── Relay Incidents ───────────────────────────────────────────────────────────

export interface RelayIncident {
  incident_start: string;
  incident_end: string;
  duration_secs: number;
  failed_checks: number;
}

export async function fetchRelayIncidents(
  relayId: string,
  range: TimeRange
): Promise<RelayIncident[]> {
  const { start, end } = getTimeWindow(range);
  const { data, error } = await supabase.rpc("get_relay_incidents", {
    p_relay_id: relayId,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
  } as any);
  if (error) throw error;
  return (data as unknown as RelayIncident[]) || [];
}

// ─── All Public Relays (for leaderboard) ───────────────────────────────────────

export async function fetchAllPublicRelays(): Promise<RelayRow[]> {
  const { data, error } = await supabase
    .from("relays")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as RelayRow[]) || [];
}

// ─── Latest Datapoint (most recent value for a metric) ─────────────────────────

export async function fetchLatestDatapoint(
  metricId: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from("datapoints")
    .select("value")
    .eq("metric_id", metricId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
}
