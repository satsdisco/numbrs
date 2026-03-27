import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Music2 } from "lucide-react";
import { format, subDays, formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
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

const EVENT_TYPE_LABELS: Record<string, string> = {
  play: "Playing",
  stop: "Played",
};

function EventTypeBadge({ eventType }: { eventType: string }) {
  const styles: Record<string, string> = {
    play: "bg-green-500/15 text-green-400",
    stop: "bg-muted/60 text-muted-foreground",
  };
  const cls = styles[eventType] ?? "bg-muted/60 text-muted-foreground";
  const label = EVENT_TYPE_LABELS[eventType] ?? eventType;
  return (
    <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px] font-medium shrink-0", cls)}>
      {label}
    </span>
  );
}

function formatJellyfinTitle(e: any): string {
  if (e.parsed_artist) {
    return `${e.parsed_artist} — ${e.parsed_title || e.content || "Unknown"}`;
  }
  return e.content || "Unknown";
}

export default function JellyfinPage() {
  const [range, setRange] = useState<Range>("30d");
  const [showAllRecent, setShowAllRecent] = useState(false);

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const since = subDays(new Date(), days).toISOString();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["jellyfin_events", range],
    queryFn: async () => {
      const { data } = await supabase
        .from("jellyfin_events")
        .select("*")
        .gte("date_played", since)
        .order("date_played", { ascending: true });
      return data || [];
    },
  });

  const stats = useMemo(() => {
    const stops = events.filter((e: any) => e.event_type === "stop");
    const totalPlays = stops.length;
    const estHours = Math.round((totalPlays * 3) / 60 * 10) / 10;

    const userCounts: Record<string, number> = {};
    const hourCounts: Record<number, number> = {};

    for (const e of events) {
      const u = e.username || "Unknown";
      userCounts[u] = (userCounts[u] || 0) + 1;
      const h = new Date(e.date_played).getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    }

    const mostActiveUser = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    const peakHourLabel = peakHour ? formatHour(parseInt(peakHour[0])) : "—";

    return { totalPlays, estHours, mostActiveUser, peakHourLabel };
  }, [events]);

  const activityData = useMemo(() => {
    const dayCounts: Record<string, number> = {};
    for (const e of events) {
      const day = format(new Date(e.date_played), "MMM d");
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    }
    return Object.entries(dayCounts).map(([date, plays]) => ({ date, plays }));
  }, [events]);

  const peakHoursData = useMemo(() => {
    const hourCounts: Record<number, number> = {};
    for (const e of events) {
      const h = new Date(e.date_played).getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    }
    return Array.from({ length: 24 }, (_, h) => ({
      hour: formatHour(h),
      plays: hourCounts[h] || 0,
    }));
  }, [events]);

  const topArtists = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of events) {
      const a = e.parsed_artist || "Unknown";
      counts[a] = (counts[a] || 0) + 1;
    }
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const max = sorted[0]?.[1] || 1;
    return sorted.map(([name, count]) => ({ name, count, pct: (count / max) * 100 }));
  }, [events]);

  const topTracks = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of events) {
      const t = e.parsed_title || e.content || "Unknown";
      counts[t] = (counts[t] || 0) + 1;
    }
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const max = sorted[0]?.[1] || 1;
    return sorted.map(([name, count]) => ({ name, count, pct: (count / max) * 100 }));
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

  const recentlyPlayed = useMemo(() => {
    return [...events]
      .sort((a: any, b: any) => new Date(b.date_played).getTime() - new Date(a.date_played).getTime())
      .slice(0, 30);
  }, [events]);
  const visibleRecent = showAllRecent ? recentlyPlayed : recentlyPlayed.slice(0, 15);

  const tickInterval = Math.max(1, Math.floor(activityData.length / 7));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
            <Music2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Jellyfin</h1>
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
            Est. Hours
          </p>
          <p className="text-2xl font-bold font-mono text-foreground" title="Estimated at ~3 min per track — Jellyfin doesn't report duration">
            {isLoading ? "—" : `~${stats.estHours.toLocaleString()}`}
          </p>
          <p className="text-[9px] text-muted-foreground font-mono mt-0.5">~3 min/track est.</p>
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
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground mb-4">Activity Over Time</p>
          <div className="h-48">
            {activityData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="jellyfinAreaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PURPLE} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={PURPLE} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 3.7%, 20%)" vertical={false} />
                  <XAxis dataKey="date" {...axisStyle} interval={tickInterval} />
                  <YAxis {...axisStyle} width={32} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [v, "events"]} />
                  <Area
                    type="monotone"
                    dataKey="plays"
                    stroke={PURPLE}
                    strokeWidth={2}
                    fill="url(#jellyfinAreaFill)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground mb-4">Peak Hours</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHoursData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 3.7%, 20%)" vertical={false} />
                <XAxis dataKey="hour" {...axisStyle} interval={2} />
                <YAxis {...axisStyle} width={32} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [v, "events"]} />
                <Bar dataKey="plays" fill={PURPLE} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recently Played */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground mb-3">Recently Played</p>
        {recentlyPlayed.length === 0 ? (
          <p className="text-xs text-muted-foreground">No data</p>
        ) : (
          <>
            <div className="space-y-1">
              {visibleRecent.map((e: any) => (
                <div
                  key={e.id}
                  className="rounded-md border border-border/50 bg-background/30 px-3 py-2.5"
                >
                  {/* Title — prominent, full width */}
                  <p className="text-sm font-medium text-foreground truncate mb-1">
                    {formatJellyfinTitle(e)}
                  </p>
                  {/* Meta row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(e.date_played), { addSuffix: true })}
                    </span>
                    <Link
                      to={`/jellyfin/user/${encodeURIComponent(e.username || "Unknown")}`}
                      className="text-[10px] font-medium text-primary hover:underline"
                    >
                      {e.username || "Unknown"}
                    </Link>
                    <EventTypeBadge eventType={e.event_type} />
                    {e.media_type && (
                      <span className="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium bg-muted/40 text-muted-foreground">
                        {e.media_type}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {recentlyPlayed.length > 15 && (
              <button
                onClick={() => setShowAllRecent(v => !v)}
                className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                {showAllRecent ? "Show less" : `Show ${recentlyPlayed.length - 15} more`}
              </button>
            )}
          </>
        )}
      </div>

      {/* Bottom row: Top Artists + Top Tracks + Top Users */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground mb-3">Top Artists</p>
          <div className="space-y-2">
            {topArtists.length === 0 ? (
              <p className="text-xs text-muted-foreground">No data</p>
            ) : (
              topArtists.map(({ name, count, pct }) => (
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

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground mb-3">Top Tracks</p>
          <div className="space-y-2">
            {topTracks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No data</p>
            ) : (
              topTracks.map(({ name, count, pct }) => (
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

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground mb-3">Top Users</p>
          <div className="space-y-2">
            {topUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No data</p>
            ) : (
              topUsers.map(({ name, count, pct }) => (
                <div key={name} className="flex items-center gap-2">
                  <Link
                    to={`/jellyfin/user/${encodeURIComponent(name)}`}
                    className="w-24 truncate text-xs text-foreground hover:text-primary transition-colors shrink-0"
                  >
                    {name}
                  </Link>
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
    </div>
  );
}
