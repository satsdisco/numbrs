import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchRelays, fetchMetricByKey } from "@/lib/api";
import {
  PANEL_TYPE_OPTIONS,
  DEFAULT_PANEL_LAYOUTS,
  METRIC_CATALOG,
  METRIC_CATEGORIES,
  PANEL_PRESETS,
} from "@/lib/dashboard-types";
import type { PanelType, PanelConfig, PanelPreset } from "@/lib/dashboard-types";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Zap, BarChart3, TrendingUp } from "lucide-react";

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
  const [tab, setTab] = useState<"presets" | "custom">("presets");
  const [presetCategory, setPresetCategory] = useState("all");

  // Custom panel state
  const [title, setTitle] = useState("New Panel");
  const [panelType, setPanelType] = useState<PanelType>("line");
  const [metricKey, setMetricKey] = useState("relay_latency_connect_ms");
  const [relayId, setRelayId] = useState("");
  const [statField, setStatField] = useState("p50");

  const { data: relays } = useQuery({
    queryKey: ["relays"],
    queryFn: fetchRelays,
  });

  const selectedMetric = useMemo(
    () => METRIC_CATALOG.find((m) => m.key === metricKey),
    [metricKey]
  );

  const filteredPresets = useMemo(
    () =>
      presetCategory === "all"
        ? PANEL_PRESETS
        : PANEL_PRESETS.filter((p) => p.category === presetCategory),
    [presetCategory]
  );

  const handleAddPreset = async (preset: PanelPreset) => {
    const catalogEntry = METRIC_CATALOG.find((m) => m.key === preset.metricKey);
    const isRelayScoped = catalogEntry?.relayScoped ?? false;

    // For relay-scoped presets, use the first relay if available
    const firstRelayId = relays?.[0]?.id;

    const config: PanelConfig = {
      metric_key: preset.metricKey,
      data_source: isRelayScoped ? "relay" : "global",
      unit: catalogEntry?.unit,
      stat_field: preset.stat_field,
      gauge_max: catalogEntry?.defaultGaugeMax,
    };

    if (isRelayScoped && firstRelayId) {
      config.relay_id = firstRelayId;
    }

    onAdd({
      title: preset.title,
      panel_type: preset.panel_type,
      config,
      layout: DEFAULT_PANEL_LAYOUTS[preset.panel_type],
    });
    onClose();
  };

  const handleAddCustom = () => {
    const isRelayScoped = selectedMetric?.relayScoped ?? false;

    const config: PanelConfig = {
      metric_key: metricKey,
      data_source: isRelayScoped ? "relay" : "global",
      relay_id: isRelayScoped ? relayId || undefined : undefined,
      unit: selectedMetric?.unit,
      stat_field:
        panelType === "stat" || panelType === "gauge"
          ? (statField as any)
          : undefined,
      gauge_max:
        panelType === "gauge"
          ? selectedMetric?.defaultGaugeMax || 1000
          : undefined,
    };

    onAdd({
      title,
      panel_type: panelType,
      config,
      layout: DEFAULT_PANEL_LAYOUTS[panelType],
    });
    onClose();
    // Reset
    setTitle("New Panel");
    setPanelType("line");
    setMetricKey("relay_latency_connect_ms");
    setRelayId("");
    setStatField("p50");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Add Panel
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="presets" className="gap-1.5 text-xs">
              <Zap className="h-3.5 w-3.5" /> Quick Add
            </TabsTrigger>
            <TabsTrigger value="custom" className="gap-1.5 text-xs">
              <TrendingUp className="h-3.5 w-3.5" /> Custom
            </TabsTrigger>
          </TabsList>

          {/* ─── Presets Tab ─── */}
          <TabsContent value="presets" className="space-y-3 mt-3">
            <div className="flex flex-wrap gap-1.5">
              <Badge
                variant={presetCategory === "all" ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setPresetCategory("all")}
              >
                All
              </Badge>
              {METRIC_CATEGORIES.map((cat) => (
                <Badge
                  key={cat.id}
                  variant={presetCategory === cat.id ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => setPresetCategory(cat.id)}
                >
                  {cat.label}
                </Badge>
              ))}
            </div>

            <div className="grid gap-2 max-h-[340px] overflow-y-auto pr-1">
              {filteredPresets.map((preset) => {
                const cat = METRIC_CATEGORIES.find(
                  (c) => c.id === preset.category
                );
                return (
                  <button
                    key={preset.title}
                    onClick={() => handleAddPreset(preset)}
                    className="group flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-foreground">
                          {preset.title}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {preset.panel_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {preset.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {cat?.label}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </TabsContent>

          {/* ─── Custom Tab ─── */}
          <TabsContent value="custom" className="space-y-4 mt-3">
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
              <Select
                value={panelType}
                onValueChange={(v) => setPanelType(v as PanelType)}
              >
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
                    const metrics = METRIC_CATALOG.filter(
                      (m) => m.category === cat.id
                    );
                    if (metrics.length === 0) return null;
                    return (
                      <SelectGroup key={cat.id}>
                        <SelectLabel className="text-xs font-semibold">
                          {cat.label}
                        </SelectLabel>
                        {metrics.map((m) => (
                          <SelectItem key={m.key} value={m.key}>
                            <span className="flex items-center gap-2">
                              {m.label}
                              {m.unit && (
                                <span className="text-[10px] text-muted-foreground">
                                  ({m.unit})
                                </span>
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
                <p className="text-[11px] text-muted-foreground">
                  {selectedMetric.description}
                </p>
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

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleAddCustom} disabled={!title}>
                Add Panel
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
