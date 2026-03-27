import { supabase } from "@/integrations/supabase/client";

export interface AlertRule {
  id: string;
  user_id: string;
  relay_id: string | null;
  metric_key: string;
  condition: "gt" | "lt";
  threshold: number;
  is_active: boolean;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface AlertEvent {
  id: string;
  alert_rule_id: string;
  value: number;
  relay_id: string | null;
  metric_key: string;
  threshold: number;
  condition: string;
  acknowledged: boolean;
  triggered_at: string;
}

export async function fetchAlertRules(): Promise<AlertRule[]> {
  const { data, error } = await supabase
    .from("alert_rules")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as AlertRule[]) || [];
}

export async function createAlertRule(rule: {
  user_id: string;
  relay_id?: string | null;
  metric_key: string;
  condition: "gt" | "lt";
  threshold: number;
  name: string;
}): Promise<AlertRule> {
  const { data, error } = await supabase
    .from("alert_rules")
    .insert(rule as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as AlertRule;
}

export async function updateAlertRule(
  id: string,
  updates: Partial<Pick<AlertRule, "is_active" | "name" | "threshold" | "condition">>
): Promise<void> {
  const { error } = await supabase
    .from("alert_rules")
    .update(updates as any)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAlertRule(id: string): Promise<void> {
  const { error } = await supabase.from("alert_rules").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchAlertEvents(limit = 50): Promise<AlertEvent[]> {
  const { data, error } = await supabase
    .from("alert_events")
    .select("*")
    .order("triggered_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as AlertEvent[]) || [];
}

export async function acknowledgeAlertEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from("alert_events")
    .update({ acknowledged: true } as any)
    .eq("id", id);
  if (error) throw error;
}

// ─── Notification channels ────────────────────────────────────────────────────

export interface NotificationChannel {
  id: string;
  user_id: string;
  type: "slack";
  name: string;
  config: { webhook_url: string };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchNotificationChannels(): Promise<NotificationChannel[]> {
  const { data, error } = await supabase
    .from("notification_channels")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as NotificationChannel[]) || [];
}

export async function upsertSlackChannel(
  webhookUrl: string,
  name = "Slack"
): Promise<NotificationChannel> {
  // Replace existing slack channel for this user (only one Slack channel per user for now)
  const { data: existing } = await supabase
    .from("notification_channels")
    .select("id")
    .eq("type", "slack")
    .maybeSingle();

  if (existing?.id) {
    const { data, error } = await supabase
      .from("notification_channels")
      .update({ config: { webhook_url: webhookUrl }, name, is_active: true, updated_at: new Date().toISOString() } as any)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as NotificationChannel;
  }

  const { data, error } = await supabase
    .from("notification_channels")
    .insert({ type: "slack", name, config: { webhook_url: webhookUrl } } as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as NotificationChannel;
}

export async function deleteNotificationChannel(id: string): Promise<void> {
  const { error } = await supabase.from("notification_channels").delete().eq("id", id);
  if (error) throw error;
}

export async function testSlackWebhook(webhookUrl: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "✅ numbrs alert test — Slack webhook is working!" }),
  });
  if (!res.ok) throw new Error(`Slack returned ${res.status}`);
}

// ─── Alert metrics ────────────────────────────────────────────────────────────

export const ALERT_METRICS = [
  { key: "relay_latency_connect_ms", label: "Connect Latency", unit: "ms", relayScoped: true },
  { key: "relay_latency_first_event_ms", label: "Event Latency", unit: "ms", relayScoped: true },
  { key: "relay_up", label: "Uptime (0-1)", unit: "", relayScoped: true },
] as const;

export const CONDITION_LABELS: Record<string, string> = {
  gt: "exceeds",
  lt: "drops below",
};
