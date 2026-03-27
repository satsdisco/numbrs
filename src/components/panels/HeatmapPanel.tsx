import { useState } from "react";
import { TimeseriesBucket } from "@/lib/types";
import { format } from "date-fns";

interface Props {
  data: TimeseriesBucket[];
  unit?: string;
  metricKey?: string;
}

const UPTIME_COLORS = [
  { label: "≥99%", className: "bg-green-500" },
  { label: "≥95%", className: "bg-yellow-400" },
  { label: "≥80%", className: "bg-orange-400" },
  { label: "<80%", className: "bg-red-500" },
];

const INTENSITY_COLORS = [
  "bg-purple-900/40",
  "bg-purple-700/60",
  "bg-purple-600",
  "bg-purple-500",
  "bg-purple-400",
];

function uptimeColor(value: number): string {
  if (value >= 0.99) return "bg-green-500";
  if (value >= 0.95) return "bg-yellow-400";
  if (value >= 0.80) return "bg-orange-400";
  return "bg-red-500";
}

function intensityColor(normalized: number): string {
  if (normalized < 0.2) return INTENSITY_COLORS[0];
  if (normalized < 0.4) return INTENSITY_COLORS[1];
  if (normalized < 0.6) return INTENSITY_COLORS[2];
  if (normalized < 0.8) return INTENSITY_COLORS[3];
  return INTENSITY_COLORS[4];
}

export default function HeatmapPanel({ data, unit, metricKey }: Props) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        No data
      </div>
    );
  }

  const isUptime = metricKey?.includes("uptime") || metricKey?.includes("up_pct");

  const values = data.map((d) => d.avg_value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  return (
    <div className="flex h-full flex-col gap-2 p-1">
      <div
        className="flex flex-wrap gap-0.5 overflow-hidden"
        onMouseLeave={() => setTooltip(null)}
      >
        {data.map((d) => {
          const normalized = (d.avg_value - minVal) / range;
          const colorClass = isUptime ? uptimeColor(d.avg_value) : intensityColor(normalized);
          const label = `${format(new Date(d.bucket), "MMM d HH:mm")} — ${d.avg_value.toFixed(2)}${unit ? ` ${unit}` : ""}`;
          return (
            <div
              key={d.bucket}
              className={`h-4 w-4 rounded-sm ${colorClass} cursor-default`}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip({ text: label, x: rect.left, y: rect.top });
              }}
            />
          );
        })}
      </div>

      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded border border-border bg-card px-2 py-1 font-mono text-xs text-foreground shadow"
          style={{ left: tooltip.x, top: tooltip.y - 32 }}
        >
          {tooltip.text}
        </div>
      )}

      <div className="mt-auto flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Less</span>
        {isUptime
          ? UPTIME_COLORS.map((c) => (
              <div key={c.label} className={`h-3 w-3 rounded-sm ${c.className}`} title={c.label} />
            ))
          : INTENSITY_COLORS.map((c, i) => (
              <div key={i} className={`h-3 w-3 rounded-sm ${c}`} />
            ))}
        <span>More</span>
      </div>
    </div>
  );
}
