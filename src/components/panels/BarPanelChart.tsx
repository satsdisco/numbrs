import {
  Bar,
  BarChart,
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

export default function BarPanelChart({ data, unit }: Props) {
  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        No data
      </div>
    );
  }

  const tickInterval = Math.max(1, Math.floor(data.length / 7));
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
      <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
        <Bar
          dataKey="avg_value"
          fill="hsl(263.4, 70%, 50.4%)"
          fillOpacity={0.8}
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
