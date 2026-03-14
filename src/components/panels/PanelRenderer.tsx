import { useQuery } from "@tanstack/react-query";
import { fetchRelayTimeseries, fetchRelaySummary } from "@/lib/api";
import type { PanelRow } from "@/lib/dashboard-types";
import type { TimeRange } from "@/lib/types";
import LinePanelChart from "./LinePanelChart";
import AreaPanelChart from "./AreaPanelChart";
import StatPanel from "./StatPanel";
import GaugePanel from "./GaugePanel";

interface PanelRendererProps {
  panel: PanelRow;
  globalTimeRange: TimeRange;
}

export default function PanelRenderer({ panel, globalTimeRange }: PanelRendererProps) {
  const { config } = panel;
  const range = (config.time_range as TimeRange) || globalTimeRange;
  const metricKey = config.metric_key || "relay_latency_connect_ms";
  const relayId = config.relay_id;

  // Timeseries data for line/area charts
  const { data: tsData, isLoading: tsLoading } = useQuery({
    queryKey: ["panel-ts", panel.id, relayId, metricKey, range],
    queryFn: () => fetchRelayTimeseries(relayId!, metricKey, range),
    enabled: !!relayId && (panel.panel_type === "line" || panel.panel_type === "area"),
  });

  // Summary data for stat/gauge panels
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["panel-summary", panel.id, relayId, range],
    queryFn: () => fetchRelaySummary(relayId!, range),
    enabled: !!relayId && (panel.panel_type === "stat" || panel.panel_type === "gauge"),
  });

  if (!relayId) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Select a relay in panel settings
      </div>
    );
  }

  const loading = tsLoading || summaryLoading;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const metricSummary = summaryData?.find((s: any) => s.metric_key === metricKey);

  switch (panel.panel_type) {
    case "line":
      return <LinePanelChart data={tsData || []} unit={config.unit} />;
    case "area":
      return <AreaPanelChart data={tsData || []} unit={config.unit} />;
    case "stat":
      return (
        <StatPanel
          summary={metricSummary}
          field={config.stat_field || "p50"}
          unit={config.unit}
        />
      );
    case "gauge":
      return (
        <GaugePanel
          summary={metricSummary}
          field={config.stat_field || "avg"}
          max={config.gauge_max || 1000}
          unit={config.unit}
        />
      );
    default:
      return <div className="text-xs text-muted-foreground">Unknown panel type</div>;
  }
}
