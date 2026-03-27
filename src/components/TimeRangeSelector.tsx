import { TimeRange } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

const ranges: TimeRange[] = ["live", "1h", "6h", "24h", "7d", "30d"];

export default function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-background p-0.5">
      {ranges.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={cn(
            "flex items-center gap-1 rounded-sm px-3 py-1 font-mono text-metric-sm font-medium transition-all duration-150 ease-smooth",
            value === r
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {r === "live" && (
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                value === "live" ? "bg-primary-foreground animate-live-pulse" : "bg-success animate-live-pulse"
              )}
            />
          )}
          {r === "live" ? "Live" : r}
        </button>
      ))}
    </div>
  );
}
