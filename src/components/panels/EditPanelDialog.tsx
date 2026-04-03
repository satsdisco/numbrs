import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchRelays } from "@/lib/api";
import {
  PANEL_TYPE_OPTIONS,
  METRIC_CATALOG,
  METRIC_CATEGORIES,
} from "@/lib/dashboard-types";
import type { PanelType, PanelConfig, PanelRow } from "@/lib/dashboard-types";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Settings } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  panel: PanelRow;
  onSave: (updates: { title: string; panel_type: PanelType; config: PanelConfig }) => void;
}

const STAT_FIELDS = [
  { value: "avg", label: "Average" },
  { value: "p50", label: "P50" },
  { value: "p95", label: "P95" },
  { value: "min", label: "Min" },
  { value: "max", label: "Max" },
  { value: "latest", label: "Latest" },
  { value: "count", label: "Count" },
];

export default function EditPanelDialog({ open, onClose, panel, onSave }: Props) {
  const [title, setTitle] = useState(panel.title);
  const [panelType, setPanelType] = useState<PanelType>(panel.panel_type);
  const [metricKey, setMetricKey] = useState(panel.config.metric_key || "relay_latency_connect_ms");
  const [relayId, setRelayId] = useState(panel.config.relay_id || "");
  const [statField, setStatField] = useState(panel.config.stat_field || "p50");
  const [gaugeMax, setGaugeMax] = useState(String(panel.config.gauge_max ?? ""));
  const [unit, setUnit] = useState(panel.config.unit || "");
  const [gaugeInvertColors, setGaugeInvertColors] = useState(
    panel.config.gauge_invert_colors ?? true
  );
  const [stopName, setStopName] = useState(panel.config.stop_name || "");

  // Sync state when panel changes (dialog reopens for different panel)
  useEffect(() => {
    setTitle(panel.title);
    setPanelType(panel.panel_type);
    setMetricKey(panel.config.metric_key || "relay_latency_connect_ms");
    setRelayId(panel.config.relay_id || "");
    setStatField(panel.config.stat_field || "p50");
    setGaugeMax(String(panel.config.gauge_max ?? ""));
    setUnit(panel.config.unit || "");
    setGaugeInvertColors(panel.config.gauge_invert_colors ?? true);
    setStopName(panel.config.stop_name || "");
  }, [panel]);

  const { data: relays } = useQuery({
    queryKey: ["relays"],
    queryFn: fetchRelays,
  });

  const selectedMetric = useMemo(
    () => METRIC_CATALOG.find((m) => m.key === metricKey),
    [metricKey]
  );

  // Auto-fill unit when metric changes
  useEffect(() => {
    if (selectedMetric?.unit !== undefined) {
      setUnit(selectedMetric.unit);
    }
  }, [selectedMetric]);

  const handleSave = () => {
    if (panelType === "transit") {
      onSave({
        title,
        panel_type: "transit",
        config: { stop_name: stopName || undefined },
      });
      onClose();
      return;
    }

    const isRelayScoped = selectedMetric?.relayScoped ?? false;

    const config: PanelConfig = {
      metric_key: metricKey,
      data_source: isRelayScoped ? "relay" : "global",
      relay_id: isRelayScoped ? relayId || undefined : undefined,
      unit: unit || undefined,
      stat_field:
        panelType === "stat" || panelType === "gauge"
          ? (statField as PanelConfig["stat_field"])
          : undefined,
      gauge_max:
        panelType === "gauge"
          ? gaugeMax ? Number(gaugeMax) : (selectedMetric?.defaultGaugeMax || 1000)
          : undefined,
      gauge_invert_colors:
        panelType === "gauge" ? gaugeInvertColors : undefined,
    };

    onSave({ title, panel_type: panelType, config });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Edit Panel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
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
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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
            <Label className="text-xs">Metric</Label>
            <Select value={metricKey} onValueChange={setMetricKey}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {METRIC_CATEGORIES.map((cat) => {
                  const metrics = METRIC_CATALOG.filter((m) => m.category === cat.id);
                  if (metrics.length === 0) return null;
                  return (
                    <SelectGroup key={cat.id}>
                      <SelectLabel className="text-xs font-semibold">{cat.label}</SelectLabel>
                      {metrics.map((m) => (
                        <SelectItem key={m.key} value={m.key}>
                          <span className="flex items-center gap-2">
                            {m.label}
                            {m.unit && (
                              <span className="text-[10px] text-muted-foreground">({m.unit})</span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                })}
              </SelectContent>
            </Select>
            {selectedMetric && (
              <p className="text-[11px] text-muted-foreground">{selectedMetric.description}</p>
            )}
          </div>

          {selectedMetric?.relayScoped && (
            <div className="space-y-1.5">
              <Label className="text-xs">Relay</Label>
              <Select value={relayId} onValueChange={setRelayId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select relay…" />
                </SelectTrigger>
                <SelectContent>
                  {relays?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {panelType === "transit" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Stop Name</Label>
              <Input
                value={stopName}
                onChange={(e) => setStopName(e.target.value)}
                placeholder="e.g. Vítězné náměstí, Dejvická"
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Prague PID stop name (Czech with diacritics)
              </p>
            </div>
          )}

          {(panelType === "stat" || panelType === "gauge") && (
            <div className="space-y-1.5">
              <Label className="text-xs">Aggregate</Label>
              <Select value={statField} onValueChange={setStatField}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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

          {panelType === "gauge" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Max value</Label>
              <Input
                type="number"
                value={gaugeMax}
                onChange={(e) => setGaugeMax(e.target.value)}
                className="font-mono text-sm"
                placeholder={String(selectedMetric?.defaultGaugeMax || 1000)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Unit label</Label>
            <Input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="font-mono text-sm"
              placeholder="ms, %, events/s…"
            />
          </div>

          {panelType === "gauge" && (
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <p className="text-xs font-medium">High value = bad</p>
                <p className="text-[11px] text-muted-foreground">
                  Off for uptime/score gauges where 100% is good
                </p>
              </div>
              <Switch
                checked={gaugeInvertColors}
                onCheckedChange={setGaugeInvertColors}
              />
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
