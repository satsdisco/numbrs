// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

export interface MetricInput {
  key: string;
  value: number;
  name: string;
  unit: string;
}

/**
 * Batch-upserts metrics and inserts datapoints for a provider.
 *
 * Query budget: ~4 queries total regardless of user/metric count.
 *   1. SELECT user_integrations WHERE provider = ? AND is_active = true  (skipped if userIds provided)
 *   2. INSERT INTO metrics ... ON CONFLICT (user_id, key) DO UPDATE  →  returns all IDs
 *   3. INSERT INTO datapoints (bulk)
 *   4. UPDATE user_integrations SET last_synced_at = now()
 *
 * @param supabase  Service-role Supabase client
 * @param provider  Integration provider name (e.g. "bitcoin")
 * @param metrics   Metrics to write — same set applied to every user
 * @param options.userIds  If supplied, skip the integrations query and target only these users.
 *                         Useful for per-user collectors (weather, fred, github) where the caller
 *                         already has the user ID and wants to write user-specific metrics.
 */
export async function batchUpsertDatapoints(
  supabase: SupabaseClient,
  provider: string,
  metrics: MetricInput[],
  options?: { userIds?: string[] }
): Promise<{ synced: number; total: number }> {
  if (metrics.length === 0) return { synced: 0, total: 0 };

  // --- 1. Resolve user IDs ------------------------------------------------
  let userIds: string[];

  if (options?.userIds && options.userIds.length > 0) {
    userIds = options.userIds;
  } else {
    const { data: integrations, error } = await supabase
      .from("user_integrations")
      .select("user_id")
      .eq("provider", provider)
      .eq("is_active", true);

    if (error) throw new Error(`Failed to fetch integrations: ${error.message}`);
    userIds = (integrations ?? []).map((r: { user_id: string }) => r.user_id);
  }

  if (userIds.length === 0) return { synced: 0, total: 0 };

  // --- 2. Bulk-upsert metrics (one row per user × metric) -----------------
  //
  // ON CONFLICT (user_id, key) DO UPDATE ensures we always get the row back
  // in RETURNING even when it already existed.  We update `name` and `unit`
  // so stale display labels get refreshed, and touch `updated_at` so the
  // RETURNING clause includes every row (not just newly-inserted ones).
  const metricsToUpsert = userIds.flatMap((userId) =>
    metrics.map((m) => ({
      key: m.key,
      name: m.name,
      user_id: userId,
      value_type: "float" as const,
      category: "custom",
      unit: m.unit,
    }))
  );

  const { data: metricRows, error: metricsError } = await supabase
    .from("metrics")
    .upsert(metricsToUpsert, { onConflict: "user_id,key", ignoreDuplicates: false })
    .select("id, user_id, key");

  if (metricsError) throw new Error(`Failed to upsert metrics: ${metricsError.message}`);

  // --- 3. Bulk-insert datapoints ------------------------------------------
  const valueByKey = new Map(metrics.map((m) => [m.key, m.value]));

  const datapoints = (metricRows ?? [])
    .filter((row: { id: string; user_id: string; key: string }) => valueByKey.has(row.key))
    .map((row: { id: string; user_id: string; key: string }) => ({
      metric_id: row.id,
      value: valueByKey.get(row.key)!,
    }));

  if (datapoints.length > 0) {
    const { error: dpError } = await supabase.from("datapoints").insert(datapoints);
    if (dpError) throw new Error(`Failed to insert datapoints: ${dpError.message}`);
  }

  // --- 4. Update last_synced_at for all affected integrations -------------
  const now = new Date().toISOString();
  await supabase.from("user_integrations")
    .update({ last_synced_at: now, last_error: null })
    .in("user_id", userIds)
    .eq("provider", provider);

  return { synced: datapoints.length, total: userIds.length };
}
