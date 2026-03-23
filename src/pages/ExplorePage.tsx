import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TimeRange, TIME_RANGE_CONFIG } from "@/lib/types";
import { scoreColor, formatMs, formatPct, type ScoreColor } from "@/lib/health";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, Search, ArrowUpDown, Globe, Zap, Shield, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

interface DirectoryRelay {
  relay_id: string;
  relay_name: string;
  relay_url: string;
  relay_region: string | null;
  connect_p50: number | null;
  connect_p95: number | null;
  event_p50: number | null;
  event_p95: number | null;
  uptime_pct: number | null;
  total_checks: number;
  failed_probes: number;
  health_score: number;
}

function getTimeWindow(range: TimeRange) {
  const config = TIME_RANGE_CONFIG[range];
  const now = new Date();
  const start = new Date(now.getTime() - config.seconds * 1000);
  return { start, end: now };
}

type SortField = "health_score" | "uptime_pct" | "connect_p50" | "relay_name";

const SCORE_BG: Record<ScoreColor, string> = {
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  destructive: "bg-destructive/15 text-destructive border-destructive/30",
};

const TIME_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "1h", label: "1H" },
  { value: "24h", label: "24H" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
];

export default function ExplorePage() {
  const [range, setRange] = useState<TimeRange>("24h");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("health_score");
  const [sortAsc, setSortAsc] = useState(false);

  const { data: relays, isLoading } = useQuery({
    queryKey: ["public-directory", range],
    queryFn: async () => {
      const { start, end } = getTimeWindow(range);
      const { data, error } = await supabase.rpc("get_public_relay_directory", {
        p_start: start.toISOString(),
        p_end: end.toISOString(),
      } as any);
      if (error) throw error;
      return (data as unknown as DirectoryRelay[]) || [];
    },
  });

  const filtered = useMemo(() => {
    if (!relays) return [];
    let list = relays;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.relay_name.toLowerCase().includes(q) ||
          r.relay_url.toLowerCase().includes(q) ||
          (r.relay_region && r.relay_region.toLowerCase().includes(q))
      );
    }
    list = [...list].sort((a, b) => {
      const av = a[sortBy] ?? -1;
      const bv = b[sortBy] ?? -1;
      if (typeof av === "string" && typeof bv === "string")
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return list;
  }, [relays, search, sortBy, sortAsc]);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) setSortAsc(!sortAsc);
    else { setSortBy(field); setSortAsc(false); }
  };

  const avgScore = relays?.length
    ? Math.round(relays.reduce((s, r) => s + (r.health_score ?? 0), 0) / relays.length)
    : 0;
  const avgUptime = relays?.length
    ? relays.reduce((s, r) => s + (r.uptime_pct ?? 0), 0) / relays.length
    : 0;
  const onlineCount = relays?.filter((r) => (r.uptime_pct ?? 0) > 50).length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <Activity className="h-6 w-6 text-primary" />
              <span className="font-mono text-sm font-semibold text-primary tracking-widest uppercase">
                numbrs for Nostr
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Relay Directory
            </h1>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
              Real-time health monitoring for the Nostr relay network.
              Find the fastest, most reliable relays.
            </p>
          </motion.div>

          {/* Summary stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-8 grid grid-cols-3 gap-4 max-w-md mx-auto"
          >
            <div className="rounded-lg border border-border bg-card/50 backdrop-blur-sm p-3 text-center">
              <Globe className="h-4 w-4 text-primary mx-auto mb-1" />
              <div className="font-mono text-xl font-bold text-foreground">{relays?.length ?? "—"}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Relays</div>
            </div>
            <div className="rounded-lg border border-border bg-card/50 backdrop-blur-sm p-3 text-center">
              <Zap className="h-4 w-4 text-success mx-auto mb-1" />
              <div className="font-mono text-xl font-bold text-foreground">{onlineCount}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Online</div>
            </div>
            <div className="rounded-lg border border-border bg-card/50 backdrop-blur-sm p-3 text-center">
              <Shield className="h-4 w-4 text-primary mx-auto mb-1" />
              <div className="font-mono text-xl font-bold text-foreground">{avgScore}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Score</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Controls */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search relays..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
            {TIME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors",
                  range === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Link to="/auth">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              Sign In
            </Button>
          </Link>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-card animate-pulse border border-border" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/50 py-16 text-center">
            <Globe className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No relays found</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left">
                    <SortButton label="Relay" field="relay_name" current={sortBy} asc={sortAsc} onToggle={toggleSort} />
                  </th>
                  <th className="px-4 py-3 text-center hidden sm:table-cell">
                    <SortButton label="Score" field="health_score" current={sortBy} asc={sortAsc} onToggle={toggleSort} />
                  </th>
                  <th className="px-4 py-3 text-center hidden md:table-cell">
                    <SortButton label="Uptime" field="uptime_pct" current={sortBy} asc={sortAsc} onToggle={toggleSort} />
                  </th>
                  <th className="px-4 py-3 text-center hidden lg:table-cell">
                    <SortButton label="Latency P50" field="connect_p50" current={sortBy} asc={sortAsc} onToggle={toggleSort} />
                  </th>
                  <th className="px-4 py-3 text-center hidden lg:table-cell text-muted-foreground text-xs font-medium">P95</th>
                  <th className="px-4 py-3 text-center hidden xl:table-cell text-muted-foreground text-xs font-medium">Event P50</th>
                  <th className="px-4 py-3 text-center text-muted-foreground text-xs font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((relay, i) => (
                    <motion.tr
                      key={relay.relay_id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.02 }}
                      className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm font-medium text-foreground">{relay.relay_name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{relay.relay_url}</div>
                        {relay.relay_region && (
                          <span className="text-[10px] text-muted-foreground">{relay.relay_region}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        <ScoreBadge score={relay.health_score} />
                      </td>
                      <td className="px-4 py-3 text-center hidden md:table-cell font-mono text-sm tabular-nums">
                        {formatPct(relay.uptime_pct)}
                      </td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell font-mono text-sm tabular-nums">
                        {formatMs(relay.connect_p50)}
                      </td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell font-mono text-sm tabular-nums text-muted-foreground">
                        {formatMs(relay.connect_p95)}
                      </td>
                      <td className="px-4 py-3 text-center hidden xl:table-cell font-mono text-sm tabular-nums text-muted-foreground">
                        {formatMs(relay.event_p50)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusDot up={(relay.uptime_pct ?? 0) > 50} checks={relay.total_checks} />
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SortButton({
  label, field, current, asc, onToggle,
}: {
  label: string; field: SortField; current: SortField; asc: boolean;
  onToggle: (f: SortField) => void;
}) {
  return (
    <button
      onClick={() => onToggle(field)}
      className={cn(
        "flex items-center gap-1 text-xs font-medium transition-colors",
        current === field ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
      <ArrowUpDown className={cn("h-3 w-3", current === field && "text-primary")} />
    </button>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = scoreColor(score);
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs font-bold tabular-nums", SCORE_BG[color])}>
      {score}
    </span>
  );
}

function StatusDot({ up, checks }: { up: boolean; checks: number }) {
  if (checks === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
      up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", up ? "bg-success animate-live-pulse" : "bg-destructive")} />
      {up ? "Up" : "Down"}
    </span>
  );
}
