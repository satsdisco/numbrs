import { useState, useCallback, useMemo, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchDashboardById,
  fetchPanels,
  createPanel,
  deletePanel,
  updatePanel,
  updateDashboard,
  updatePanelLayouts,
  toggleDashboardSharing,
} from "@/lib/dashboard-api";
import { fetchRelays } from "@/lib/api";
import type { PanelRow, PanelLayout } from "@/lib/dashboard-types";
import type { TimeRange } from "@/lib/types";
import TimeRangeSelector from "@/components/TimeRangeSelector";
import PanelCard from "@/components/panels/PanelCard";
import AddPanelDialog from "@/components/panels/AddPanelDialog";
import ShareDialog from "@/components/ShareDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Pencil, Lock, Check, Share2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function DashboardBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [range, setRange] = useState<TimeRange>("24h");
  const [globalRelayId, setGlobalRelayId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  const { data: relays } = useQuery({
    queryKey: ["relays"],
    queryFn: fetchRelays,
  });

  useEffect(() => {
    if (relays?.length === 1) {
      setGlobalRelayId(relays[0].id);
    }
  }, [relays]);

  const { data: dashboard, isLoading: dbLoading } = useQuery({
    queryKey: ["dashboard", id],
    queryFn: () => fetchDashboardById(id!),
    enabled: !!id,
  });

  const { data: panels, isLoading: panelsLoading } = useQuery({
    queryKey: ["panels", id],
    queryFn: () => fetchPanels(id!),
    enabled: !!id,
  });

  const addPanelMutation = useMutation({
    mutationFn: (args: Parameters<typeof createPanel>[0]) => createPanel(args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["panels", id] });
      toast.success("Panel added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deletePanelMutation = useMutation({
    mutationFn: deletePanel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["panels", id] });
      toast.success("Panel removed");
    },
  });

  const renameMutation = useMutation({
    mutationFn: (name: string) => updateDashboard(id!, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", id] });
      setEditingName(false);
    },
  });

  const shareMutation = useMutation({
    mutationFn: (isPublic: boolean) => toggleDashboardSharing(id!, isPublic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", id] });
    },
  });

  const handleLayoutChange = useCallback(
    (layout: any[]) => {
      if (!panels || !isEditing) return;
      const updates = layout
        .map((l) => {
          const panel = panels.find((p) => p.id === l.i);
          if (!panel) return null;
          return {
            id: panel.id,
            layout: { x: l.x, y: l.y, w: l.w, h: l.h } as PanelLayout,
          };
        })
        .filter(Boolean) as { id: string; layout: PanelLayout }[];

      updatePanelLayouts(updates).catch(() => {});
    },
    [panels, isEditing]
  );

  const gridLayouts = useMemo(() => {
    if (!panels) return { lg: [] };
    return {
      lg: panels.map((p) => ({
        i: p.id,
        x: p.layout.x,
        y: p.layout.y,
        w: p.layout.w,
        h: p.layout.h,
        minW: 2,
        minH: 2,
      })),
    };
  }, [panels]);

  if (dbLoading || panelsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Dashboard not found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/dashboards"
            className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                className="h-8 w-60 font-mono text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") renameMutation.mutate(nameValue);
                  if (e.key === "Escape") setEditingName(false);
                }}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => renameMutation.mutate(nameValue)}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-xl font-semibold text-foreground truncate">
                {dashboard.name}
              </h1>
              <button
                onClick={() => {
                  setNameValue(dashboard.name);
                  setEditingName(true);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {relays && relays.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-mono">Relay:</span>
              <Select
                value={globalRelayId ?? ""}
                onValueChange={(v) => setGlobalRelayId(v)}
              >
                <SelectTrigger className="h-8 w-44 text-xs font-mono">
                  <SelectValue placeholder="Pick a relay" />
                </SelectTrigger>
                <SelectContent>
                  {relays.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs font-mono">
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <TimeRangeSelector value={range} onChange={setRange} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareOpen(true)}
            className="gap-1.5"
          >
            <Share2 className="h-3.5 w-3.5" /> Share
          </Button>
          <Button
            variant={isEditing ? "default" : "outline"}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="gap-1.5"
          >
            {isEditing ? (
              <>
                <Lock className="h-3.5 w-3.5" /> Done
              </>
            ) : (
              <>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </>
            )}
          </Button>
          {isEditing && (
            <Button
              size="sm"
              onClick={() => setAddPanelOpen(true)}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Add Panel
            </Button>
          )}
        </div>
      </div>

      {/* Grid */}
      {panels && panels.length > 0 ? (
        <ResponsiveGridLayout
          className="layout"
          layouts={gridLayouts}
          breakpoints={{ lg: 1200, md: 768, sm: 480 }}
          cols={{ lg: 12, md: 8, sm: 4 }}
          rowHeight={60}
          isDraggable={isEditing}
          isResizable={isEditing}
          draggableHandle=".drag-handle"
          onLayoutChange={handleLayoutChange}
          compactType="vertical"
          margin={[12, 12]}
        >
          {panels.map((panel) => (
            <div key={panel.id} className="h-full overflow-hidden">
              <PanelCard
                panel={panel}
                globalTimeRange={range}
                globalRelayId={globalRelayId}
                isEditing={isEditing}
                onDelete={() => deletePanelMutation.mutate(panel.id)}
              />
            </div>
          ))}
        </ResponsiveGridLayout>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 py-16 px-6">
          <div className="max-w-md text-center space-y-4">
            <div>
              <p className="text-foreground text-sm font-medium mb-1">Your dashboard is empty.</p>
              <p className="text-muted-foreground text-sm">Add your first panel to start visualizing data.</p>
            </div>
            <Button
              onClick={() => {
                setIsEditing(true);
                setAddPanelOpen(true);
              }}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add your first panel
            </Button>
            <div className="pt-2 border-t border-border/50 text-left space-y-2">
              <p className="text-xs font-medium text-muted-foreground">How data gets here:</p>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  Push metrics via the HTTP API (curl, scripts, GitHub Actions)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  Connect an integration: Claude AI usage, Jellyfin, Plex
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  Add relay or uptime monitors — they push data automatically
                </li>
              </ul>
              <div className="flex items-center gap-4 pt-1">
                <a
                  href="https://docs.numbrs.lol/getting-started/quick-start/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> Quick Start guide
                </a>
                <a
                  href="https://docs.numbrs.lol/integrations/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> Browse Integrations
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add panel dialog */}
      <AddPanelDialog
        open={addPanelOpen}
        onClose={() => setAddPanelOpen(false)}
        onAdd={(panel) => {
          addPanelMutation.mutate({
            dashboard_id: id!,
            ...panel,
          });
        }}
      />

      {/* Share dialog */}
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        dashboardId={id!}
        dashboardName={dashboard.name}
        isPublic={dashboard.is_public ?? false}
        shareToken={(dashboard as any).share_token ?? null}
        onTogglePublic={(pub) => shareMutation.mutate(pub)}
      />
    </div>
  );
}
