import { useState, useEffect } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchAllPublicRelays, fetchRelayHealth } from "@/lib/api";
import type { RelayRow } from "@/lib/types";
import type { RelayHealthRow } from "@/lib/health";
import { formatMs, formatPct, computeHealthScore } from "@/lib/health";
import { useAuth } from "@/hooks/useAuth";
import { ChevronUp, ChevronDown } from "lucide-react";

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

function scoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function rankEmoji(rank: number): string | number {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank;
}

// ─── Sort helpers ────────────────────────────────────────────────────────────────

type SortCol = "score" | "uptime" | "latency" | "last_probe";
type SortDir = "asc" | "desc";

// ─── Skeleton row ───────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-border/50 animate-pulse">
      {[48, 160, 220, 70, 80, 100, 100, 100].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 rounded bg-muted" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Sortable header ─────────────────────────────────────────────────────────────

function SortTh({
  col,
  label,
  active,
  dir,
  onClick,
  className = "",
}: {
  col: SortCol;
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: (col: SortCol) => void;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 font-mono text-xs font-medium cursor-pointer select-none group ${className}`}
      onClick={() => onClick(col)}
    >
      <span
        className={`inline-flex items-center gap-1 transition-colors ${
          active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
        }`}
      >
        {label}
        {active ? (
          dir === "desc" ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronUp className="h-3 w-3" />
          )
        ) : (
          <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-40" />
        )}
      </span>
    </th>
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
  const [sortCol, setSortCol] = useState<SortCol>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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

  // Merge rows
  const baseRows: LeaderboardRow[] = (relays ?? []).map((relay, i) => ({
    relay,
    health: (healthQueries[i]?.data as RelayHealthRow | null | undefined) ?? null,
  }));

  // Sort
  function handleSort(col: SortCol) {
    if (col === sortCol) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  }

  const rows = [...baseRows].sort((a, b) => {
    let va: number, vb: number;
    switch (sortCol) {
      case "score":
        va = a.health ? computeHealthScore(a.health) : -1;
        vb = b.health ? computeHealthScore(b.health) : -1;
        break;
      case "uptime":
        va = a.health?.uptime_pct ?? -1;
        vb = b.health?.uptime_pct ?? -1;
        break;
      case "latency":
        // Lower is better — treat null as worst (Infinity)
        va = a.health?.connect_p50 ?? Infinity;
        vb = b.health?.connect_p50 ?? Infinity;
        // For latency, desc = worst first, asc = best first — flip sign vs default
        return sortDir === "desc" ? vb - va : va - vb;
      case "last_probe":
        va = a.relay.updated_at ? new Date(a.relay.updated_at).getTime() : 0;
        vb = b.relay.updated_at ? new Date(b.relay.updated_at).getTime() : 0;
        break;
      default:
        va = vb = 0;
    }
    return sortDir === "desc" ? vb - va : va - vb;
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

  const sortProps = (col: SortCol) => ({
    col,
    active: sortCol === col,
    dir: sortDir,
    onClick: handleSort,
  });

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
            24h window — click column headers to sort
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
                  <SortTh
                    {...sortProps("score")}
                    label="Score"
                    className="text-right"
                  />
                  <SortTh
                    {...sortProps("uptime")}
                    label="Uptime %"
                    className="text-right"
                  />
                  <th className="px-4 py-3 text-right font-mono text-xs text-muted-foreground font-medium">
                    Avg Latency
                  </th>
                  <SortTh
                    {...sortProps("latency")}
                    label="P50 Latency"
                    className="text-right"
                  />
                  <SortTh
                    {...sortProps("last_probe")}
                    label="Last Probe"
                    className="text-right"
                  />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
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
                    const p50Lat = health?.connect_p50 ?? null;
                    const score = health ? computeHealthScore(health) : null;

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
                        <td className={`px-4 py-3 text-right font-mono text-sm font-medium ${scoreColor(score)}`}>
                          {score !== null ? score : "—"}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono text-sm font-medium ${uptimeColor(uptime)}`}>
                          {formatPct(uptime)}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono text-sm ${latencyColor(avgLat)}`}>
                          {formatMs(avgLat)}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono text-sm ${latencyColor(p50Lat)}`}>
                          {formatMs(p50Lat)}
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
