import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  fetchRelayById,
  fetchRelayHealth,
  fetchRelayTimeseries,
  fetchRelaySummary,
} from "@/lib/api";
import { TimeRange, RELAY_METRIC_KEYS, MetricStats } from "@/lib/types";
import {
  computeHealthScore,
  scoreColor,
  getVolatility,
  getTrend,
  formatMs,
  formatPct,
  formatDuration,
  VOLATILITY_COLORS,
  TREND_ICONS,
  TREND_COLORS,
} from "@/lib/health";
import TimeRangeSelector from "@/components/TimeRangeSelector";
import TimeseriesChart from "@/components/TimeseriesChart";
import StatsGrid from "@/components/StatsGrid";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const SCORE_BG = {
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  destructive: "bg-destructive/15 text-destructive border-destructive/30",
} as const;

export default function RelayDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [range, setRange] = useState<TimeRange>("24h");

  const { data: relay, isLoading: relayLoading } = useQuery({
    queryKey: ["relay", id],
    queryFn: () => fetchRelayById(id!),
    enabled: !!id,
  });

  const { data: health } = useQuery({
    queryKey: ["relay-health", id, range],
    queryFn: () => fetchRelayHealth(id!, range),
    enabled: !!id,
  });

  const { data: summary } = useQuery({
    queryKey: ["relay-summary", id, range],
    queryFn: () => fetchRelaySummary(id!, range),
    enabled: !!id,
  });

  const { data: connectTs } = useQuery({
    queryKey: ["relay-ts", id, RELAY_METRIC_KEYS.CONNECT_LATENCY, range],
    queryFn: () =>
      fetchRelayTimeseries(id!, RELAY_METRIC_KEYS.CONNECT_LATENCY, range),
    enabled: !!id,
  });

  const { data: eventTs } = useQuery({
    queryKey: ["relay-ts", id, RELAY_METRIC_KEYS.FIRST_EVENT_LATENCY, range],
    queryFn: () =>
      fetchRelayTimeseries(id!, RELAY_METRIC_KEYS.FIRST_EVENT_LATENCY, range),
    enabled: !!id,
  });

  const { data: uptimeTs } = useQuery({
    queryKey: ["relay-ts", id, RELAY_METRIC_KEYS.UP, range],
    queryFn: () => fetchRelayTimeseries(id!, RELAY_METRIC_KEYS.UP, range),
    enabled: !!id,
  });

  if (relayLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!relay) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Relay not found
      </div>
    );
  }

  const connectMetric = summary?.find(
    (s: any) => s.metric_key === RELAY_METRIC_KEYS.CONNECT_LATENCY
  );
  const eventMetric = summary?.find(
    (s: any) => s.metric_key === RELAY_METRIC_KEYS.FIRST_EVENT_LATENCY
  );
  const upMetric = summary?.find(
    (s: any) => s.metric_key === RELAY_METRIC_KEYS.UP
  );

  function toStats(m: any): MetricStats | null {
    if (!m) return null;
    return {
      min_val: m.min_val,
      max_val: m.max_val,
      avg_val: m.avg_val,
      p50_val: m.p50_val,
      p95_val: m.p95_val,
      total_count: Number(m.total_count),
    };
  }

  const h = health;
  const score = h ? computeHealthScore(h) : null;
  const color = score !== null ? scoreColor(score) : null;
  const isUp = h && h.total_checks > 0 ? h.uptime_pct !== null && h.uptime_pct >= 50 : null;
  const volatility = h ? getVolatility(h.connect_stddev, h.connect_avg) : "unknown";
  const trend = h ? getTrend(h.connect_p50, h.prev_connect_p50) : "unknown";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Link
            to="/"
            className="mt-1 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-xl font-semibold text-foreground">
                {relay.name}
              </h1>
              {score !== null && color && (
                <span
                  className={cn(
                    "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs font-bold tabular-nums",
                    SCORE_BG[color]
                  )}
                >
                  {score}
                </span>
              )}
              {isUp !== null && (
                <span
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-metric-sm font-medium",
                    isUp
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      isUp ? "bg-success animate-live-pulse" : "bg-destructive"
                    )}
                  />
                  {isUp ? "Up" : "Down"}
                </span>
              )}
            </div>
            <p className="text-metric-sm text-muted-foreground mt-0.5">
              {relay.url}
              {relay.region && (
                <span className="ml-2 text-muted-foreground/60">
                  · {relay.region}
                </span>
              )}
            </p>
          </div>
        </div>
        <TimeRangeSelector value={range} onChange={setRange} />
      </div>

      {/* Health summary strip */}
      {h && h.total_checks > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {[
            { label: "Uptime", value: formatPct(h.uptime_pct) },
            { label: "Failures", value: `${h.failed_probes} (${formatPct(h.failure_rate)})` },
            { label: "Incidents", value: String(h.downtime_incidents) },
            { label: "Max Downtime", value: formatDuration(h.longest_downtime_secs) },
            {
              label: "Volatility",
              value: volatility,
              className: VOLATILITY_COLORS[volatility],
            },
            {
              label: "Trend",
              value: `${TREND_ICONS[trend]} ${trend}`,
              className: TREND_COLORS[trend],
            },
            { label: "Checks", value: String(h.total_checks) },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-border bg-card p-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {item.label}
              </span>
              <div
                className={cn(
                  "font-mono text-sm tabular-nums mt-1",
                  (item as any).className || "text-foreground"
                )}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connect Latency */}
      <section className="space-y-3">
        <h2 className="font-mono text-sm font-medium text-foreground">
          Connect Latency
        </h2>
        <TimeseriesChart data={connectTs || []} unit="ms" />
        <StatsGrid stats={toStats(connectMetric)} unit="ms" />
      </section>

      {/* First Event Latency */}
      <section className="space-y-3">
        <h2 className="font-mono text-sm font-medium text-foreground">
          First Event Latency
        </h2>
        <TimeseriesChart data={eventTs || []} unit="ms" />
        <StatsGrid stats={toStats(eventMetric)} unit="ms" />
      </section>

      {/* Uptime */}
      <section className="space-y-3">
        <h2 className="font-mono text-sm font-medium text-foreground">
          Uptime (1 = up, 0 = down)
        </h2>
        <TimeseriesChart data={uptimeTs || []} />
        <StatsGrid stats={toStats(upMetric)} />
      </section>
    </div>
  );
}
