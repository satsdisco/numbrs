import { Link } from "react-router-dom";
import { Activity, ArrowRight } from "lucide-react";
import { Metric } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { fetchLatestDatapoint, fetchRecentDatapoints } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import MiniSparkline from "./MiniSparkline";

interface MetricCardProps {
  metric: Metric;
}

export default function MetricCard({ metric }: MetricCardProps) {
  const { data: latest } = useQuery({
    queryKey: ["latest-datapoint", metric.id],
    queryFn: () => fetchLatestDatapoint(metric.id),
    refetchInterval: 15000,
  });

  const { data: recent } = useQuery({
    queryKey: ["recent-datapoints", metric.id],
    queryFn: () => fetchRecentDatapoints(metric.id, 30),
    refetchInterval: 15000,
  });

  const isStale = latest
    ? Date.now() - new Date(latest.created_at).getTime() > 5 * 60 * 1000
    : true;

  return (
    <Link
      to={`/metrics/${metric.key}`}
      className="group block rounded-lg border border-border bg-card p-4 shadow-card transition-all duration-150 ease-smooth hover:border-primary/30"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-metric-base font-medium text-foreground">{metric.name}</h3>
          <p className="font-mono text-metric-sm text-muted-foreground">{metric.key}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`h-2 w-2 rounded-full ${isStale ? "bg-destructive" : "bg-success animate-live-pulse"}`} />
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </div>

      {/* Sparkline */}
      <div className="my-3 h-10">
        {recent && recent.length > 1 ? (
          <MiniSparkline data={recent.map((d) => d.value)} />
        ) : (
          <div className="flex h-full items-center justify-center text-metric-sm text-muted-foreground">
            No data
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-end justify-between">
        <div>
          <span className="font-mono text-metric-lg tabular-nums text-foreground">
            {latest ? latest.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
          </span>
          {metric.unit && (
            <span className="ml-1 text-metric-sm text-muted-foreground">{metric.unit}</span>
          )}
        </div>
        <span className="text-metric-sm text-muted-foreground">
          {latest ? formatDistanceToNow(new Date(latest.created_at), { addSuffix: true }) : "never"}
        </span>
      </div>
    </Link>
  );
}
