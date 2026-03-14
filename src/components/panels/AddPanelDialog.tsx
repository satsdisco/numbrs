import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchRelays } from "@/lib/api";
import { PANEL_TYPE_OPTIONS, DEFAULT_PANEL_LAYOUTS } from "@/lib/dashboard-types";
import type { PanelType, PanelConfig } from "@/lib/dashboard-types";
import { RELAY_METRIC_KEYS } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (panel: {
    title: string;
    panel_type: PanelType;
    config: PanelConfig;
    layout: typeof DEFAULT_PANEL_LAYOUTS.line;
  }) => void;
}

const METRIC_OPTIONS = [
  { value: RELAY_METRIC_KEYS.CONNECT_LATENCY, label: "Connect Latency", unit: "ms" },
  { value: RELAY_METRIC_KEYS.FIRST_EVENT_LATENCY, label: "Event Latency", unit: "ms" },
  { value: RELAY_METRIC_KEYS.UP, label: "Uptime", unit: "" },
];

const STAT_FIELDS = [
  { value: "avg", label: "Average" },
  { value: "p50", label: "P50" },
  { value: "p95", label: "P95" },
  { value: "min", label: "Min" },
  { value: "max", label: "Max" },
  { value: "latest", label: "Latest" },
  { value: "count", label: "Count" },
];

export default function AddPanelDialog({ open, onClose, onAdd }: Props) {
  const [title, setTitle] = useState("New Panel");
  const [panelType, setPanelType] = useState<PanelType>("line");
  const [metricKey, setMetricKey] = useState(RELAY_METRIC_KEYS.CONNECT_LATENCY);
  const [relayId, setRelayId] = useState("");
  const [statField, setStatField] = useState("p50");

  const { data: relays } = useQuery({
    queryKey: ["relays"],
    queryFn: fetchRelays,
  });

  const metric = METRIC_OPTIONS.find((m) => m.value === metricKey);

  const handleAdd = () => {
    onAdd({
      title,
      panel_type: panelType,
      config: {
        metric_key: metricKey,
        relay_id: relayId || undefined,
        unit: metric?.unit,
        stat_field: (panelType === "stat" || panelType === "gauge") ? statField as any : undefined,
        gauge_max: panelType === "gauge" ? (metricKey === RELAY_METRIC_KEYS.UP ? 1 : 2000) : undefined,
      },
      layout: DEFAULT_PANEL_LAYOUTS[panelType],
    });
    onClose();
    // Reset
    setTitle("New Panel");
    setPanelType("line");
    setMetricKey(RELAY_METRIC_KEYS.CONNECT_LATENCY);
    setRelayId("");
    setStatField("p50");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono">Add Panel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Visualization</Label>
            <Select value={panelType} onValueChange={(v) => setPanelType(v as PanelType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PANEL_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Relay</Label>
            <Select value={relayId} onValueChange={setRelayId}>
              <SelectTrigger><SelectValue placeholder="Select relay…" /></SelectTrigger>
              <SelectContent>
                {relays?.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Metric</Label>
            <Select value={metricKey} onValueChange={setMetricKey}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {METRIC_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(panelType === "stat" || panelType === "gauge") && (
            <div className="space-y-1.5">
              <Label className="text-xs">Aggregate</Label>
              <Select value={statField} onValueChange={setStatField}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAT_FIELDS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!title}>Add Panel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
