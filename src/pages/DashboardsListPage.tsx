import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDashboards, createDashboard, deleteDashboard } from "@/lib/dashboard-api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function DashboardsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: dashboards, isLoading } = useQuery({
    queryKey: ["dashboards"],
    queryFn: fetchDashboards,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createDashboard({
        name: "Untitled Dashboard",
        user_id: user!.id,
      }),
    onSuccess: (db) => {
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      navigate(`/dashboards/${db.id}`);
      toast.success("Dashboard created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

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
          <h1 className="font-mono text-xl font-semibold text-foreground">
            Dashboards
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build custom views with drag-and-drop panels
          </p>
        </div>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" /> New Dashboard
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : !dashboards || dashboards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 py-20">
          <LayoutGrid className="h-10 w-10 text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium text-foreground mb-2">
            No dashboards yet
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md text-center">
            Create your first custom dashboard with charts, stats, and gauges for your relay data.
          </p>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> Create Dashboard
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dashboards.map((db) => (
            <div
              key={db.id}
              className="group relative rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-card"
            >
              <Link to={`/dashboards/${db.id}`} className="block">
                <div className="flex items-start justify-between mb-3">
                  <LayoutGrid className="h-5 w-5 text-primary/70" />
                </div>
                <h3 className="font-mono text-sm font-semibold text-foreground truncate">
                  {db.name}
                </h3>
                {db.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {db.description}
                  </p>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
