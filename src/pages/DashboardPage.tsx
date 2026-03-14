import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchRelays, fetchRelaySummary, triggerProbe } from "@/lib/api";
import { TimeRange, RelaySummaryRow, RELAY_METRIC_KEYS } from "@/lib/types";
import TimeRangeSelector from "@/components/TimeRangeSelector";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Radio } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function getMetric(summary: RelaySummaryRow[], key: string) {
  return summary.find((s) => s.metric_key === key);
}

function formatMs(val: number | undefined | null) {
  if (val === undefined || val === null) return "—";
  return `${Math.round(val)}ms`;
}

function formatPct(summary: RelaySummaryRow[]) {
  const up = getMetric(summary, RELAY_METRIC_KEYS.UP);
  if (!up || up.total_count === 0) return "—";
  return `${(up.avg_val * 100).toFixed(1)}%`;
}

export default function DashboardPage() {
  const [range, setRange] = useState<TimeRange>("24h");
  const queryClient = useQueryClient();

  const { data: relays, isLoading: relaysLoading } = useQuery({
    queryKey: ["relays"],
    queryFn: fetchRelays,
  });

  const { data: summaries, isLoading: summariesLoading } = useQuery({
    queryKey: ["relay-summaries", range, relays?.map((r) => r.id)],
    queryFn: async () => {
      if (!relays || relays.length === 0) return {};
      const results: Record<string, RelaySummaryRow[]> = {};
      await Promise.all(
        relays.map(async (relay) => {
          try {
            results[relay.id] = await fetchRelaySummary(relay.id, range);
          } catch {
            results[relay.id] = [];
          }
        })
      );
      return results;
    },
    enabled: !!relays && relays.length > 0,
  });

  const probeMutation = useMutation({
    mutationFn: triggerProbe,
    onSuccess: (data) => {
      toast.success(`Probed ${data?.probed || 0} relays`);
      queryClient.invalidateQueries({ queryKey: ["relay-summaries"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const loading = relaysLoading || summariesLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-semibold text-foreground">
            Relay Health
          </h1>
          <p className="text-metric-sm text-muted-foreground mt-1">
            Monitor your Nostr relays in real time
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TimeRangeSelector value={range} onChange={setRange} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => probeMutation.mutate()}
            disabled={probeMutation.isPending || !relays?.length}
            className="gap-1.5"
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5",
                probeMutation.isPending && "animate-spin"
              )}
            />
            Probe Now
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : !relays || relays.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-20 text-center">
          <Radio className="h-10 w-10 text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium text-foreground mb-2">
            No relays registered
          </h2>
          <p className="text-metric-sm text-muted-foreground mb-6 max-w-md">
            Add your first Nostr relay to start collecting health metrics
            automatically.
          </p>
          <Link to="/relays/new">
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Relay
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {relays.map((relay) => {
            const summary = summaries?.[relay.id] || [];
            const upMetric = getMetric(summary, RELAY_METRIC_KEYS.UP);
            const connectMetric = getMetric(summary, RELAY_METRIC_KEYS.CONNECT_LATENCY);
            const eventMetric = getMetric(summary, RELAY_METRIC_KEYS.FIRST_EVENT_LATENCY);
            const isUp = upMetric ? upMetric.latest_val === 1 : null;
            const hasData = summary.length > 0;

            return (
              <Link
                key={relay.id}
                to={`/relays/${relay.id}`}
                className="group rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-card"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="min-w-0">
                    <h3 className="font-mono text-sm font-semibold text-foreground truncate">
                      {relay.name}
                    </h3>
                    <p className="text-metric-sm text-muted-foreground truncate mt-0.5">
                      {relay.url}
                    </p>
                  </div>
                  {isUp !== null && (
                    <div
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-metric-sm font-medium shrink-0",
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
                    </div>
                  )}
                </div>

                {hasData ? (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Connect p50
                      </span>
                      <div className="font-mono text-sm tabular-nums text-foreground mt-0.5">
                        {formatMs(connectMetric?.p50_val)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Connect p95
                      </span>
                      <div className="font-mono text-sm tabular-nums text-foreground mt-0.5">
                        {formatMs(connectMetric?.p95_val)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Uptime
                      </span>
                      <div className="font-mono text-sm tabular-nums text-foreground mt-0.5">
                        {formatPct(summary)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Event p50
                      </span>
                      <div className="font-mono text-sm tabular-nums text-foreground mt-0.5">
                        {formatMs(eventMetric?.p50_val)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Event p95
                      </span>
                      <div className="font-mono text-sm tabular-nums text-foreground mt-0.5">
                        {formatMs(eventMetric?.p95_val)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Checks
                      </span>
                      <div className="font-mono text-sm tabular-nums text-foreground mt-0.5">
                        {upMetric?.total_count || 0}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-metric-sm text-muted-foreground italic">
                    No data yet — click "Probe Now" to start
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
