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
import { getCSSVar } from "@/contexts/ThemeContext";

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

  const primaryColor = `hsl(${getCSSVar("--chart-1")})`;
  const borderColor = `hsl(${getCSSVar("--border")})`;
  const mutedFgColor = `hsl(${getCSSVar("--muted-foreground")})`;
  const cardColor = `hsl(${getCSSVar("--card")})`;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primaryColor} stopOpacity={0.2} />
              <stop offset="100%" stopColor={primaryColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={borderColor} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: mutedFgColor, fontSize: 11, fontFamily: "JetBrains Mono" }}
            axisLine={{ stroke: borderColor }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: mutedFgColor, fontSize: 11, fontFamily: "JetBrains Mono" }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: cardColor,
              border: `1px solid ${borderColor}`,
              borderRadius: "4px",
              fontFamily: "JetBrains Mono",
              fontSize: "12px",
            }}
            labelStyle={{ color: mutedFgColor }}
            formatter={(value: number) => [
              `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ""}`,
              "avg",
            ]}
          />
          <Area
            type="monotone"
            dataKey="avg_value"
            stroke={primaryColor}
            strokeWidth={1.5}
            fill="url(#areaFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
