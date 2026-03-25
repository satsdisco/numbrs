import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tv2 } from "lucide-react";
import { format, subDays } from "date-fns";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

type Range = "7d" | "30d" | "90d";
const RANGES: Range[] = ["7d", "30d", "90d"];

function RangeSelector({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-background p-0.5">
      {RANGES.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={cn(
            "rounded-sm px-3 py-1 font-mono text-xs font-medium transition-all",
            value === r
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

function formatHour(h: number): string {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

const PURPLE = "#7c3aed";

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "hsl(240, 10%, 6%)",
    border: "1px solid hsl(240, 3.7%, 15.9%)",
    borderRadius: "4px",
    fontFamily: "JetBrains Mono, monospace",
    fontSize: "11px",
  },
  labelStyle: { color: "hsl(240, 5%, 64.9%)" },
};

const axisStyle = {
  tick: { fill: "hsl(240, 5%, 64.9%)", fontSize: 9, fontFamily: "JetBrains Mono, monospace" },
  axisLine: false as const,
  tickLine: false as const,
};

type ContentTab = "Movies" | "Shows" | "Music";
const CONTENT_TABS: ContentTab[] = ["Movies", "Shows", "Music"];

export default function PlexPage() {
  const [range, setRange] = useState<Range>("30d");
  const [contentTab, setContentTab] = useState<ContentTab>("Movies");

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const since = subDays(new Date(), days).toISOString();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["plex_events", range],
    queryFn: async () => {
      const { data } = await supabase
        .from("plex_events")
        .select("*")
        .eq("event", "media.scrobble")
        .gte("created_at", since)
        .order("created_at", { ascending: true });
      return data || [];
    },
  });

  const stats = useMemo(() => {
    const totalPlays = events.length;
    const watchHours =
      Math.round(
        (events.reduce((sum: number, e: any) => sum + (e.duration_ms || 0), 0) / 3600000) * 10
      ) / 10;

    const userCounts: Record<string, number> = {};
    const hourCounts: Record<number, number> = {};

    for (const e of events) {
      const u = e.username || "Unknown";
      userCounts[u] = (userCounts[u] || 0) + 1;
      const h = new Date(e.created_at).getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    }

    const mostActiveUser = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    const peakHourLabel = peakHour ? formatHour(parseInt(peakHour[0])) : "—";

    return { totalPlays, watchHours, mostActiveUser, peakHourLabel };
  }, [events]);

  const activityData = useMemo(() => {
    const dayCounts: Record<string, number> = {};
    for (const e of events) {
      const day = format(new Date(e.created_at), "MMM d");
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    }
    return Object.entries(dayCounts).map(([date, plays]) => ({ date, plays }));
  }, [events]);

  const peakHoursData = useMemo(() => {
    const hourCounts: Record<number, number> = {};
    for (const e of events) {
      const h = new Date(e.created_at).getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    }
    return Array.from({ length: 24 }, (_, h) => ({
      hour: formatHour(h),
      plays: hourCounts[h] || 0,
    }));
  }, [events]);

  const topContent = useMemo(() => {
    const movieCounts: Record<string, number> = {};
    const showCounts: Record<string, number> = {};
    const musicCounts: Record<string, number> = {};

    for (const e of events) {
      if (e.media_type === "movie") {
        const k = e.title || "Unknown";
        movieCounts[k] = (movieCounts[k] || 0) + 1;
      } else if (e.media_type === "episode") {
        const k = e.grandparent_title || e.title || "Unknown";
        showCounts[k] = (showCounts[k] || 0) + 1;
      } else if (e.media_type === "track") {
        const k = e.grandparent_title || e.title || "Unknown";
        musicCounts[k] = (musicCounts[k] || 0) + 1;
      }
    }

    const toList = (counts: Record<string, number>) => {
      const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      const max = sorted[0]?.[1] || 1;
      return sorted.map(([name, count]) => ({ name, count, pct: (count / max) * 100 }));
    };

    return {
      Movies: toList(movieCounts),
      Shows: toList(showCounts),
      Music: toList(musicCounts),
    };
  }, [events]);

  const topUsers = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of events) {
      const u = e.username || "Unknown";
      counts[u] = (counts[u] || 0) + 1;
    }
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const max = sorted[0]?.[1] || 1;
    return sorted.map(([name, count]) => ({ name, count, pct: (count / max) * 100 }));
  }, [events]);

  const collectionCleanup = useMemo(() => {
    const movieCounts: Record<string, number> = {};
    for (const e of events) {
      if (e.media_type === "movie") {
        const k = e.title || "Unknown";
        movieCounts[k] = (movieCounts[k] || 0) + 1;
      }
    }
    return Object.entries(movieCounts)
      .filter(([, count]) => count === 1)
      .map(([name]) => name)
      .sort();
  }, [events]);

  const tickInterval = Math.max(1, Math.floor(activityData.length / 7));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
            <Tv2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Plex</h1>
            <p className="text-xs text-muted-foreground">
              Streaming analytics — media plays and user activity
            </p>
          </div>
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">
            Total Plays ({range})
          </p>
          <p className="text-2xl font-bold font-mono text-foreground">
            {isLoading ? "—" : stats.totalPlays.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">
            Watch Hours
          </p>
          <p className="text-2xl font-bold font-mono text-foreground">
            {isLoading ? "—" : stats.watchHours.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">
            Most Active User
          </p>
          <p className="text-2xl font-bold font-mono text-foreground truncate">
            {isLoading ? "—" : stats.mostActiveUser}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">
            Peak Hour
          </p>
          <p className="text-2xl font-bold font-mono text-foreground">
            {isLoading ? "—" : stats.peakHourLabel}
          </p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Activity */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground mb-4">Activity</p>
          <div className="h-48">
            {activityData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="plexAreaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PURPLE} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={PURPLE} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 3.7%, 20%)" vertical={false} />
                  <XAxis dataKey="date" {...axisStyle} interval={tickInterval} />
                  <YAxis {...axisStyle} width={32} />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(v: number) => [v, "plays"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="plays"
                    stroke={PURPLE}
                    strokeWidth={2}
                    fill="url(#plexAreaFill)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Peak Hours */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground mb-4">Peak Hours</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHoursData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 3.7%, 20%)" vertical={false} />
                <XAxis dataKey="hour" {...axisStyle} interval={2} />
                <YAxis {...axisStyle} width={32} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v: number) => [v, "plays"]}
                />
                <Bar dataKey="plays" fill={PURPLE} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom: Top Content + Top Users */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top Content with tabs */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-foreground">Top Content</p>
            <div className="flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5">
              {CONTENT_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setContentTab(tab)}
                  className={cn(
                    "rounded-sm px-2.5 py-0.5 text-xs font-medium transition-all",
                    contentTab === tab
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {topContent[contentTab].length === 0 ? (
              <p className="text-xs text-muted-foreground">No data</p>
            ) : (
              topContent[contentTab].map(({ name, count, pct }) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="w-32 truncate text-xs text-foreground shrink-0">{name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: PURPLE }}
                    />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground w-8 text-right shrink-0">
                    {count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Users */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground mb-3">Top Users</p>
          <div className="space-y-2">
            {topUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No data</p>
            ) : (
              topUsers.map(({ name, count, pct }) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="w-24 truncate text-xs text-foreground shrink-0">{name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: PURPLE }}
                    />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground w-8 text-right shrink-0">
                    {count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Collection Cleanup */}
      {collectionCleanup.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground mb-3">Collection Cleanup</p>
          <p className="text-xs text-muted-foreground mb-3">
            Movies played only once in this period
          </p>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {collectionCleanup.map((title) => (
              <div key={title} className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-1.5">
                <span className="text-xs text-foreground truncate mr-2">{title}</span>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0">1 play</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
