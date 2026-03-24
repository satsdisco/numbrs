import { useQuery } from "@tanstack/react-query";
import {
  fetchRelayTimeseries,
  fetchRelaySummary,
  fetchMetricByKey,
  fetchGenericTimeseries,
  fetchMetricStats,
} from "@/lib/api";
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
  const isGlobal = config.data_source === "global" || config.data_source === "custom";
  const isChart = panel.panel_type === "line" || panel.panel_type === "area";
  const isStat = panel.panel_type === "stat" || panel.panel_type === "gauge";

  // For global metrics, resolve metric_id from key
  const { data: metricDef } = useQuery({
    queryKey: ["metric-def", metricKey],
    queryFn: () => fetchMetricByKey(metricKey),
    enabled: isGlobal,
  });

  // Relay-scoped timeseries
  const { data: relayTsData, isLoading: relayTsLoading } = useQuery({
    queryKey: ["panel-ts", panel.id, relayId, metricKey, range],
    queryFn: () => fetchRelayTimeseries(relayId!, metricKey, range),
    enabled: !isGlobal && !!relayId && isChart,
  });

  // Global timeseries
  const { data: globalTsData, isLoading: globalTsLoading } = useQuery({
    queryKey: ["panel-global-ts", panel.id, metricDef?.id, range],
    queryFn: () => fetchGenericTimeseries(metricDef!.id, range),
    enabled: isGlobal && !!metricDef?.id && isChart,
  });

  // Relay-scoped summary
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["panel-summary", panel.id, relayId, range],
    queryFn: () => fetchRelaySummary(relayId!, range),
    enabled: !isGlobal && !!relayId && isStat,
  });

  // Global metric stats
  const { data: globalStats, isLoading: globalStatsLoading } = useQuery({
    queryKey: ["panel-global-stats", panel.id, metricDef?.id, range],
    queryFn: () => fetchMetricStats(metricDef!.id, range),
    enabled: isGlobal && !!metricDef?.id && isStat,
  });

  // Determine if we need a relay but don't have one
  if (!isGlobal && !relayId) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Select a relay in panel settings
      </div>
    );
  }

  const loading = relayTsLoading || globalTsLoading || summaryLoading || globalStatsLoading;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Get timeseries data from either source
  const tsData = isGlobal ? globalTsData : relayTsData;

  // Build a summary-like object for global stats panels
  const metricSummary = isGlobal
    ? globalStats
      ? {
          metric_key: metricKey,
          avg_val: globalStats.avg_val ?? 0,
          min_val: globalStats.min_val ?? 0,
          max_val: globalStats.max_val ?? 0,
          p50_val: globalStats.p50_val ?? 0,
          p95_val: globalStats.p95_val ?? 0,
          latest_val: globalStats.avg_val ?? 0, // fallback
          total_count: globalStats.total_count ?? 0,
        }
      : undefined
    : summaryData?.find((s: any) => s.metric_key === metricKey);

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
