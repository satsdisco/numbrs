import { useId } from "react";
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

interface Props {
  data: TimeseriesBucket[];
  unit?: string;
}

export default function AreaPanelChart({ data, unit }: Props) {
  const gradientId = useId();
  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        No data
      </div>
    );
  }

  // Determine tick interval — show ~6-8 labels max
  const tickInterval = Math.max(1, Math.floor(data.length / 7));

  // Smart date format — shorter for many points, include date for multi-day
  const spanMs = data.length > 1
    ? new Date(data[data.length - 1].bucket).getTime() - new Date(data[0].bucket).getTime()
    : 0;
  const isMultiDay = spanMs > 86400000;
  const dateFormat = isMultiDay ? "MMM d" : "HH:mm";

  const chartData = data.map((d) => ({
    ...d,
    time: new Date(d.bucket).getTime(),
    label: format(new Date(d.bucket), dateFormat),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`areaFill-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(197, 71%, 52%)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="hsl(197, 71%, 52%)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 3.7%, 20%)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "hsl(240, 5%, 64.9%)", fontSize: 9, fontFamily: "JetBrains Mono" }}
          axisLine={false}
          tickLine={false}
          interval={tickInterval}
        />
        <YAxis
          tick={{ fill: "hsl(240, 5%, 64.9%)", fontSize: 9, fontFamily: "JetBrains Mono" }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(240, 10%, 6%)",
            border: "1px solid hsl(240, 3.7%, 15.9%)",
            borderRadius: "4px",
            fontFamily: "JetBrains Mono",
            fontSize: "11px",
          }}
          labelStyle={{ color: "hsl(240, 5%, 64.9%)" }}
          formatter={(value: number) => [
            `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ""}`,
            "avg",
          ]}
        />
        <Area
          type="monotone"
          dataKey="avg_value"
          stroke="hsl(197, 71%, 52%)"
          strokeWidth={2}
          fill={`url(#areaFill-${gradientId})`}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
