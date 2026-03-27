import { TimeseriesBucket } from "@/lib/types";
import { format } from "date-fns";

interface Props {
  data: TimeseriesBucket[];
  unit?: string;
}

function fmt(value: number, unit?: string): string {
  return `${value.toFixed(2)}${unit ? ` ${unit}` : ""}`;
}

export default function TablePanel({ data, unit }: Props) {
  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        No data for this time range
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto rounded border border-border bg-card">
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 bg-card">
          <tr>
            {["Time", "Avg", "Min", "Max", "Count"].map((col) => (
              <th
                key={col}
                className="border-b border-border px-3 py-2 text-left font-medium text-muted-foreground"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.bucket} className={i % 2 === 0 ? "bg-muted/30" : ""}>
              <td className="px-3 py-1.5 font-mono text-xs">
                {format(new Date(row.bucket), "MMM d HH:mm")}
              </td>
              <td className="px-3 py-1.5 font-mono text-xs">{fmt(row.avg_value, unit)}</td>
              <td className="px-3 py-1.5 font-mono text-xs">{fmt(row.min_value, unit)}</td>
              <td className="px-3 py-1.5 font-mono text-xs">{fmt(row.max_value, unit)}</td>
              <td className="px-3 py-1.5 font-mono text-xs">{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
