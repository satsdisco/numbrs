import { MetricStats } from "@/lib/types";

interface StatsGridProps {
  stats: MetricStats | null;
  unit?: string;
}

function StatItem({ label, value, unit }: { label: string; value: number | null; unit?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <span className="text-metric-sm text-muted-foreground">{label}</span>
      <div className="mt-1">
        <span className="font-mono text-metric-lg tabular-nums text-foreground">
          {value !== null && value !== undefined ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
        </span>
        {unit && <span className="ml-1 text-metric-sm text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

export default function StatsGrid({ stats, unit }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <StatItem label="MIN" value={stats?.min_val ?? null} unit={unit} />
      <StatItem label="AVG" value={stats?.avg_val ?? null} unit={unit} />
      <StatItem label="P50" value={stats?.p50_val ?? null} unit={unit} />
      <StatItem label="P95" value={stats?.p95_val ?? null} unit={unit} />
      <StatItem label="COUNT" value={stats?.total_count ?? null} />
    </div>
  );
}
