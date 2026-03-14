import { useState } from "react";
import { GripVertical, Settings, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PanelRow } from "@/lib/dashboard-types";
import type { TimeRange } from "@/lib/types";
import PanelRenderer from "./PanelRenderer";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  panel: PanelRow;
  globalTimeRange: TimeRange;
  isEditing: boolean;
  onDelete?: () => void;
  onSettings?: () => void;
}

export default function PanelCard({
  panel,
  globalTimeRange,
  isEditing,
  onDelete,
  onSettings,
}: Props) {
  const [hovered, setHovered] = useState(false);

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

        {isEditing && hovered && (
          <div className="flex items-center gap-1 shrink-0">
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
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 p-2 min-h-0">
        <PanelRenderer panel={panel} globalTimeRange={globalTimeRange} />
      </div>
    </div>
  );
}
