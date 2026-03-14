import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchMetricByKey, fetchTimeseries, fetchMetricStats, deleteMetric } from "@/lib/api";
import { TimeRange } from "@/lib/types";
import TimeRangeSelector from "@/components/TimeRangeSelector";
import TimeseriesChart from "@/components/TimeseriesChart";
import StatsGrid from "@/components/StatsGrid";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Globe } from "lucide-react";
import { toast } from "sonner";

export default function MetricDetailPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const [range, setRange] = useState<TimeRange>("24h");

  const { data: metric, isLoading } = useQuery({
    queryKey: ["metric", key],
    queryFn: () => fetchMetricByKey(key!),
    enabled: !!key,
  });

  const { data: timeseries } = useQuery({
    queryKey: ["timeseries", metric?.id, range],
    queryFn: () => fetchTimeseries(metric!.id, range),
    enabled: !!metric,
    refetchInterval: 30000,
  });

  const { data: stats } = useQuery({
    queryKey: ["stats", metric?.id, range],
    queryFn: () => fetchMetricStats(metric!.id, range),
    enabled: !!metric,
    refetchInterval: 30000,
  });

  const handleDelete = async () => {
    if (!metric) return;
    if (!confirm(`Delete metric "${metric.name}"? This also deletes all datapoints.`)) return;
    try {
      await deleteMetric(metric.id);
      toast.success("Metric deleted");
      navigate("/");
    } catch {
      toast.error("Failed to delete metric");
    }
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="h-64 rounded-lg bg-muted" />
    </div>;
  }

  if (!metric) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-metric-base text-muted-foreground">Metric not found</p>
        <Button variant="ghost" onClick={() => navigate("/")} className="mt-4">Go back</Button>
      </div>
    );
  }

  const tags = metric.tags as Record<string, string> | null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-metric-lg text-foreground">{metric.name}</h1>
            <div className="flex items-center gap-2 text-metric-sm text-muted-foreground">
              <span className="font-mono">{metric.key}</span>
              {metric.is_public && (
                <span className="flex items-center gap-1 text-success">
                  <Globe className="h-3 w-3" /> Public
                </span>
              )}
            </div>
            {metric.description && (
              <p className="mt-1 text-metric-sm text-muted-foreground">{metric.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TimeRangeSelector value={range} onChange={setRange} />
          <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tags */}
      {tags && Object.keys(tags).length > 0 && (
        <div className="flex gap-2">
          {Object.entries(tags).map(([k, v]) => (
            <span key={k} className="rounded-sm bg-secondary px-2 py-0.5 font-mono text-metric-sm text-secondary-foreground">
              {k}:{v}
            </span>
          ))}
        </div>
      )}

      {/* Chart */}
      <TimeseriesChart data={timeseries || []} unit={metric.unit ?? undefined} />

      {/* Stats */}
      <StatsGrid stats={stats ?? null} unit={metric.unit ?? undefined} />
    </div>
  );
}
