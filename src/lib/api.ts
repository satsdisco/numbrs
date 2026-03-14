import { supabase } from "@/integrations/supabase/client";
import {
  TimeRange,
  TIME_RANGE_CONFIG,
  TimeseriesBucket,
  RelaySummaryRow,
  RelayRow,
  ApiKeyRow,
} from "@/lib/types";

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
  updates: Partial<{ name: string; url: string; region: string }>
): Promise<RelayRow> {
  const { data, error } = await supabase
    .from("relays")
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as RelayRow;
}

export async function deleteRelay(id: string) {
  const { error } = await supabase.from("relays").delete().eq("id", id);
  if (error) throw error;
}

// ─── Relay Health Aggregation ──────────────────────────────────────────────────

function getTimeWindow(range: TimeRange) {
  const config = TIME_RANGE_CONFIG[range];
  const now = new Date();
  const start = new Date(now.getTime() - config.seconds * 1000);
  return { start, end: now, intervalSeconds: config.intervalSeconds };
}

export async function fetchRelaySummary(
  relayId: string,
  range: TimeRange
): Promise<RelaySummaryRow[]> {
  const { start, end } = getTimeWindow(range);
  const { data, error } = await supabase.rpc("get_relay_summary", {
    p_relay_id: relayId,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
  } as any);
  if (error) throw error;
  return (data as unknown as RelaySummaryRow[]) || [];
}

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

// ─── Metrics (definitions) ─────────────────────────────────────────────────────

export async function fetchMetrics() {
  const { data, error } = await supabase
    .from("metrics")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createMetric(metric: {
  key: string;
  name: string;
  description?: string;
  unit?: string;
  value_type: string;
  user_id: string;
}) {
  const { data, error } = await supabase
    .from("metrics")
    .insert(metric)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMetric(id: string) {
  const { error } = await supabase.from("metrics").delete().eq("id", id);
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
