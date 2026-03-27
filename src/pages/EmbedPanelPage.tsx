import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchPanelById } from "@/lib/dashboard-api";
import PanelRenderer from "@/components/panels/PanelRenderer";

export default function EmbedPanelPage() {
  const { panelId } = useParams<{ panelId: string }>();

  const { data: panel, isLoading } = useQuery({
    queryKey: ["embed-panel", panelId],
    queryFn: () => fetchPanelById(panelId!),
    enabled: !!panelId,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!panel) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground text-sm font-mono">
        Panel not found
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background p-2">
      <div className="h-screen">
        <PanelRenderer panel={panel} globalTimeRange="24h" />
      </div>

      {/* Watermark */}
      <a
        href={window.location.origin}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-2 right-3 font-mono text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors z-10"
      >
        numbrs
      </a>
    </div>
  );
}
