import { useQuery } from "@tanstack/react-query";
import {
  fetchRelayTimeseries,
  fetchRelaySummary,
  fetchMetricByKey,
  fetchGenericTimeseries,
  fetchMetricStats,
  fetchLatestDatapoint,
} from "@/lib/api";
import type { PanelRow } from "@/lib/dashboard-types";
import type { TimeRange } from "@/lib/types";
import LinePanelChart from "./LinePanelChart";
import AreaPanelChart from "./AreaPanelChart";
import BarPanelChart from "./BarPanelChart";
import StatPanel from "./StatPanel";
import GaugePanel from "./GaugePanel";
import TablePanel from "./TablePanel";
import HeatmapPanel from "./HeatmapPanel";

interface PanelRendererProps {
  panel: PanelRow;
  globalTimeRange: TimeRange;
  globalRelayId?: string | null;
}

export default function PanelRenderer({ panel, globalTimeRange, globalRelayId }: PanelRendererProps) {
  const { config } = panel;
  const range = (config.time_range as TimeRange) || globalTimeRange;
  const metricKey = config.metric_key || "relay_latency_connect_ms";
  const relayId = config.relay_id || globalRelayId || undefined;
  const isGlobal = config.data_source === "global" || config.data_source === "custom";
  const isChart = panel.panel_type === "line" || panel.panel_type === "area" || panel.panel_type === "bar" || panel.panel_type === "table" || panel.panel_type === "heatmap";
  const isStat = panel.panel_type === "stat" || panel.panel_type === "gauge";
  const isStatOnly = panel.panel_type === "stat";
  const wantsLatest = config.stat_field === "latest";

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
    enabled: !isGlobal && !!relayId && (isChart || isStatOnly),
  });

  // Global timeseries
  const { data: globalTsData, isLoading: globalTsLoading } = useQuery({
    queryKey: ["panel-global-ts", panel.id, metricDef?.id, range],
    queryFn: () => fetchGenericTimeseries(metricDef!.id, range),
    enabled: isGlobal && !!metricDef?.id && (isChart || isStatOnly),
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

  // Fetch the actual latest datapoint when stat_field is "latest"
  const { data: latestValue, isLoading: latestLoading } = useQuery({
    queryKey: ["panel-latest", panel.id, metricDef?.id],
    queryFn: () => fetchLatestDatapoint(metricDef!.id),
    enabled: isGlobal && !!metricDef?.id && isStat && wantsLatest,
  });

  // Determine if we need a relay but don't have one
  if (!isGlobal && !relayId) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Select a relay above or in panel settings
      </div>
    );
  }

  const loading = relayTsLoading || globalTsLoading || summaryLoading || globalStatsLoading || latestLoading;

  if (loading) {
    return (
      <div className="flex h-full animate-pulse items-end gap-1">
        {[40, 65, 55, 80, 45, 70, 60, 85, 50, 75].map((h, i) => (
          <div key={i} className="flex-1 rounded-sm bg-muted" style={{ height: `${h}%` }} />
        ))}
      </div>
    );
  }

  // Get timeseries data from either source
  const tsData = isGlobal ? globalTsData : relayTsData;

  // Build a summary-like object for global stats panels.
  // Preserve null for stat fields when there are no datapoints so that
  // StatPanel renders "—" (No data) instead of "0" for untracked metrics.
  const metricSummary = isGlobal
    ? globalStats
      ? {
          metric_key: metricKey,
          avg_val: globalStats.avg_val ?? null,
          min_val: globalStats.min_val ?? null,
          max_val: globalStats.max_val ?? null,
          p50_val: globalStats.p50_val ?? null,
          p95_val: globalStats.p95_val ?? null,
          latest_val: latestValue ?? globalStats.max_val ?? null,
          total_count: globalStats.total_count ?? 0,
        }
      : undefined
    : summaryData?.find((s: any) => s.metric_key === metricKey);

  switch (panel.panel_type) {
    case "line":
      return <LinePanelChart data={tsData || []} unit={config.unit} annotations={config.annotations} />;
    case "area":
      return <AreaPanelChart data={tsData || []} unit={config.unit} annotations={config.annotations} />;
    case "bar":
      return <BarPanelChart data={tsData || []} unit={config.unit} />;
    case "table":
      return <TablePanel data={tsData || []} unit={config.unit} />;
    case "heatmap":
      return <HeatmapPanel data={tsData || []} unit={config.unit} metricKey={metricKey} />;
    case "stat":
      return (
        <StatPanel
          summary={metricSummary}
          field={config.stat_field || "p50"}
          unit={config.unit}
          sparklineData={tsData}
        />
      );
    case "gauge":
      return (
        <GaugePanel
          summary={metricSummary}
          field={config.stat_field || "avg"}
          max={config.gauge_max || 1000}
          unit={config.unit}
          invertColors={config.gauge_invert_colors ?? true}
        />
      );
    default:
      return <div className="text-xs text-muted-foreground">Unknown panel type</div>;
  }
}
