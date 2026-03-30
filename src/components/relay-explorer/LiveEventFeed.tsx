import { useRef, useEffect } from "react";
import {
  User,
  MessageSquare,
  Users,
  Heart,
  Zap,
  FileText,
  ExternalLink,
  Pause,
  Play,
} from "lucide-react";
import {
  ExplorerEvent,
  KindFilter,
  KIND_FILTER_KINDS,
  KIND_LABELS,
  getContentPreview,
  relativeTime,
  truncateNpub,
  getNjumpUrl,
} from "@/lib/relay-explorer";
import { cn } from "@/lib/utils";

const KIND_ICONS: Record<number, React.ElementType> = {
  0: User,
  1: MessageSquare,
  3: Users,
  7: Heart,
  9735: Zap,
  30023: FileText,
};

const KIND_COLORS: Record<number, string> = {
  0: "text-blue-400",
  1: "text-foreground",
  3: "text-purple-400",
  7: "text-pink-400",
  9735: "text-yellow-400",
  30023: "text-green-400",
};

const FILTER_TABS: { key: KindFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "notes", label: "Notes" },
  { key: "articles", label: "Articles" },
  { key: "zaps", label: "Zaps" },
  { key: "reactions", label: "Reactions" },
  { key: "profiles", label: "Profiles" },
];

interface LiveEventFeedProps {
  events: ExplorerEvent[];
  isPaused: boolean;
  onTogglePause: () => void;
  filter: KindFilter;
  onFilterChange: (f: KindFilter) => void;
}

function EventCard({ event }: { event: ExplorerEvent }) {
  const Icon = KIND_ICONS[event.kind] ?? MessageSquare;
  const label = KIND_LABELS[event.kind] ?? `Kind ${event.kind}`;
  const color = KIND_COLORS[event.kind] ?? "text-muted-foreground";
  const preview = getContentPreview(event);
  const npub = truncateNpub(event.pubkey);
  const time = relativeTime(event.created_at);
  const njumpUrl = getNjumpUrl(event);

  return (
    <div className="group flex items-start gap-3 px-3 py-2.5 border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
      <div className={cn("mt-0.5 shrink-0", color)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={cn("font-mono text-[11px] font-medium", color)}>
            {label}
          </span>
          <span className="text-muted-foreground/60 text-[10px]">·</span>
          <span className="font-mono text-[11px] text-muted-foreground truncate">
            {npub}
          </span>
        </div>
        <p className="text-metric-sm text-muted-foreground truncate leading-snug">
          {preview}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="font-mono text-[10px] text-muted-foreground/60 tabular-nums">
          {time}
        </span>
        <a
          href={njumpUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
          aria-label="View on njump.me"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

export default function LiveEventFeed({
  events,
  isPaused,
  onTogglePause,
  filter,
  onFilterChange,
}: LiveEventFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  const filteredEvents =
    filter === "all"
      ? events
      : events.filter((e) => KIND_FILTER_KINDS[filter].includes(e.kind));

  // Auto-scroll to top when new events arrive and not paused
  useEffect(() => {
    if (!isPaused && filteredEvents.length > prevLengthRef.current) {
      scrollRef.current?.scrollTo({ top: 0 });
    }
    prevLengthRef.current = filteredEvents.length;
  }, [filteredEvents.length, isPaused]);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {FILTER_TABS.map((tab) => {
            const count =
              tab.key === "all"
                ? events.length
                : events.filter((e) =>
                    KIND_FILTER_KINDS[tab.key].includes(e.kind)
                  ).length;
            return (
              <button
                key={tab.key}
                onClick={() => onFilterChange(tab.key)}
                className={cn(
                  "shrink-0 px-2.5 py-1 rounded-md font-mono text-[11px] transition-colors",
                  filter === tab.key
                    ? "bg-primary/15 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "ml-1.5 tabular-nums",
                      filter === tab.key
                        ? "text-primary/70"
                        : "text-muted-foreground/50"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button
          onClick={onTogglePause}
          className={cn(
            "shrink-0 ml-2 flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[11px] transition-colors",
            isPaused
              ? "bg-warning/15 text-warning hover:bg-warning/25"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
          title={isPaused ? "Resume auto-scroll" : "Pause auto-scroll"}
        >
          {isPaused ? (
            <>
              <Play className="h-3 w-3" /> Resume
            </>
          ) : (
            <>
              <Pause className="h-3 w-3" /> Pause
            </>
          )}
        </button>
      </div>

      {/* Event list */}
      <div
        ref={scrollRef}
        className="h-80 overflow-y-auto overflow-x-hidden"
      >
        {filteredEvents.length === 0 ? (
          <div className="flex h-full items-center justify-center text-metric-sm text-muted-foreground">
            {events.length === 0 ? "Waiting for events…" : "No events match this filter"}
          </div>
        ) : (
          filteredEvents.map((event) => (
            <EventCard key={`${event.id}-${event.receivedAt}`} event={event} />
          ))
        )}
      </div>
    </div>
  );
}
