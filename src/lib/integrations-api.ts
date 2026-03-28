import { supabase } from "@/integrations/supabase/client";

export interface UserIntegration {
  id: string;
  user_id: string;
  provider: string;
  config: Record<string, any>;
  is_active: boolean;
  last_synced_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Fetch ──────────────────────────────────────────────────────────────────

export async function fetchIntegrations(): Promise<UserIntegration[]> {
  const { data, error } = await supabase
    .from("user_integrations")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as unknown as UserIntegration[]) || [];
}

// ─── Upsert ─────────────────────────────────────────────────────────────────

export async function upsertIntegration(
  provider: string,
  config: Record<string, any>
): Promise<UserIntegration> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("user_integrations")
    .upsert(
      { user_id: user.id, provider, config, is_active: true },
      { onConflict: "user_id,provider" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as unknown as UserIntegration;
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteIntegration(provider: string): Promise<void> {
  const { error } = await supabase
    .from("user_integrations")
    .delete()
    .eq("provider", provider);
  if (error) throw error;
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

export async function toggleIntegration(
  provider: string,
  isActive: boolean
): Promise<UserIntegration> {
  const { data, error } = await supabase
    .from("user_integrations")
    .update({ is_active: isActive })
    .eq("provider", provider)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as UserIntegration;
}

// ─── Latest metric values ────────────────────────────────────────────────────

export async function fetchLatestMetricValues(
  keys: string[]
): Promise<Record<string, { value: number; timestamp: string } | null>> {
  if (keys.length === 0) return {};

  const { data: metrics } = await supabase
    .from("metrics")
    .select("id, key")
    .in("key", keys);

  const result: Record<string, { value: number; timestamp: string } | null> =
    Object.fromEntries(keys.map((k) => [k, null]));

  if (!metrics?.length) return result;

  await Promise.all(
    metrics.map(async ({ id, key }: { id: string; key: string }) => {
      const { data: dp } = await supabase
        .from("datapoints")
        .select("value, created_at")
        .eq("metric_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (dp) result[key] = { value: dp.value, timestamp: dp.created_at };
    })
  );

  return result;
}

// Fetch the first matching metric + its latest datapoint using a LIKE pattern
// e.g. pattern = 'github.%.stars'
export async function fetchFirstMetricLike(
  pattern: string
): Promise<{ key: string; value: number; timestamp: string } | null> {
  const { data: metrics } = await supabase
    .from("metrics")
    .select("id, key")
    .ilike("key", pattern)
    .limit(10);

  if (!metrics?.length) return null;

  for (const { id, key } of metrics as { id: string; key: string }[]) {
    const { data: dp } = await supabase
      .from("datapoints")
      .select("value, created_at")
      .eq("metric_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (dp) return { key, value: dp.value, timestamp: dp.created_at };
  }
  return null;
}
