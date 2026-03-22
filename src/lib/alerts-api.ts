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

export const ALERT_METRICS = [
  { key: "relay_latency_connect_ms", label: "Connect Latency", unit: "ms", relayScoped: true },
  { key: "relay_latency_first_event_ms", label: "Event Latency", unit: "ms", relayScoped: true },
  { key: "relay_up", label: "Uptime (0-1)", unit: "", relayScoped: true },
] as const;

export const CONDITION_LABELS: Record<string, string> = {
  gt: "exceeds",
  lt: "drops below",
};
