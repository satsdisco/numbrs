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

function formatPlexTitle(e: any): string {
  if (e.media_type === "episode") {
    return `${e.grandparent_title || "Unknown Show"} — ${e.title || "Unknown Episode"}`;
  } else if (e.media_type === "track") {
    return `${e.grandparent_title || "Unknown Artist"} — ${e.title || "Unknown Track"}`;
  }
  return e.title || "Unknown";
}

function EventBadge({ event }: { event: string }) {
  const styles: Record<string, string> = {
    "media.play": "bg-green-500/15 text-green-400",
    "media.stop": "bg-muted/60 text-muted-foreground",
    "media.scrobble": "bg-purple-500/15 text-purple-400",
    "media.pause": "bg-yellow-500/15 text-yellow-400",
  };
  const labels: Record<string, string> = {
    "media.play": "started",
    "media.stop": "stop",
    "media.scrobble": "played",
    "media.pause": "pause",
  };
  const cls = styles[event] ?? "bg-muted/60 text-muted-foreground";
  const label = labels[event] ?? event.replace("media.", "");
  return (
    <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px] font-medium shrink-0", cls)}>
      {label}
    </span>
  );
}

export default function PlexUserPage() {
  const { username } = useParams<{ username: string }>();
  const [range, setRange] = useState<TimeRange>("30d");

  const days = range === "7d" ? 7 : 30;
  const since = subDays(new Date(), days).toISOString();
  const decodedUsername = username ? decodeURIComponent(username) : "";

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["plex_user_events", decodedUsername, range],
    queryFn: async () => {
      const { data } = await supabase
        .from("plex_events")
        .select("*")
        .eq("event", "media.scrobble")
        .eq("username", decodedUsername)
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!decodedUsername,
  });

  const stats = useMemo(() => {
    const scrobbles = events.filter((e: any) => e.event === "media.scrobble");
    const totalPlays = scrobbles.length;
    const watchHours =
      Math.round(
        (scrobbles.reduce((sum: number, e: any) => sum + (e.duration_ms || 0), 0) / 3600000) * 10
      ) / 10;

    const mediaCounts: Record<string, number> = {};
    for (const e of scrobbles) {
      const m = e.media_type || "unknown";
      mediaCounts[m] = (mediaCounts[m] || 0) + 1;
    }
    const favoriteType =
      Object.entries(mediaCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

    return { totalPlays, watchHours, favoriteType };
  }, [events]);

  const activityData = useMemo(() => {
    const dayCounts: Record<string, number> = {};
    for (const e of events) {
      const day = format(new Date(e.created_at), "MMM d");
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    }
    return Object.entries(dayCounts)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, plays]) => ({ date, plays }));
  }, [events]);

  const topContent = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of events) {
      const k = formatPlexTitle(e);
      counts[k] = (counts[k] || 0) + 1;
    }
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const max = sorted[0]?.[1] || 1;
    return sorted.map(([name, count]) => ({ name, count, pct: (count / max) * 100 }));
  }, [events]);

  const deviceData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of events) {
      const d = e.player_title || "Unknown";
      counts[d] = (counts[d] || 0) + 1;
    }
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
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
            to="/plex"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary font-bold font-mono text-lg select-none">
            {avatarLetter}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground font-mono">{decodedUsername}</h1>
            <p className="text-xs text-muted-foreground">Plex User</p>
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
            Watch Hours
          </p>
          <p className="text-2xl font-bold font-mono text-foreground">
            {isLoading ? "—" : stats.watchHours.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">
            Favorite Type
          </p>
          <p className="text-2xl font-bold font-mono text-foreground capitalize">
            {isLoading ? "—" : stats.favoriteType}
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
                  <linearGradient id="plexUserAreaFill" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#plexUserAreaFill)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Watch History */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground mb-3">Watch History</p>
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
                  {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                </span>
                <EventBadge event={e.event} />
                <span className="flex-1 truncate text-xs text-foreground">
                  {formatPlexTitle(e)}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:block truncate max-w-[100px]">
                  {e.player_title || ""}
                </span>
                {e.duration_ms > 0 && (
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                    {Math.round(e.duration_ms / 60000)}m
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Content + Devices */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground mb-3">Top Content</p>
          <div className="space-y-2">
            {topContent.length === 0 ? (
              <p className="text-xs text-muted-foreground">No data</p>
            ) : (
              topContent.map(({ name, count, pct }) => (
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
          <p className="text-sm font-medium text-foreground mb-3">Devices</p>
          <div className="space-y-2">
            {deviceData.length === 0 ? (
              <p className="text-xs text-muted-foreground">No data</p>
            ) : (
              deviceData.map(({ name, count, pct }) => (
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
