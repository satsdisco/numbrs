import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PanelRow } from "@/lib/dashboard-types";
import type { DashboardRow } from "@/lib/dashboard-types";
import type { TimeRange } from "@/lib/types";
import TimeRangeSelector from "@/components/TimeRangeSelector";
import PanelCard from "@/components/panels/PanelCard";
import { Activity, Globe } from "lucide-react";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function SharedDashboardPage() {
  const { token } = useParams<{ token: string }>();
  const [range, setRange] = useState<TimeRange>("24h");

  const { data: dashboard, isLoading: dbLoading } = useQuery({
    queryKey: ["shared-dashboard", token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboards")
        .select("*")
        .eq("share_token", token!)
        .eq("is_public", true)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as DashboardRow | null;
    },
    enabled: !!token,
  });

  const { data: panels, isLoading: panelsLoading } = useQuery({
    queryKey: ["shared-panels", dashboard?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("panels")
        .select("*")
        .eq("dashboard_id", dashboard!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as unknown as PanelRow[]) || [];
    },
    enabled: !!dashboard?.id,
  });

  const gridLayouts = useMemo(() => {
    if (!panels) return { lg: [] };
    return {
      lg: panels.map((p) => ({
        i: p.id,
        x: p.layout.x,
        y: p.layout.y,
        w: p.layout.w,
        h: p.layout.h,
      })),
    };
  }, [panels]);

  if (dbLoading || panelsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Globe className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h1 className="text-lg font-medium text-foreground mb-1">Dashboard not found</h1>
          <p className="text-sm text-muted-foreground">This link may have expired or been made private.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <h1 className="font-mono text-sm font-semibold text-foreground">{dashboard.name}</h1>
              {dashboard.description && (
                <p className="text-[11px] text-muted-foreground">{dashboard.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <TimeRangeSelector value={range} onChange={setRange} />
            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
              <Activity className="h-3 w-3" /> numbrs
            </span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-7xl px-4 py-4">
        {panels && panels.length > 0 ? (
          <ResponsiveGridLayout
            className="layout"
            layouts={gridLayouts}
            breakpoints={{ lg: 1200, md: 768, sm: 480 }}
            cols={{ lg: 12, md: 8, sm: 4 }}
            rowHeight={60}
            isDraggable={false}
            isResizable={false}
            compactType="vertical"
            margin={[12, 12]}
          >
            {panels.map((panel) => (
              <div key={panel.id}>
                <PanelCard
                  panel={panel}
                  globalTimeRange={range}
                  isEditing={false}
                  onDelete={() => {}}
                />
              </div>
            ))}
          </ResponsiveGridLayout>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            This dashboard has no panels yet.
          </div>
        )}
      </div>
    </div>
  );
}
