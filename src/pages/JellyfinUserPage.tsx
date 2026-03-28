import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { format, subDays, formatDistanceToNow } from "date-fns";
import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { TimeRange } from "@/lib/types";
import TimeRangeSelector from "@/components/TimeRangeSelector";

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

function formatJellyfinTitle(e: any): string {
  if (e.parsed_artist) {
    return `${e.parsed_artist} — ${e.parsed_title || e.content || "Unknown"}`;
  }
  return e.content || "Unknown";
}

function EventTypeBadge({ eventType }: { eventType: string }) {
  const styles: Record<string, string> = {
    play: "bg-green-500/15 text-green-400",
    stop: "bg-muted/60 text-muted-foreground",
  };
  const cls = styles[eventType] ?? "bg-muted/60 text-muted-foreground";
  return (
    <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px] font-medium shrink-0", cls)}>
      {eventType}
    </span>
  );
}

export default function JellyfinUserPage() {
  const { username } = useParams<{ username: string }>();
  const [range, setRange] = useState<TimeRange>("30d");

  const days = range === "7d" ? 7 : 30;
  const since = subDays(new Date(), days).toISOString();
  const decodedUsername = username ? decodeURIComponent(username) : "";

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["jellyfin_user_events", decodedUsername, range],
    queryFn: async () => {
      const { data } = await supabase
        .from("jellyfin_events")
        .select("*")
        .eq("username", decodedUsername)
        .gte("date_played", since)
        .order("date_played", { ascending: false });
      return data || [];
    },
    enabled: !!decodedUsername,
  });

  const stats = useMemo(() => {
    const stops = events.filter((e: any) => e.event_type === "stop");
    const totalPlays = stops.length;
    const estHours = Math.round((totalPlays * 3) / 60 * 10) / 10;

    const artistCounts: Record<string, number> = {};
    for (const e of stops) {
      const a = e.parsed_artist || null;
      if (a) artistCounts[a] = (artistCounts[a] || 0) + 1;
    }
    const topArtist =
      Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

    return { totalPlays, estHours, topArtist };
  }, [events]);

  const activityData = useMemo(() => {
    const dayCounts: Record<string, number> = {};
    for (const e of events) {
      const day = format(new Date(e.date_played), "MMM d");
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    }
    return Object.entries(dayCounts)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, plays]) => ({ date, plays }));
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

  const tickInterval = Math.max(1, Math.floor(activityData.length / 7));
  const avatarLetter = decodedUsername?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/jellyfin"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary font-bold font-mono text-lg select-none">
            {avatarLetter}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground font-mono">{decodedUsername}</h1>
            <p className="text-xs text-muted-foreground">Jellyfin User</p>
          </div>
        </div>
        <TimeRangeSelector value={range} onChange={setRange} ranges={["7d", "30d"]} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
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
          <p className="text-2xl font-bold font-mono text-foreground" title="Estimated at ~3 min per track">
            {isLoading ? "—" : `~${stats.estHours.toLocaleString()}`}
          </p>
          <p className="text-[9px] text-muted-foreground font-mono mt-0.5">~3 min/track est.</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">
            Top Artist
          </p>
          <p className="text-2xl font-bold font-mono text-foreground truncate">
            {isLoading ? "—" : stats.topArtist}
          </p>
        </div>
      </div>

      {/* Activity chart */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground mb-4">Activity</p>
        <div className="h-40">
          {activityData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="jellyfinUserAreaFill" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#jellyfinUserAreaFill)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Listen History */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground mb-3">Listen History</p>
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground">No data</p>
        ) : (
          <div className="space-y-1">
            {events.map((e: any) => (
              <div
                key={e.id}
                className="flex items-center gap-2 rounded-md border border-border/50 bg-background/30 px-3 py-2"
              >
                <span className="font-mono text-[10px] text-muted-foreground shrink-0 w-20">
                  {formatDistanceToNow(new Date(e.date_played), { addSuffix: true })}
                </span>
                <EventTypeBadge eventType={e.event_type} />
                <span className="flex-1 truncate text-xs text-foreground">
                  {formatJellyfinTitle(e)}
                </span>
                {e.media_type && (
                  <span className="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium shrink-0 bg-muted/40 text-muted-foreground">
                    {e.media_type}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Artists + Top Tracks */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground mb-3">Top Artists</p>
          <div className="space-y-2">
            {topArtists.length === 0 ? (
              <p className="text-xs text-muted-foreground">No data</p>
            ) : (
              topArtists.map(({ name, count, pct }) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="w-36 truncate text-xs text-foreground shrink-0">{name}</span>
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
                  <span className="w-36 truncate text-xs text-foreground shrink-0">{name}</span>
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
