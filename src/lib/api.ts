import { supabase } from "@/integrations/supabase/client";
import { TimeRange, TIME_RANGE_CONFIG, TimeseriesBucket, MetricStats } from "@/lib/types";

export async function fetchMetrics() {
  const { data, error } = await supabase
    .from("metrics")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchMetricByKey(key: string) {
  const { data, error } = await supabase
    .from("metrics")
    .select("*")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createMetric(metric: {
  key: string;
  name: string;
  description?: string;
  unit?: string;
  value_type: string;
  tags?: Record<string, string>;
  is_public?: boolean;
  user_id: string;
}) {
  const { data, error } = await supabase.from("metrics").insert(metric).select().single();
  if (error) throw error;
  return data;
}

export async function updateMetric(id: string, updates: Partial<{ name: string; description: string; unit: string; tags: Record<string, string>; is_public: boolean }>) {
  const { data, error } = await supabase.from("metrics").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteMetric(id: string) {
  const { error } = await supabase.from("metrics").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchTimeseries(metricId: string, range: TimeRange): Promise<TimeseriesBucket[]> {
  const config = TIME_RANGE_CONFIG[range];
  const now = new Date();
  const start = new Date(now.getTime() - config.seconds * 1000);

  const { data, error } = await supabase.rpc("get_timeseries", {
    p_metric_id: metricId,
    p_start: start.toISOString(),
    p_end: now.toISOString(),
    p_interval_seconds: config.intervalSeconds,
  });
  if (error) throw error;
  return (data as TimeseriesBucket[]) || [];
}

export async function fetchMetricStats(metricId: string, range: TimeRange): Promise<MetricStats | null> {
  const config = TIME_RANGE_CONFIG[range];
  const now = new Date();
  const start = new Date(now.getTime() - config.seconds * 1000);

  const { data, error } = await supabase.rpc("get_metric_stats", {
    p_metric_id: metricId,
    p_start: start.toISOString(),
    p_end: now.toISOString(),
  });
  if (error) throw error;
  return (data as MetricStats[])?.[0] || null;
}

export async function fetchLatestDatapoint(metricId: string) {
  const { data, error } = await supabase
    .from("datapoints")
    .select("*")
    .eq("metric_id", metricId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchRecentDatapoints(metricId: string, limit = 50) {
  const { data, error } = await supabase
    .from("datapoints")
    .select("*")
    .eq("metric_id", metricId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// Relays
export async function fetchRelays() {
  const { data, error } = await supabase.from("relays").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createRelay(relay: { url: string; name: string; user_id: string }) {
  const { data, error } = await supabase.from("relays").insert(relay).select().single();
  if (error) throw error;
  return data;
}

export async function deleteRelay(id: string) {
  const { error } = await supabase.from("relays").delete().eq("id", id);
  if (error) throw error;
}

// API Keys
export async function fetchApiKeys() {
  const { data, error } = await supabase.from("api_keys").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createApiKey(userId: string, name = "Default") {
  const { data, error } = await supabase.from("api_keys").insert({ user_id: userId, name }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteApiKey(id: string) {
  const { error } = await supabase.from("api_keys").delete().eq("id", id);
  if (error) throw error;
}
