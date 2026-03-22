import { supabase } from "@/integrations/supabase/client";
import type { DashboardRow, PanelRow, PanelConfig, PanelLayout, PanelType } from "./dashboard-types";

// ─── Dashboards ────────────────────────────────────────────────────────────────

export async function fetchDashboards(): Promise<DashboardRow[]> {
  const { data, error } = await supabase
    .from("dashboards")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as DashboardRow[]) || [];
}

export async function fetchDashboardById(id: string): Promise<DashboardRow | null> {
  const { data, error } = await supabase
    .from("dashboards")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as DashboardRow | null;
}

export async function createDashboard(args: {
  name: string;
  description?: string;
  user_id: string;
}): Promise<DashboardRow> {
  const { data, error } = await supabase
    .from("dashboards")
    .insert(args as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as DashboardRow;
}

export async function updateDashboard(
  id: string,
  updates: { name?: string; description?: string; is_public?: boolean; share_token?: string | null }
): Promise<DashboardRow> {
  const { data, error } = await supabase
    .from("dashboards")
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as DashboardRow;
}

export async function toggleDashboardSharing(id: string, isPublic: boolean): Promise<DashboardRow> {
  const updates: any = { is_public: isPublic };
  if (isPublic) {
    // Generate a share token if making public
    updates.share_token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }
  return updateDashboard(id, updates);
}

export async function deleteDashboard(id: string) {
  const { error } = await supabase.from("dashboards").delete().eq("id", id);
  if (error) throw error;
}

// ─── Panels ────────────────────────────────────────────────────────────────────

export async function fetchPanels(dashboardId: string): Promise<PanelRow[]> {
  const { data, error } = await supabase
    .from("panels")
    .select("*")
    .eq("dashboard_id", dashboardId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as unknown as PanelRow[]) || [];
}

export async function createPanel(args: {
  dashboard_id: string;
  title: string;
  panel_type: PanelType;
  config: PanelConfig;
  layout: PanelLayout;
}): Promise<PanelRow> {
  const { data, error } = await supabase
    .from("panels")
    .insert(args as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as PanelRow;
}

export async function updatePanel(
  id: string,
  updates: Partial<Pick<PanelRow, "title" | "panel_type" | "config" | "layout">>
): Promise<PanelRow> {
  const { data, error } = await supabase
    .from("panels")
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as PanelRow;
}

export async function deletePanel(id: string) {
  const { error } = await supabase.from("panels").delete().eq("id", id);
  if (error) throw error;
}

export async function updatePanelLayouts(
  panels: { id: string; layout: PanelLayout }[]
): Promise<void> {
  // Batch update layouts
  await Promise.all(
    panels.map(({ id, layout }) =>
      supabase.from("panels").update({ layout } as any).eq("id", id)
    )
  );
}
