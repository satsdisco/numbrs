import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TimeseriesBucket } from "@/lib/types";
import { format } from "date-fns";

interface TimeseriesChartProps {
  data: TimeseriesBucket[];
  unit?: string;
}

export default function TimeseriesChart({ data, unit }: TimeseriesChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-card text-metric-sm text-muted-foreground">
        No data for this time range
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    time: new Date(d.bucket).getTime(),
    label: format(new Date(d.bucket), "MMM d HH:mm"),
  }));

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(263.4, 70%, 50.4%)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="hsl(263.4, 70%, 50.4%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 3.7%, 15.9%)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "hsl(240, 5%, 64.9%)", fontSize: 11, fontFamily: "JetBrains Mono" }}
            axisLine={{ stroke: "hsl(240, 3.7%, 15.9%)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "hsl(240, 5%, 64.9%)", fontSize: 11, fontFamily: "JetBrains Mono" }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(240, 10%, 6%)",
              border: "1px solid hsl(240, 3.7%, 15.9%)",
              borderRadius: "4px",
              fontFamily: "JetBrains Mono",
              fontSize: "12px",
            }}
            labelStyle={{ color: "hsl(240, 5%, 64.9%)" }}
            formatter={(value: number) => [
              `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ""}`,
              "avg",
            ]}
          />
          <Area
            type="monotone"
            dataKey="avg_value"
            stroke="hsl(263.4, 70%, 50.4%)"
            strokeWidth={1.5}
            fill="url(#areaFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
