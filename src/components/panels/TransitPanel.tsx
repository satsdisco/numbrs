import { useQuery } from "@tanstack/react-query";
import { fetchDepartures, type Departure } from "@/lib/golemio";
import type { PanelConfig } from "@/lib/dashboard-types";

// route.type constants from Golemio
const TYPE_TRAM = 0;
const TYPE_METRO = 1;
const TYPE_BUS = 3;

function routeBadgeClass(departure: Departure): string {
  const { type, short_name } = departure.route;
  if (type === TYPE_TRAM) return "bg-green-700 text-white";
  if (type === TYPE_METRO) {
    const line = short_name.toUpperCase();
    if (line === "A") return "bg-green-600 text-white";
    if (line === "B") return "bg-yellow-400 text-black";
    if (line === "C") return "bg-red-600 text-white";
    return "bg-slate-600 text-white";
  }
  if (type === TYPE_BUS) return "bg-blue-600 text-white";
  return "bg-slate-600 text-white";
}

function minutesLabel(minutes: number): string {
  if (minutes <= 0) return "now";
  return String(minutes);
}

function minutesSuffix(minutes: number): string {
  if (minutes <= 0) return "";
  return " min";
}

interface TransitPanelProps {
  config: PanelConfig;
}

export default function TransitPanel({ config }: TransitPanelProps) {
  const stopName = config.stop_name;

  const { data: departures, isLoading, error } = useQuery({
    queryKey: ["transit-departures", stopName],
    queryFn: () => fetchDepartures(stopName!, 30, 12),
    enabled: !!stopName,
    refetchInterval: 30_000,
  });

  if (!stopName) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <span className="text-2xl">🚇</span>
        <p className="text-xs text-muted-foreground">No stop configured</p>
        <p className="text-[11px] text-muted-foreground/70">Edit this panel to set a stop name</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-1.5 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex animate-pulse items-center gap-2 rounded-md bg-muted/40 px-2 py-2"
          >
            <div className="h-5 w-8 rounded bg-muted" />
            <div className="h-3 flex-1 rounded bg-muted" />
            <div className="h-5 w-8 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-destructive">Failed to load departures</p>
      </div>
    );
  }

  if (!departures || departures.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-muted-foreground">No departures found</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-0.5 overflow-hidden">
      {/* Stop header */}
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {stopName}
        </span>
        <span className="ml-auto inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
      </div>

      {/* Departure rows */}
      <div className="flex flex-col gap-0.5 overflow-y-auto">
        {departures.map((dep, i) => {
          const mins = dep.departure_timestamp.minutes;
          const isCanceled = dep.trip.is_canceled;
          const isDelayed = dep.delay.is_available && dep.delay.minutes > 0;
          const isUrgent = mins <= 2 && !isCanceled;

          return (
            <div
              key={i}
              className={`flex items-center gap-2 rounded px-2 py-1.5 transition-colors ${
                isCanceled
                  ? "opacity-40"
                  : isUrgent
                  ? "bg-primary/10"
                  : "hover:bg-muted/30"
              }`}
            >
              {/* Route badge */}
              <span
                className={`inline-flex min-w-[2rem] items-center justify-center rounded px-1.5 py-0.5 font-mono text-[11px] font-bold leading-none ${routeBadgeClass(dep)}`}
              >
                {dep.route.short_name}
              </span>

              {/* Headsign */}
              <span
                className={`flex-1 truncate text-xs ${
                  isCanceled ? "line-through text-muted-foreground" : "text-foreground"
                }`}
              >
                {dep.trip.headsign}
              </span>

              {/* Delay indicator */}
              {dep.delay.is_available && (
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    isDelayed ? "bg-red-500" : "bg-green-500"
                  }`}
                  title={isDelayed ? `+${dep.delay.minutes} min delay` : "On time"}
                />
              )}

              {/* Countdown */}
              <span
                className={`shrink-0 font-mono text-xs tabular-nums ${
                  isCanceled
                    ? "text-muted-foreground"
                    : isUrgent
                    ? "font-bold text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {isCanceled ? (
                  "—"
                ) : (
                  <>
                    {minutesLabel(mins)}
                    <span className="text-[10px]">{minutesSuffix(mins)}</span>
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
