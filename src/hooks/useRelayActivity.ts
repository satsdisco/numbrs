import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ActivityRange = "24h" | "7d" | "30d";

export interface ActivityBucket {
  bucket: string;
  kind: number;
  event_count: number;
  total_sats: number;
  unique_pubkeys: number;
}

export interface HeatmapCell {
  day: number; // 0=Mon, 6=Sun
  hour: number; // 0-23
  value: number;
  label: string;
}

export interface ZapSummary {
  totalZaps: number;
  totalSats: number;
  avgZapSize: number;
  peakHour: number | null;
  hourlyVolume: { hour: string; zaps: number; sats: number }[];
}

export interface StackedPoint {
  time: string;
  notes: number;
  zaps: number;
  reactions: number;
  profiles: number;
  articles: number;
  other: number;
}

const RANGE_HOURS: Record<ActivityRange, number> = {
  "24h": 24,
  "7d": 168,
  "30d": 720,
};

const KIND_NAMES: Record<number, keyof StackedPoint> = {
  0: "profiles",
  1: "notes",
  7: "reactions",
  9735: "zaps",
  30023: "articles",
};

function buildHeatmap(data: ActivityBucket[]): HeatmapCell[] {
  // Aggregate all kinds into hour-of-week buckets
  const grid = new Map<string, { total: number; breakdown: Record<string, number> }>();

  for (const row of data) {
    const d = new Date(row.bucket);
    const day = (d.getUTCDay() + 6) % 7; // Mon=0
    const hour = d.getUTCHours();
    const key = `${day}-${hour}`;

    if (!grid.has(key)) {
      grid.set(key, { total: 0, breakdown: {} });
    }
    const cell = grid.get(key)!;
    cell.total += row.event_count;
    const kindName = KIND_NAMES[row.kind] || "other";
    cell.breakdown[kindName] = (cell.breakdown[kindName] || 0) + row.event_count;
  }

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const cells: HeatmapCell[] = [];

  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const key = `${day}-${hour}`;
      const cell = grid.get(key);
      const parts = cell?.breakdown
        ? Object.entries(cell.breakdown)
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => `${v} ${k}`)
            .join(", ")
        : "no data";
      cells.push({
        day,
        hour,
        value: cell?.total ?? 0,
        label: `${DAYS[day]} ${String(hour).padStart(2, "0")}:00 — ${cell?.total ?? 0} events (${parts})`,
      });
    }
  }

  return cells;
}

function buildStackedData(data: ActivityBucket[]): StackedPoint[] {
  const timeMap = new Map<string, StackedPoint>();

  for (const row of data) {
    const time = row.bucket;
    if (!timeMap.has(time)) {
      timeMap.set(time, { time, notes: 0, zaps: 0, reactions: 0, profiles: 0, articles: 0, other: 0 });
    }
    const point = timeMap.get(time)!;
    const field = KIND_NAMES[row.kind] || "other";
    point[field] += row.event_count;
  }

  return Array.from(timeMap.values()).sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );
}

function buildZapSummary(data: ActivityBucket[]): ZapSummary {
  const zapRows = data.filter((r) => r.kind === 9735);
  const totalZaps = zapRows.reduce((s, r) => s + r.event_count, 0);
  const totalSats = zapRows.reduce((s, r) => s + r.total_sats, 0);
  const avgZapSize = totalZaps > 0 ? Math.round(totalSats / totalZaps) : 0;

  // Find peak hour
  const hourCounts = new Map<number, number>();
  for (const row of zapRows) {
    const h = new Date(row.bucket).getUTCHours();
    hourCounts.set(h, (hourCounts.get(h) || 0) + row.event_count);
  }

  let peakHour: number | null = null;
  let peakCount = 0;
  for (const [h, c] of hourCounts) {
    if (c > peakCount) {
      peakCount = c;
      peakHour = h;
    }
  }

  // Hourly volume for chart
  const hourlyMap = new Map<string, { zaps: number; sats: number }>();
  for (const row of zapRows) {
    const key = row.bucket;
    if (!hourlyMap.has(key)) hourlyMap.set(key, { zaps: 0, sats: 0 });
    const h = hourlyMap.get(key)!;
    h.zaps += row.event_count;
    h.sats += row.total_sats;
  }

  const hourlyVolume = Array.from(hourlyMap.entries())
    .map(([hour, v]) => ({ hour, ...v }))
    .sort((a, b) => new Date(a.hour).getTime() - new Date(b.hour).getTime());

  return { totalZaps, totalSats, avgZapSize, peakHour, hourlyVolume };
}

export function useRelayActivity(relayId: string | undefined, range: ActivityRange = "24h") {
  const hours = RANGE_HOURS[range];

  const query = useQuery({
    queryKey: ["relay-activity", relayId, range],
    queryFn: async () => {
      const since = new Date(Date.now() - hours * 3600_000).toISOString();
      const { data, error } = await supabase
        .from("relay_activity")
        .select("bucket, kind, event_count, total_sats, unique_pubkeys")
        .eq("relay_id", relayId!)
        .gte("bucket", since)
        .order("bucket", { ascending: true });

      if (error) throw error;
      return (data ?? []) as ActivityBucket[];
    },
    enabled: !!relayId,
    refetchInterval: 60_000, // refresh every minute
  });

  const raw = query.data ?? [];

  return {
    isLoading: query.isLoading,
    activityData: buildStackedData(raw),
    heatmapData: buildHeatmap(raw),
    zapData: buildZapSummary(raw),
    hasData: raw.length > 0,
  };
}
