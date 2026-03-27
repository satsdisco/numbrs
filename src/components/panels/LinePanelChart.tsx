import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { TimeseriesBucket } from "@/lib/types";
import { format } from "date-fns";
import { getCSSVar } from "@/contexts/ThemeContext";

interface Annotation {
  id: string;
  label: string;
  timestamp: string;
  color?: string;
}

interface Props {
  data: TimeseriesBucket[];
  unit?: string;
  annotations?: Annotation[];
}

export default function LinePanelChart({ data, unit, annotations }: Props) {
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

  const lineColor = `hsl(${getCSSVar("--chart-1")})`;
  const borderColor = `hsl(${getCSSVar("--border")})`;
  const mutedFgColor = `hsl(${getCSSVar("--muted-foreground")})`;
  const cardColor = `hsl(${getCSSVar("--card")})`;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={borderColor} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: mutedFgColor, fontSize: 9, fontFamily: "JetBrains Mono" }}
          axisLine={false}
          tickLine={false}
          interval={tickInterval}
        />
        <YAxis
          tick={{ fill: mutedFgColor, fontSize: 9, fontFamily: "JetBrains Mono" }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: cardColor,
            border: `1px solid ${borderColor}`,
            borderRadius: "4px",
            fontFamily: "JetBrains Mono",
            fontSize: "11px",
          }}
          labelStyle={{ color: mutedFgColor }}
          formatter={(value: number) => [
            `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ""}`,
            "avg",
          ]}
        />
        <Line
          type="monotone"
          dataKey="avg_value"
          stroke={lineColor}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: lineColor }}
        />
        {annotations?.map((ann) => {
          const ts = new Date(ann.timestamp).getTime();
          const nearest = chartData.reduce((prev, cur) =>
            Math.abs(cur.time - ts) < Math.abs(prev.time - ts) ? cur : prev
          );
          const annotationColor = ann.color ?? lineColor;
          return (
            <ReferenceLine
              key={ann.id}
              x={nearest.label}
              stroke={annotationColor}
              strokeDasharray="4 2"
              label={{
                value: ann.label.slice(0, 20),
                position: "insideTopRight",
                fill: annotationColor,
                fontSize: 9,
                fontFamily: "JetBrains Mono",
              }}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
