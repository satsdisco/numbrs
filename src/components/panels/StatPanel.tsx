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
};

export default function StatPanel({ summary, field, unit }: Props) {
  const mapping = FIELD_MAP[field] || FIELD_MAP.avg;
  const value = summary?.[mapping.key];

  return (
    <div className="flex h-full flex-col items-center justify-center gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {mapping.label}
      </span>
      <span className="font-mono text-3xl font-bold tabular-nums text-foreground">
        {value !== null && value !== undefined
          ? Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })
          : "—"}
      </span>
      {unit && (
        <span className="text-xs text-muted-foreground">{unit}</span>
      )}
    </div>
  );
}
