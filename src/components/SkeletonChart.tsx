import { cn } from "@/lib/utils";

const HEIGHTS = [40, 65, 55, 80, 45, 70, 60, 85, 50, 75];

interface Props {
  className?: string;
}

export default function SkeletonChart({ className }: Props) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden animate-pulse",
        className
      )}
    >
      {/* Fake title bar */}
      <div className="flex items-center border-b border-border px-3 py-2">
        <div className="h-3 w-24 rounded bg-muted" />
      </div>

      {/* Fake chart area */}
      <div className="flex flex-1 items-end gap-1 p-3">
        {HEIGHTS.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-muted"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}
