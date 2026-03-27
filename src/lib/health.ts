/**
 * Relay health scoring and derived metric utilities.
 * All functions are pure and reusable — tweak weights here to adjust scoring.
 */

export interface RelayHealthRow {
  connect_p50: number | null;
  connect_p95: number | null;
  connect_avg: number | null;
  connect_stddev: number | null;
  event_p50: number | null;
  event_p95: number | null;
  uptime_pct: number | null;
  total_checks: number;
  failed_probes: number;
  failure_rate: number;
  downtime_incidents: number;
  longest_downtime_secs: number;
  prev_connect_p50: number | null;
}

// ─── Health Score ──────────────────────────────────────────────────────────────

const WEIGHTS = {
  uptime: 0.40,
  latency: 0.30,
  failures: 0.30,
} as const;

/** Max p95 (ms) that maps to full latency penalty. */
const LATENCY_CEILING = 2000;

/**
 * Composite health score 0–100.
 *   100 = perfect uptime, low latency, no failures
 *   <60 = red, 60–80 = yellow, >80 = green
 */
export function computeHealthScore(h: RelayHealthRow): number {
  let score = 100;

  // Uptime penalty: each 1% of downtime costs 0.4 points
  const uptimePct = h.uptime_pct ?? 0;
  score -= (100 - uptimePct) * WEIGHTS.uptime;

  // Latency penalty: linearly scaled from 0→LATENCY_CEILING ms
  if (h.connect_p95 !== null) {
    const ratio = Math.min(h.connect_p95 / LATENCY_CEILING, 1);
    score -= ratio * 100 * WEIGHTS.latency;
  }

  // Failure-rate penalty
  score -= h.failure_rate * WEIGHTS.failures;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export type ScoreColor = "success" | "warning" | "destructive";

export function scoreColor(score: number): ScoreColor {
  if (score > 80) return "success";
  if (score >= 60) return "warning";
  return "destructive";
}

// ─── Volatility ────────────────────────────────────────────────────────────────

export type Volatility = "low" | "medium" | "high" | "unknown";

/**
 * Coefficient of variation (stddev / mean) mapped to a label.
 *   <20% → low, 20–50% → medium, >50% → high
 */
export function getVolatility(
  stddev: number | null,
  avg: number | null
): Volatility {
  if (stddev === null || avg === null || avg === 0) return "unknown";
  const cv = stddev / avg;
  if (cv < 0.2) return "low";
  if (cv < 0.5) return "medium";
  return "high";
}

export const VOLATILITY_COLORS: Record<Volatility, string> = {
  low: "text-success",
  medium: "text-warning",
  high: "text-destructive",
  unknown: "text-muted-foreground",
};

// ─── Trend ─────────────────────────────────────────────────────────────────────

export type Trend = "improving" | "stable" | "degrading" | "unknown";

/**
 * Compare current p50 with previous-window p50.
 *   >10% decrease → improving, >10% increase → degrading, else stable
 */
export function getTrend(
  currentP50: number | null,
  prevP50: number | null
): Trend {
  if (currentP50 === null || prevP50 === null || prevP50 === 0)
    return "unknown";
  const change = (currentP50 - prevP50) / prevP50;
  if (change < -0.1) return "improving";
  if (change > 0.1) return "degrading";
  return "stable";
}

export const TREND_ICONS: Record<Trend, string> = {
  improving: "↗",
  stable: "→",
  degrading: "↘",
  unknown: "—",
};

export const TREND_COLORS: Record<Trend, string> = {
  improving: "text-success",
  stable: "text-muted-foreground",
  degrading: "text-destructive",
  unknown: "text-muted-foreground",
};

// ─── Formatting helpers ────────────────────────────────────────────────────────

export function formatMs(val: number | null | undefined): string {
  if (val === null || val === undefined) return "—";
  return `${Math.round(val)}ms`;
}

export function formatPct(val: number | null | undefined): string {
  if (val === null || val === undefined) return "—";
  return `${val.toFixed(1)}%`;
}

export function formatDuration(secs: number): string {
  if (secs === 0) return "—";
  if (secs < 60) return `${Math.round(secs)}s`;
  if (secs < 3600) return `${Math.round(secs / 60)}m`;
  return `${(secs / 3600).toFixed(1)}h`;
}

export function isUp(h: RelayHealthRow): boolean | null {
  if (h.total_checks === 0) return null;
  // Use failure_rate as proxy: if last check was in current window
  // For more accuracy we'd need the latest datapoint, but uptime_pct works
  return h.uptime_pct !== null && h.uptime_pct > 50;
}
