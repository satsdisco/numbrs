import { useMemo } from "react";
import { ExplorerEvent, KIND_LABELS } from "@/lib/relay-explorer";

interface ExplorerStatsProps {
  events: ExplorerEvent[];
}

function StatItem({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <span className="text-metric-sm text-muted-foreground">{label}</span>
      <div className="mt-1">
        <span className="font-mono text-metric-lg tabular-nums text-foreground">
          {value}
        </span>
        {sub && (
          <span className="ml-1.5 text-metric-sm text-muted-foreground">
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ExplorerStats({ events }: ExplorerStatsProps) {
  const stats = useMemo(() => {
    if (events.length === 0) {
      return { authors: 0, eventsPerMin: 0, topKind: null as string | null };
    }

    const authors = new Set(events.map((e) => e.pubkey)).size;

    const now = Date.now();
    const oneMinAgo = now - 60_000;
    const recentCount = events.filter((e) => e.receivedAt >= oneMinAgo).length;

    const kindCounts = new Map<number, number>();
    for (const e of events) {
      kindCounts.set(e.kind, (kindCounts.get(e.kind) ?? 0) + 1);
    }
    const topKindEntry = Array.from(kindCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];
    const topKind = topKindEntry
      ? KIND_LABELS[topKindEntry[0]] ?? `Kind ${topKindEntry[0]}`
      : null;

    return { authors, eventsPerMin: recentCount, topKind };
  }, [events]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatItem
        label="TOTAL EVENTS"
        value={events.length.toLocaleString()}
      />
      <StatItem
        label="UNIQUE AUTHORS"
        value={stats.authors.toLocaleString()}
      />
      <StatItem
        label="EVENTS / MIN"
        value={stats.eventsPerMin.toLocaleString()}
        sub="last 60s"
      />
      <StatItem
        label="TOP KIND"
        value={stats.topKind ?? "—"}
      />
    </div>
  );
}
