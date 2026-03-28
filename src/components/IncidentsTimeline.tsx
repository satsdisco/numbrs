import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { RelayIncident } from "@/lib/api";
import { formatDuration } from "@/lib/health";
import { cn } from "@/lib/utils";

interface IncidentsTimelineProps {
  incidents: RelayIncident[];
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const diffMs = Date.now() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return "just now";
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  // >24h: absolute date
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

export default function IncidentsTimeline({ incidents }: IncidentsTimelineProps) {
  if (incidents.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <CheckCircle className="h-4 w-4 text-success shrink-0" />
        <span>No incidents in this period</span>
      </div>
    );
  }

  return (
    <motion.div
      className="relative"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Vertical timeline line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

      <div className="space-y-2">
        {incidents.map((incident, i) => (
          <motion.div
            key={`${incident.incident_start}-${i}`}
            variants={itemVariants}
            className="flex items-start gap-4 pl-6 relative"
          >
            {/* Red dot */}
            <div className="absolute left-0 top-[11px] h-[15px] w-[15px] rounded-full bg-destructive/20 border border-destructive/60 flex items-center justify-center shrink-0">
              <div className="h-[5px] w-[5px] rounded-full bg-destructive" />
            </div>

            {/* Card */}
            <div className="flex-1 rounded-lg border border-border bg-card px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-mono text-sm text-foreground tabular-nums">
                  {formatRelativeTime(incident.incident_start)}
                </span>
                <span
                  className={cn(
                    "font-mono text-sm tabular-nums text-destructive"
                  )}
                >
                  {formatDuration(incident.duration_secs)}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {incident.failed_checks} failed check{incident.failed_checks !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
