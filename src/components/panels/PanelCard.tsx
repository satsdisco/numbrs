import { useState } from "react";
import { GripVertical, Settings, Trash2, Info, Code2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PanelRow } from "@/lib/dashboard-types";
import { METRIC_CATALOG } from "@/lib/dashboard-types";
import type { TimeRange } from "@/lib/types";
import PanelRenderer from "./PanelRenderer";
import SkeletonChart from "@/components/SkeletonChart";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  panel: PanelRow;
  globalTimeRange: TimeRange;
  globalRelayId?: string | null;
  isEditing: boolean;
  isLoading?: boolean;
  onDelete?: () => void;
  onSettings?: () => void;
}

/** Generate a human-readable description for a metric key when not in KNOWN_METRICS */
function describeMetric(key: string, statField?: string, unit?: string): string {
  const known = METRIC_CATALOG.find((m) => m.key === key);
  if (known?.description) {
    const fieldLabel = statField === "latest" ? "Most recent value"
      : statField === "avg" ? "Average value"
      : statField === "p50" ? "Median (P50) value"
      : statField === "p95" ? "95th percentile value"
      : statField === "max" ? "Maximum value"
      : statField === "min" ? "Minimum value"
      : statField === "sum" ? "Total / sum"
      : null;
    return fieldLabel ? `${fieldLabel} of: ${known.description}` : known.description;
  }

  // Generate from key structure: "plex.active_streams" → "Active streams (Plex)"
  const parts = key.split(".");
  if (parts.length >= 2) {
    const source = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    const metric = parts.slice(1).join(".").replace(/_/g, " ");
    const fieldDesc = statField === "latest" ? "Current"
      : statField === "avg" ? "Average"
      : statField === "max" ? "Max"
      : statField === "sum" ? "Total"
      : "";
    const unitStr = unit ? ` (${unit})` : "";
    return `${fieldDesc ? fieldDesc + " " : ""}${metric}${unitStr} — source: ${source}`;
  }

  return `Metric: ${key}${unit ? ` (${unit})` : ""}`;
}

export default function PanelCard({
  panel,
  globalTimeRange,
  globalRelayId,
  isEditing,
  isLoading,
  onDelete,
  onSettings,
}: Props) {
  const [hovered, setHovered] = useState(false);

  if (isLoading) {
    return <SkeletonChart />;
  }

  const metricKey = panel.config?.metric_key;
  const statField = panel.config?.stat_field;
  const unit = panel.config?.unit;
  const infoText = metricKey ? describeMetric(metricKey, statField, unit) : null;

  return (
    <div
      className="relative flex h-full w-full flex-col rounded-lg border border-border bg-card overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {isEditing && (
            <GripVertical className="drag-handle h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground hover:text-foreground" />
          )}
          <span className="truncate font-mono text-xs font-medium text-foreground">
            {panel.title}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {/* Info icon — always visible, shows metric context */}
          {infoText && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="rounded p-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-64 text-xs leading-relaxed">
                <p className="font-mono text-[10px] text-muted-foreground mb-1">{metricKey}</p>
                <p>{infoText}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Embed button — visible on hover */}
          {hovered && !isEditing && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    const url = window.location.origin + "/embed/panel/" + panel.id;
                    navigator.clipboard.writeText(url).then(() => {
                      toast.success("Embed URL copied!");
                    });
                  }}
                  className="rounded p-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  <Code2 className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Copy embed URL</TooltipContent>
            </Tooltip>
          )}

          {/* Edit controls — only in edit mode */}
          {isEditing && hovered && (
            <>
              {onSettings && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onSettings}
                      className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Settings className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">Settings</TooltipContent>
                </Tooltip>
              )}
              {onDelete && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onDelete}
                      className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">Delete</TooltipContent>
                </Tooltip>
              )}
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-2 min-h-0">
        <PanelRenderer panel={panel} globalTimeRange={globalTimeRange} globalRelayId={globalRelayId} />
      </div>
    </div>
  );
}
