import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchRelays, fetchRelayHealth, triggerProbe } from "@/lib/api";
import { TimeRange } from "@/lib/types";
import {
  RelayHealthRow,
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
  ScoreColor,
} from "@/lib/health";
import TimeRangeSelector from "@/components/TimeRangeSelector";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, RefreshCw, Radio, Info, Plug } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { RelayRow } from "@/lib/types";

// ─── Stat cell with optional tooltip ───────────────────────────────────────────

function Stat({
  label,
  value,
  tooltip,
  className,
}: {
  label: string;
  value: React.ReactNode;
  tooltip?: string;
  className?: string;
}) {
  const content = (
    <div className={cn("min-w-0", className)}>
      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground leading-none">
        {label}
        {tooltip && <Info className="h-2.5 w-2.5 opacity-50" />}
      </span>
      <div className="font-mono text-sm tabular-nums text-foreground mt-1 leading-none">
        {value}
      </div>
    </div>
  );

  if (!tooltip) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-52 text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Score badge ───────────────────────────────────────────────────────────────

const SCORE_BG: Record<ScoreColor, string> = {
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  destructive: "bg-destructive/15 text-destructive border-destructive/30",
};

function HealthBadge({ score }: { score: number }) {
  const color = scoreColor(score);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs font-bold tabular-nums",
            SCORE_BG[color]
          )}
        >
          {score}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-60 text-xs">
        Score out of 100 — weighted: Uptime 40%, Connect Latency 30%, Failures
        30%. Higher is healthier.
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Status dot ────────────────────────────────────────────────────────────────

function StatusBadge({ h }: { h: RelayHealthRow }) {
  if (h.total_checks === 0) return null;
  const up = h.uptime_pct !== null && h.uptime_pct >= 50;
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0",
        up
          ? "bg-success/10 text-success"
          : "bg-destructive/10 text-destructive"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          up ? "bg-success animate-live-pulse" : "bg-destructive"
        )}
      />
      {up ? "Up" : "Down"}
    </span>
  );
}

// ─── Relay Card ────────────────────────────────────────────────────────────────

function RelayCard({
  relay,
  health,
}: {
  relay: RelayRow;
  health: RelayHealthRow | null;
}) {
  if (!health || health.total_checks === 0) {
    return (
      <Link
        to={`/relays/${relay.id}`}
        className="group rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-card"
      >
        <h3 className="font-mono text-sm font-semibold text-foreground truncate">
          {relay.name}
        </h3>
        <p className="text-metric-sm text-muted-foreground truncate mt-0.5">
          {relay.url}
        </p>
        <p className="text-metric-sm text-muted-foreground italic mt-4">
          No data yet — click "Probe Now" to start
        </p>
      </Link>
    );
  }

  const h = health;
  const score = computeHealthScore(h);
  const volatility = getVolatility(h.connect_stddev, h.connect_avg);
  const trend = getTrend(h.connect_p50, h.prev_connect_p50);
  const up = h.uptime_pct !== null && h.uptime_pct >= 50;
  const isOffline = !up && h.connect_p50 === null;

  return (
    <Link
      to={`/relays/${relay.id}`}
      className={cn(
        "group rounded-lg border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-card",
        isOffline
          ? "border-destructive/20 opacity-60"
          : "border-border"
      )}
    >
      {/* Offline banner */}
      {isOffline && (
        <div className="mb-3 -mt-1 flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
          <span className="text-[11px] font-medium text-destructive">Offline / Unreachable</span>
        </div>
      )}
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1 mr-2">
          <h3 className="font-mono text-sm font-semibold text-foreground truncate">
            {relay.name}
          </h3>
          <p className="text-metric-sm text-muted-foreground truncate mt-0.5">
            {relay.url}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <HealthBadge score={score} />
          <StatusBadge h={h} />
        </div>
      </div>

      {/* Row 1: Latency + Uptime */}
      <div className={cn("grid grid-cols-3 gap-x-3 gap-y-3 mb-3", isOffline && "opacity-50")}>
        <Stat label="Connect P50" value={formatMs(h.connect_p50)} />
        <Stat label="Connect P95" value={formatMs(h.connect_p95)} />
        <Stat
          label="Uptime"
          value={formatPct(h.uptime_pct)}
          tooltip="Percentage of successful probes in this time range"
        />
      </div>

      {/* Row 2: Event latency + Failures */}
      <div className={cn("grid grid-cols-3 gap-x-3 gap-y-3 mb-3", isOffline && "opacity-50")}>
        <Stat label="Event P50" value={formatMs(h.event_p50)} />
        <Stat label="Event P95" value={formatMs(h.event_p95)} />
        <Stat
          label="Failures"
          value={
            <>
              {h.failed_probes}{" "}
              <span className="text-muted-foreground text-[10px]">
                ({formatPct(h.failure_rate)})
              </span>
            </>
          }
          tooltip="Number of failed probes and failure rate in this window"
        />
      </div>

      {/* Row 3: Derived metrics */}
      <div className={cn("grid grid-cols-3 gap-x-3 border-t border-border pt-3", isOffline && "opacity-50")}>
        <Stat
          label="Volatility"
          value={
            <span className={VOLATILITY_COLORS[volatility]}>
              {volatility === "unknown" ? "—" : volatility}
            </span>
          }
          tooltip="Volatility measures how consistent connect latency is. Low = stable, Medium = some variance, High = erratic response times even when the relay is reachable. Calculated as stddev ÷ mean (low < 20%, medium < 50%, high ≥ 50%)."
        />
        <Stat
          label="Trend"
          value={
            <span className={TREND_COLORS[trend]}>
              {TREND_ICONS[trend]}{" "}
              {trend === "unknown" ? "—" : trend}
            </span>
          }
          tooltip="Compares current p50 connect latency vs the previous equal-length window"
        />
        <Stat
          label="Incidents"
          value={
            <>
              {h.downtime_incidents}
              {h.downtime_incidents > 0 && (
                <span className="text-muted-foreground text-[10px] ml-1">
                  (max {formatDuration(h.longest_downtime_secs)})
                </span>
              )}
            </>
          }
          tooltip="Contiguous downtime periods longer than 1 minute. Shows count and longest duration."
        />
      </div>
    </Link>
  );
}

// ─── Dashboard Page ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [range, setRange] = useState<TimeRange>("24h");
  const queryClient = useQueryClient();

  const { data: relays, isLoading: relaysLoading } = useQuery({
    queryKey: ["relays"],
    queryFn: fetchRelays,
  });

  const { data: healthMap, isLoading: healthLoading } = useQuery({
    queryKey: ["relay-health", range, relays?.map((r) => r.id)],
    queryFn: async () => {
      if (!relays || relays.length === 0) return {};
      const results: Record<string, RelayHealthRow | null> = {};
      await Promise.all(
        relays.map(async (relay) => {
          try {
            results[relay.id] = await fetchRelayHealth(relay.id, range);
          } catch {
            results[relay.id] = null;
          }
        })
      );
      return results;
    },
    enabled: !!relays && relays.length > 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["relays"] });
      queryClient.invalidateQueries({ queryKey: ["relay-health"] });
    }, 30_000);
    return () => clearInterval(interval);
  }, [queryClient]);

  const probeMutation = useMutation({
    mutationFn: triggerProbe,
    onSuccess: (data) => {
      toast.success(`Probed ${data?.probed || 0} relays`);
      queryClient.invalidateQueries({ queryKey: ["relay-health"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const loading = relaysLoading || healthLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-xl font-semibold text-foreground">
            Relay Health
          </h1>
          <p className="text-metric-sm text-muted-foreground mt-1">
            Monitor your Nostr relays in real time
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-success">
            <span className="h-2 w-2 rounded-full bg-success animate-live-pulse" />
            <span className="font-mono text-xs">Live</span>
          </div>
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
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 py-20 text-center">
          <Radio className="h-10 w-10 text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium text-foreground mb-2">
            No relays registered
          </h2>
          <p className="text-metric-sm text-muted-foreground mb-2 max-w-md">
            Add a Nostr relay to start collecting latency, uptime, and health
            metrics automatically.
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            Prefer to push custom metrics?{" "}
            <Link to="/integrations" className="text-primary hover:underline inline-flex items-center gap-0.5">
              <Plug className="h-3 w-3" /> View integrations
            </Link>
          </p>
          <Link to="/relays/new">
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" /> Add your first relay
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {relays.map((relay) => (
            <RelayCard
              key={relay.id}
              relay={relay}
              health={healthMap?.[relay.id] ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
