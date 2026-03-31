import { useMemo, useId } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ExplorerEvent, KIND_LABELS } from "@/lib/relay-explorer";
import { getCSSVar } from "@/contexts/ThemeContext";

interface KindDistributionChartProps {
  events: ExplorerEvent[];
}

const CHART_VARS = [
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
  "--muted-foreground",
  "--chart-1",
  "--chart-3",
] as const;

function getKindLabel(kind: number): string {
  return KIND_LABELS[kind] ?? `Kind ${kind}`;
}

export default function KindDistributionChart({
  events,
}: KindDistributionChartProps) {
  const id = useId();

  const chartData = useMemo(() => {
    const counts = new Map<number, number>();
    for (const e of events) {
      counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
    }
    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    const total = sorted.reduce((s, [, c]) => s + c, 0);
    return sorted.map(([kind, count]) => ({
      kind,
      label: getKindLabel(kind),
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  }, [events]);

  const colors = CHART_VARS.map((v) => `hsl(${getCSSVar(v)})`);
  const borderColor = `hsl(${getCSSVar("--border")})`;
  const cardColor = `hsl(${getCSSVar("--card")})`;
  const mutedFg = `hsl(${getCSSVar("--muted-foreground")})`;

  if (events.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-border bg-card text-metric-sm text-muted-foreground">
        Waiting for events…
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Donut */}
        <div className="shrink-0 h-40 w-40 mx-auto sm:mx-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="85%"
                dataKey="count"
                strokeWidth={0}
                paddingAngle={2}
              >
                {chartData.map((_, i) => (
                  <Cell key={`${id}-cell-${i}`} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: cardColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: "4px",
                  fontFamily: "JetBrains Mono",
                  fontSize: "11px",
                }}
                labelStyle={{ color: mutedFg }}
                formatter={(value: number, _name: string, entry: { payload?: { label?: string; pct?: number } }) => [
                  `${value} (${entry.payload?.pct ?? 0}%)`,
                  entry.payload?.label ?? "",
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-1.5 min-w-0">
          {chartData.map((item, i) => (
            <div key={item.kind} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: colors[i % colors.length] }}
              />
              <span className="font-mono text-[11px] text-foreground truncate flex-1">
                {item.label}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground tabular-nums shrink-0">
                {item.count}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground/60 tabular-nums w-8 text-right shrink-0">
                {item.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
