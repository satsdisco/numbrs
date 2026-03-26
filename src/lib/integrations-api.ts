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
