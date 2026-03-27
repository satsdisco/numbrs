import { useState, useEffect } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchAllPublicRelays, fetchRelayHealth } from "@/lib/api";
import type { RelayRow } from "@/lib/types";
import type { RelayHealthRow } from "@/lib/health";
import { formatMs, formatPct } from "@/lib/health";
import { useAuth } from "@/hooks/useAuth";

// ─── Colour helpers ─────────────────────────────────────────────────────────────

function uptimeColor(pct: number | null): string {
  if (pct === null) return "text-muted-foreground";
  if (pct >= 99) return "text-green-400";
  if (pct >= 95) return "text-yellow-400";
  if (pct >= 80) return "text-orange-400";
  return "text-red-400";
}

function latencyColor(ms: number | null): string {
  if (ms === null) return "text-muted-foreground";
  if (ms < 100) return "text-green-400";
  if (ms < 300) return "text-yellow-400";
  if (ms < 1000) return "text-orange-400";
  return "text-red-400";
}

function rankEmoji(rank: number): string | number {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank;
}

// ─── Skeleton row ───────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-border/50 animate-pulse">
      {[48, 160, 220, 80, 100, 100, 100].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 rounded bg-muted" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

interface LeaderboardRow {
  relay: RelayRow;
  health: RelayHealthRow | null;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [now, setNow] = useState(Date.now());

  // Tick every minute to update "last updated" display
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const {
    data: relays,
    isLoading: relaysLoading,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: fetchAllPublicRelays,
    refetchInterval: 60 * 1000,
  });

  const healthQueries = useQueries({
    queries: (relays ?? []).map((relay) => ({
      queryKey: ["leaderboard-health", relay.id],
      queryFn: () => fetchRelayHealth(relay.id, "24h"),
      enabled: !!relays,
    })),
  });

  const healthLoading = healthQueries.some((q) => q.isLoading);
  const isLoading = relaysLoading || (!!relays?.length && healthLoading);

  // Merge and sort by uptime descending
  const rows: LeaderboardRow[] = (relays ?? [])
    .map((relay, i) => ({
      relay,
      health: (healthQueries[i]?.data as RelayHealthRow | null | undefined) ?? null,
    }))
    .sort((a, b) => {
      const ua = a.health?.uptime_pct ?? -1;
      const ub = b.health?.uptime_pct ?? -1;
      return ub - ua;
    });

  const minutesAgo = dataUpdatedAt
    ? Math.max(0, Math.floor((now - dataUpdatedAt) / 60_000))
    : null;
  const lastUpdatedLabel =
    minutesAgo === null
      ? "—"
      : minutesAgo === 0
      ? "just now"
      : `${minutesAgo}m ago`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-sidebar">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-start justify-between gap-4">
          <div>
            {user && (
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono mb-2"
              >
                ← Back to Dashboard
              </Link>
            )}
            <h1 className="font-mono text-2xl font-bold text-foreground tracking-tight">
              ⚡ Relay Leaderboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Community-ranked Nostr relays by uptime and performance
            </p>
          </div>
          <a
            href="/"
            className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono mt-1"
          >
            Powered by{" "}
            <span className="text-foreground font-semibold">numbrs</span>
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-6 py-6">
        {/* Meta */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-mono">
            Showing 24h window — sorted by uptime
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            Last updated: {lastUpdatedLabel}
          </p>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-mono text-xs text-muted-foreground font-medium w-14">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-xs text-muted-foreground font-medium">
                    Relay
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-xs text-muted-foreground font-medium">
                    URL
                  </th>
                  <th className="px-4 py-3 text-right font-mono text-xs text-muted-foreground font-medium">
                    Uptime %
                  </th>
                  <th className="px-4 py-3 text-right font-mono text-xs text-muted-foreground font-medium">
                    Avg Latency
                  </th>
                  <th className="px-4 py-3 text-right font-mono text-xs text-muted-foreground font-medium">
                    P95 Latency
                  </th>
                  <th className="px-4 py-3 text-right font-mono text-xs text-muted-foreground font-medium">
                    Last Probe
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-sm text-muted-foreground"
                    >
                      No relays in the leaderboard yet.
                    </td>
                  </tr>
                ) : (
                  rows.map(({ relay, health }, idx) => {
                    const rank = idx + 1;
                    const uptime = health?.uptime_pct ?? null;
                    const avgLat = health?.connect_avg ?? null;
                    const p95Lat = health?.connect_p95 ?? null;

                    // Last probe: relative time from relay's updated_at
                    const lastSeen = (() => {
                      if (!relay.updated_at) return "—";
                      const diffMs = now - new Date(relay.updated_at).getTime();
                      const diffMins = Math.floor(diffMs / 60_000);
                      if (diffMins < 1) return "just now";
                      if (diffMins < 60) return `${diffMins}m ago`;
                      const diffHrs = Math.floor(diffMins / 60);
                      if (diffHrs < 24) return `${diffHrs}h ago`;
                      return `${Math.floor(diffHrs / 24)}d ago`;
                    })();

                    return (
                      <tr
                        key={relay.id}
                        className="border-b border-border/40 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-sm font-medium text-center">
                          {typeof rankEmoji(rank) === "string" ? (
                            <span className="text-base">{rankEmoji(rank)}</span>
                          ) : (
                            <span className="text-muted-foreground">
                              #{rank}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-foreground">
                            {relay.name}
                          </span>
                          {relay.region && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {relay.region}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px] block">
                            {relay.url}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-mono text-sm font-medium ${uptimeColor(uptime)}`}>
                          {formatPct(uptime)}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono text-sm ${latencyColor(avgLat)}`}>
                          {formatMs(avgLat)}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono text-sm ${latencyColor(p95Lat)}`}>
                          {formatMs(p95Lat)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                          {lastSeen}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
