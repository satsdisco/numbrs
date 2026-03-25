interface Props {
  summary: any;
  field: string;
  unit?: string;
}

const FIELD_MAP: Record<string, { key: string; label: string }> = {
  avg: { key: "avg_val", label: "AVG" },
  p50: { key: "p50_val", label: "P50" },
  p95: { key: "p95_val", label: "P95" },
  min: { key: "min_val", label: "MIN" },
  max: { key: "max_val", label: "MAX" },
  latest: { key: "latest_val", label: "LATEST" },
  count: { key: "total_count", label: "COUNT" },
  sum: { key: "total_count", label: "TOTAL" },
};

export default function StatPanel({ summary, field, unit }: Props) {
  const mapping = FIELD_MAP[field] || FIELD_MAP.avg;
  const value = summary?.[mapping.key];

  const formatted =
    value !== null && value !== undefined
      ? Number.isInteger(Number(value))
        ? Number(value).toLocaleString()
        : Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })
      : "—";

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {mapping.label}
      </span>
      <span className="font-mono text-3xl font-bold tabular-nums text-foreground">
        {formatted}
      </span>
      {unit && (
        <span className="text-xs text-muted-foreground/90">{unit}</span>
      )}
    </div>
  );
}
