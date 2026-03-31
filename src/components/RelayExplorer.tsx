import { useState } from "react";
import { Radio, AlertTriangle, Loader2 } from "lucide-react";
import { KindFilter } from "@/lib/relay-explorer";
import { useRelayExplorer } from "@/components/relay-explorer/useRelayExplorer";
import Nip11Panel from "@/components/relay-explorer/Nip11Panel";
import LiveEventFeed from "@/components/relay-explorer/LiveEventFeed";
import KindDistributionChart from "@/components/relay-explorer/KindDistributionChart";
import ExplorerStats from "@/components/relay-explorer/ExplorerStats";
import { cn } from "@/lib/utils";

interface RelayExplorerProps {
  relayUrl: string;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "connecting" || status === "idle") {
    return (
      <span className="flex items-center gap-1.5 text-metric-sm text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Connecting…
      </span>
    );
  }
  if (status === "connected") {
    return (
      <span className="flex items-center gap-1.5 text-metric-sm text-success">
        <span className="h-2 w-2 rounded-full bg-success animate-live-pulse" />
        Live
      </span>
    );
  }
  if (status === "error" || status === "closed") {
    return (
      <span className="flex items-center gap-1.5 text-metric-sm text-destructive">
        <AlertTriangle className="h-3 w-3" />
        {status === "error" ? "Connection error" : "Disconnected"}
      </span>
    );
  }
  return null;
}

export default function RelayExplorer({ relayUrl }: RelayExplorerProps) {
  const { events, status, isPaused, togglePause } = useRelayExplorer(relayUrl);
  const [filter, setFilter] = useState<KindFilter>("all");

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio
            className={cn(
              "h-4 w-4",
              status === "connected" ? "text-success" : "text-muted-foreground"
            )}
          />
          <h2 className="font-mono text-sm font-medium text-foreground">
            Explorer
          </h2>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* NIP-11 Relay Info */}
      <Nip11Panel relayUrl={relayUrl} />

      {/* Stats summary */}
      <ExplorerStats events={events} />

      {/* Live event feed + kind distribution side by side on large screens */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <LiveEventFeed
            events={events}
            isPaused={isPaused}
            onTogglePause={togglePause}
            filter={filter}
            onFilterChange={setFilter}
          />
        </div>
        <div className="lg:col-span-2">
          <KindDistributionChart events={events} />
        </div>
      </div>
    </div>
  );
}
