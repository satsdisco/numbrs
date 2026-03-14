interface Props {
  summary: any;
  field: string;
  max: number;
  unit?: string;
}

const FIELD_MAP: Record<string, string> = {
  avg: "avg_val",
  p50: "p50_val",
  p95: "p95_val",
  min: "min_val",
  max: "max_val",
  latest: "latest_val",
};

export default function GaugePanel({ summary, field, max, unit }: Props) {
  const key = FIELD_MAP[field] || "avg_val";
  const rawValue = summary?.[key];
  const value = rawValue !== null && rawValue !== undefined ? Number(rawValue) : null;
  const pct = value !== null ? Math.min((value / max) * 100, 100) : 0;

  // SVG arc gauge
  const radius = 60;
  const strokeWidth = 10;
  const cx = 75;
  const cy = 75;
  const startAngle = 135;
  const endAngle = 405;
  const totalAngle = endAngle - startAngle;

  function polarToCartesian(angle: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  }

  function describeArc(start: number, end: number) {
    const s = polarToCartesian(start);
    const e = polarToCartesian(end);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  }

  const valueAngle = startAngle + (pct / 100) * totalAngle;

  // Color based on percentage
  const getColor = () => {
    if (pct > 75) return "hsl(0, 62.8%, 50.6%)"; // destructive
    if (pct > 50) return "hsl(38, 92%, 50%)"; // warning
    return "hsl(142, 71%, 45.3%)"; // success
  };

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <svg viewBox="0 0 150 110" className="w-full max-w-[160px]">
        {/* Background arc */}
        <path
          d={describeArc(startAngle, endAngle)}
          fill="none"
          stroke="hsl(240, 3.7%, 15.9%)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Value arc */}
        {pct > 0 && (
          <path
            d={describeArc(startAngle, Math.min(valueAngle, endAngle))}
            fill="none"
            stroke={getColor()}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
        {/* Value text */}
        <text
          x={cx}
          y={cy + 5}
          textAnchor="middle"
          className="font-mono"
          fill="hsl(0, 0%, 98%)"
          fontSize="20"
          fontWeight="700"
        >
          {value !== null ? Math.round(value) : "—"}
        </text>
        <text
          x={cx}
          y={cy + 20}
          textAnchor="middle"
          fill="hsl(240, 5%, 64.9%)"
          fontSize="10"
        >
          {unit || ""}
        </text>
      </svg>
    </div>
  );
}
