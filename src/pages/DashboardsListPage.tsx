import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDashboards, createDashboard, deleteDashboard, createPanel } from "@/lib/dashboard-api";
import { useAuth } from "@/hooks/useAuth";
import { DASHBOARD_TEMPLATES, type DashboardTemplate } from "@/lib/dashboard-templates";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, LayoutGrid, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useState } from "react";

export default function DashboardsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showTemplates, setShowTemplates] = useState(false);

  const { data: dashboards, isLoading } = useQuery({
    queryKey: ["dashboards"],
    queryFn: fetchDashboards,
  });

  const createFromTemplate = async (template: DashboardTemplate | null) => {
    try {
      const db = await createDashboard({
        name: template?.name ?? "Untitled Dashboard",
        description: template?.description,
        user_id: user!.id,
      });

      if (template) {
        await Promise.all(
          template.panels.map((p) =>
            createPanel({ dashboard_id: db.id, ...p })
          )
        );
      }

      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      navigate(`/dashboards/${db.id}`);
      toast.success(template ? `Created "${template.name}" dashboard` : "Dashboard created");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: deleteDashboard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      toast.success("Dashboard deleted");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-semibold text-foreground">Dashboards</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build custom views with drag-and-drop panels
          </p>
        </div>
        <Button onClick={() => setShowTemplates(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Dashboard
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-lg bg-card animate-pulse border border-border" />
          ))}
        </div>
      ) : !dashboards || dashboards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 py-20">
          <LayoutGrid className="h-10 w-10 text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium text-foreground mb-2">No dashboards yet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md text-center">
            Start from a template or create a blank dashboard.
          </p>
          <Button onClick={() => setShowTemplates(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Create Dashboard
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dashboards.map((db, i) => (
            <motion.div
              key={db.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="group relative rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-card"
            >
              <Link to={`/dashboards/${db.id}`} className="block">
                <div className="flex items-start justify-between mb-3">
                  <LayoutGrid className="h-5 w-5 text-primary/70" />
                </div>
                <h3 className="font-mono text-sm font-semibold text-foreground truncate">{db.name}</h3>
                {db.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{db.description}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-3 font-mono">
                  Updated {format(new Date(db.updated_at), "MMM d, yyyy")}
                </p>
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  deleteMutation.mutate(db.id);
                }}
                className="absolute top-4 right-4 rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Template picker dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono">New Dashboard</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <button
              onClick={() => { setShowTemplates(false); createFromTemplate(null); }}
              className="w-full rounded-lg border border-dashed border-border bg-muted/20 p-4 text-left hover:border-primary/40 hover:bg-muted/40 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">📄</span>
                <div>
                  <div className="font-mono text-sm font-medium text-foreground">Blank Dashboard</div>
                  <div className="text-xs text-muted-foreground">Start from scratch</div>
                </div>
              </div>
            </button>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium px-1">Templates</div>
            {DASHBOARD_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => { setShowTemplates(false); createFromTemplate(t); }}
                className="w-full rounded-lg border border-border bg-card p-4 text-left hover:border-primary/40 hover:shadow-card transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{t.icon}</span>
                  <div>
                    <div className="font-mono text-sm font-medium text-foreground">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.description}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{t.panels.length} panels</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
