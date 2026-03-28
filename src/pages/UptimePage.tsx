import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchMonitors,
  createMonitor,
  deleteMonitor,
  fetchUptimeEvents,
  fetchUptimeSummary,
  triggerUptimeCheck,
  type UptimeMonitor,
  type UptimeEvent,
} from "@/lib/uptime-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Activity, Plus, Trash2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { TimeRange } from "@/lib/types";
import TimeRangeSelector from "@/components/TimeRangeSelector";
import { motion, AnimatePresence } from "framer-motion";

// ─── Range config ───────────────────────────────────────────────────────────────

const UPTIME_RANGE_CONFIG: Record<TimeRange, { hours: number; eventLimit: number }> = {
  live:  { hours: 0.25, eventLimit: 20 },
  "1h":  { hours: 1,   eventLimit: 20 },
  "6h":  { hours: 6,   eventLimit: 30 },
  "24h": { hours: 24,  eventLimit: 50 },
  "7d":  { hours: 168, eventLimit: 200 },
  "30d": { hours: 720, eventLimit: 500 },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatLatency(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function StatusBadge({ status }: { status: "up" | "down" | "unknown" | null }) {
  if (!status || status === "unknown") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
        Unknown
      </span>
    );
  }
  const up = status === "up";
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

// ─── Timeline dots for last N events ──────────────────────────────────────────

function EventTimeline({ events }: { events: UptimeEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">No events yet.</p>
    );
  }

  const reversed = [...events].reverse();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 flex-wrap">
        {reversed.map((evt) => (
          <span
            key={evt.id}
            title={`${evt.status.toUpperCase()} — ${formatLatency(evt.latency_ms)} — ${new Date(evt.checked_at).toLocaleString()}`}
            className={cn(
              "h-3 w-3 rounded-sm cursor-default transition-opacity hover:opacity-70",
              evt.status === "up" ? "bg-success" : "bg-destructive"
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

// ─── Expanded monitor row ──────────────────────────────────────────────────────

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
    queryKey: ["uptime-events", monitor.id, eventLimit],
    queryFn: () => fetchUptimeEvents(monitor.id, eventLimit),
    refetchInterval: 30_000,
  });

  const { data: summary } = useQuery({
    queryKey: ["uptime-summary", monitor.id, rangeHours],
    queryFn: () => fetchUptimeSummary(monitor.id, rangeHours),
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
      </div>
      {isLoading ? (
        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
      ) : (
        <EventTimeline events={events ?? []} />
      )}
    </div>
  );
}

// ─── Monitor row ───────────────────────────────────────────────────────────────

function MonitorRow({
  monitor,
  rangeHours,
  eventLimit,
  onDelete,
}: {
  monitor: UptimeMonitor;
  rangeHours: number;
  eventLimit: number;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const { data: summary } = useQuery({
    queryKey: ["uptime-summary", monitor.id, rangeHours],
    queryFn: () => fetchUptimeSummary(monitor.id, rangeHours),
    refetchInterval: 30_000,
  });

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <StatusBadge status={monitor.last_status} />

        <div className="flex-1 min-w-0">
          <div className="font-mono text-sm font-semibold text-foreground truncate">
            {monitor.name}
          </div>
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {monitor.url}
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-6 text-xs shrink-0">
          <div className="text-center">
            <div className="text-muted-foreground uppercase tracking-wider text-[10px]">Latency</div>
            <div className="font-mono text-foreground mt-0.5">
              {formatLatency(monitor.last_latency_ms)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground uppercase tracking-wider text-[10px]">Uptime</div>
            <div className="font-mono text-foreground mt-0.5">
              {summary?.uptime_pct != null ? `${summary.uptime_pct.toFixed(1)}%` : "—"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete monitor "${monitor.name}"?`)) onDelete(monitor.id);
            }}
            className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
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

// ─── Add Monitor Dialog ────────────────────────────────────────────────────────

const INTERVAL_OPTIONS = [
  { label: "1 minute", value: 60 },
  { label: "5 minutes", value: 300 },
  { label: "15 minutes", value: 900 },
  { label: "30 minutes", value: 1800 },
  { label: "1 hour", value: 3600 },
];

function AddMonitorDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; url: string; interval_seconds: number }) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [interval, setInterval] = useState("300");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      toast.error("Name and URL are required");
      return;
    }
    let finalUrl = url.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = "https://" + finalUrl;
    }
    onSubmit({ name: name.trim(), url: finalUrl, interval_seconds: parseInt(interval) });
    setName("");
    setUrl("");
    setInterval("300");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono">Add Monitor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Name
            </label>
            <Input
              placeholder="My Website"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              URL
            </label>
            <Input
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              type="url"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Check Interval
            </label>
            <Select value={interval} onValueChange={setInterval}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVAL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Add Monitor</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Uptime Page ───────────────────────────────────────────────────────────────

export default function UptimePage() {
  const { user } = useAuth();

  const { pullIndicator } = usePullToRefresh({
    queryKeys: [["uptime-monitors"], ["uptime-summary"], ["uptime-events"]],
  });
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [range, setRange] = useState<TimeRange>("24h");

  const rangeOpt = UPTIME_RANGE_CONFIG[range];;

  const { data: monitors, isLoading } = useQuery({
    queryKey: ["uptime-monitors"],
    queryFn: fetchMonitors,
    refetchInterval: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; url: string; interval_seconds: number }) =>
      createMonitor({ ...data, user_id: user!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["uptime-monitors"] });
      toast.success("Monitor added");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMonitor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["uptime-monitors"] });
      toast.success("Monitor deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const checkMutation = useMutation({
    mutationFn: () => triggerUptimeCheck(),
    onSuccess: (data: any) => {
      toast.success(`Checked ${data?.checked ?? 0} monitors`);
      queryClient.invalidateQueries({ queryKey: ["uptime-monitors"] });
      queryClient.invalidateQueries({ queryKey: ["uptime-summary"] });
      queryClient.invalidateQueries({ queryKey: ["uptime-events"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      {pullIndicator}
      <div className="sticky top-14 z-20 -mx-6 px-6 py-3 bg-background/95 backdrop-blur-sm border-b border-border/50 lg:static lg:border-0 lg:mx-0 lg:px-0 lg:py-0 lg:bg-transparent flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-xl font-semibold text-foreground">Uptime</h1>
          <p className="text-metric-sm text-muted-foreground mt-1">
            Monitor any URL — track availability and latency
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <TimeRangeSelector value={range} onChange={setRange} ranges={["24h", "7d", "30d"]} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => checkMutation.mutate()}
            disabled={checkMutation.isPending || !monitors?.length}
            className="gap-1.5"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", checkMutation.isPending && "animate-spin")}
            />
            Check Now
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Monitor
          </Button>
        </div>
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
          <h2 className="text-lg font-medium text-foreground mb-2">No monitors yet</h2>
          <p className="text-metric-sm text-muted-foreground mb-6 max-w-sm">
            Add a URL to start tracking uptime. We'll ping it on your chosen schedule and alert you on downtime.
          </p>
          <Button className="gap-1.5" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Add your first monitor
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {monitors.map((monitor) => (
            <MonitorRow
              key={monitor.id}
              monitor={monitor}
              rangeHours={rangeOpt.hours}
              eventLimit={rangeOpt.eventLimit}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      <AddMonitorDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSubmit={(data) => createMutation.mutate(data)}
      />
    </div>
  );
}
