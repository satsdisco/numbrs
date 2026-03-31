import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import {
  fetchMonitors,
  fetchUptimeEvents,
  fetchUptimeSummary,
  type UptimeMonitor,
  type UptimeEvent,
} from "@/lib/uptime-api";
import { cn } from "@/lib/utils";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import { TimeRange } from "@/lib/types";
import TimeRangeSelector from "@/components/TimeRangeSelector";
import { motion, AnimatePresence } from "framer-motion";

// ─── Range config ────────────────────────────────────────────────────────────

const UPTIME_RANGE_CONFIG: Record<TimeRange, { hours: number; eventLimit: number }> = {
  live:  { hours: 0.25, eventLimit: 20 },
  "1h":  { hours: 1,   eventLimit: 20 },
  "6h":  { hours: 6,   eventLimit: 30 },
  "24h": { hours: 24,  eventLimit: 50 },
  "7d":  { hours: 168, eventLimit: 200 },
  "30d": { hours: 720, eventLimit: 500 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatLatency(ms: number | null): string {
  if (ms === null || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function monitorAddress(monitor: UptimeMonitor): string {
  if (monitor.url) return monitor.url;
  if (monitor.hostname) {
    return monitor.port ? `${monitor.hostname}:${monitor.port}` : monitor.hostname;
  }
  return monitor.monitor_type ?? "—";
}

// ─── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: number }) {
  if (status === 3) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
        Maintenance
      </span>
    );
  }
  if (status === 2) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
        Pending
      </span>
    );
  }
  const up = status === 1;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
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
      {up ? "UP" : "DOWN"}
    </span>
  );
}

// ─── Timeline dots for last N heartbeats ─────────────────────────────────────

function EventTimeline({ events }: { events: UptimeEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">No heartbeats yet.</p>
    );
  }

  const reversed = [...events].reverse();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 flex-wrap">
        {reversed.map((evt) => (
          <span
            key={evt.id}
            title={`${evt.status === 1 ? "UP" : "DOWN"} — ${formatLatency(evt.response_time_ms)} — ${new Date(evt.checked_at).toLocaleString()}`}
            className={cn(
              "h-3 w-3 rounded-sm cursor-default transition-opacity hover:opacity-70",
              evt.status === 1 ? "bg-success" : "bg-destructive"
            )}
          />
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Last {events.length} checks — oldest → newest
      </p>
    </div>
  );
}

// ─── Expanded monitor detail ──────────────────────────────────────────────────

function MonitorDetail({
  monitor,
  rangeHours,
  eventLimit,
}: {
  monitor: UptimeMonitor;
  rangeHours: number;
  eventLimit: number;
}) {
  const { data: events, isLoading } = useQuery({
    queryKey: ["uptime-events", monitor.name, eventLimit],
    queryFn: () => fetchUptimeEvents(monitor.name, eventLimit),
    refetchInterval: 30_000,
  });

  const { data: summary } = useQuery({
    queryKey: ["uptime-summary", monitor.name, rangeHours],
    queryFn: () => fetchUptimeSummary(monitor.name, rangeHours),
    refetchInterval: 30_000,
  });

  return (
    <div className="border-t border-border bg-muted/20 px-5 py-4 space-y-3">
      <div className="flex flex-wrap items-center gap-6 text-xs">
        <div>
          <span className="text-muted-foreground uppercase tracking-wider">Uptime</span>
          <div className="font-mono text-sm font-semibold text-foreground mt-0.5">
            {summary?.uptime_pct != null ? `${summary.uptime_pct.toFixed(1)}%` : "—"}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground uppercase tracking-wider">Avg Latency</span>
          <div className="font-mono text-sm font-semibold text-foreground mt-0.5">
            {summary?.avg_latency_ms != null ? formatLatency(Math.round(summary.avg_latency_ms)) : "—"}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground uppercase tracking-wider">Total Checks</span>
          <div className="font-mono text-sm font-semibold text-foreground mt-0.5">
            {summary?.total_checks ?? "—"}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground uppercase tracking-wider">Failures</span>
          <div className="font-mono text-sm font-semibold text-foreground mt-0.5">
            {summary?.failed_checks ?? "—"}
          </div>
        </div>
        {(monitor.cert_days_remaining != null || monitor.cert_is_valid != null) && (
          <div>
            <span className="text-muted-foreground uppercase tracking-wider">TLS Cert</span>
            <div className="font-mono text-sm font-semibold mt-0.5">
              {monitor.cert_is_valid === false ? (
                <span className="text-destructive">Invalid</span>
              ) : monitor.cert_days_remaining != null ? (
                <span
                  className={cn(
                    monitor.cert_days_remaining < 14
                      ? "text-destructive"
                      : monitor.cert_days_remaining < 30
                      ? "text-amber-500"
                      : "text-success"
                  )}
                >
                  {monitor.cert_days_remaining}d left
                </span>
              ) : (
                "—"
              )}
            </div>
          </div>
        )}
        {monitor.monitor_type && (
          <div>
            <span className="text-muted-foreground uppercase tracking-wider">Type</span>
            <div className="font-mono text-sm font-semibold text-foreground mt-0.5 uppercase">
              {monitor.monitor_type}
            </div>
          </div>
        )}
      </div>
      {isLoading ? (
        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
      ) : (
        <EventTimeline events={events ?? []} />
      )}
    </div>
  );
}

// ─── Monitor row ─────────────────────────────────────────────────────────────

function MonitorRow({
  monitor,
  rangeHours,
  eventLimit,
}: {
  monitor: UptimeMonitor;
  rangeHours: number;
  eventLimit: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const { data: summary } = useQuery({
    queryKey: ["uptime-summary", monitor.name, rangeHours],
    queryFn: () => fetchUptimeSummary(monitor.name, rangeHours),
    refetchInterval: 30_000,
  });

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <StatusBadge status={monitor.status} />

        <div className="flex-1 min-w-0">
          <div className="font-mono text-sm font-semibold text-foreground truncate">
            {monitor.name}
          </div>
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {monitorAddress(monitor)}
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-6 text-xs shrink-0">
          <div className="text-center">
            <div className="text-muted-foreground uppercase tracking-wider text-[10px]">Latency</div>
            <div className="font-mono text-foreground mt-0.5">
              {formatLatency(monitor.response_time_ms)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground uppercase tracking-wider text-[10px]">Uptime</div>
            <div className="font-mono text-foreground mt-0.5">
              {summary?.uptime_pct != null ? `${summary.uptime_pct.toFixed(1)}%` : "—"}
            </div>
          </div>
        </div>

        <div className="shrink-0">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <MonitorDetail
              monitor={monitor}
              rangeHours={rangeHours}
              eventLimit={eventLimit}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Uptime Page ──────────────────────────────────────────────────────────────

export default function UptimePage() {
  const { pullIndicator } = usePullToRefresh({
    queryKeys: [["uptime-monitors"], ["uptime-summary"], ["uptime-events"]],
  });
  useQueryClient();
  const [range, setRange] = useState<TimeRange>("24h");

  const rangeOpt = UPTIME_RANGE_CONFIG[range];

  const { data: monitors, isLoading } = useQuery({
    queryKey: ["uptime-monitors"],
    queryFn: fetchMonitors,
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6">
      {pullIndicator}
      <div className="sticky top-14 z-20 -mx-6 px-6 py-3 bg-background/95 backdrop-blur-sm border-b border-border/50 lg:static lg:border-0 lg:mx-0 lg:px-0 lg:py-0 lg:bg-transparent flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-xl font-semibold text-foreground">Uptime</h1>
          <p className="text-metric-sm text-muted-foreground mt-1">
            Live data from Uptime Kuma — 13 monitors, 60s intervals
          </p>
        </div>
        <TimeRangeSelector value={range} onChange={setRange} ranges={["24h", "7d", "30d"]} />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-pulse bg-muted rounded-full" />
                  <div className="h-4 w-36 animate-pulse bg-muted rounded" />
                </div>
                <div className="h-6 w-14 animate-pulse bg-muted rounded-full" />
              </div>
              <div className="h-3 w-64 animate-pulse bg-muted rounded mb-2" />
              <div className="flex gap-4">
                <div className="h-3 w-20 animate-pulse bg-muted rounded" />
                <div className="h-3 w-20 animate-pulse bg-muted rounded" />
                <div className="h-3 w-20 animate-pulse bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : !monitors || monitors.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 py-20 text-center"
        >
          <Activity className="h-10 w-10 text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium text-foreground mb-2">No monitor data yet</h2>
          <p className="text-metric-sm text-muted-foreground max-w-sm">
            Waiting for kuma-sync.sh to run. Make sure the cron job is active on the Mac Mini.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {monitors.map((monitor) => (
            <MonitorRow
              key={monitor.name}
              monitor={monitor}
              rangeHours={rangeOpt.hours}
              eventLimit={rangeOpt.eventLimit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
