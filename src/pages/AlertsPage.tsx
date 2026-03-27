import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAlertRules,
  createAlertRule,
  deleteAlertRule,
  updateAlertRule,
  fetchAlertEvents,
  acknowledgeAlertEvent,
  ALERT_METRICS,
  CONDITION_LABELS,
  type AlertRule,
  type AlertEvent,
} from "@/lib/alerts-api";
import { fetchRelays } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Bell, Plus, Trash2, Check, AlertTriangle, Clock, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

export default function AlertsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ["alert-rules"],
    queryFn: fetchAlertRules,
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["alert-events"],
    queryFn: () => fetchAlertEvents(100),
  });

  const { data: relays } = useQuery({
    queryKey: ["relays"],
    queryFn: fetchRelays,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAlertRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
      toast.success("Alert rule deleted");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateAlertRule(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alert-rules"] }),
  });

  const ackMutation = useMutation({
    mutationFn: acknowledgeAlertEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-events"] });
    },
  });

  const unacknowledgedCount = events?.filter((e) => !e.acknowledged).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-semibold text-foreground">Alerts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Get notified when relay metrics cross your thresholds
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Alert Rule
        </Button>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" /> Rules
            {rules?.length ? (
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-mono">
                {rules.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" /> History
            {unacknowledgedCount > 0 && (
              <span className="ml-1 rounded-full bg-destructive/20 text-destructive px-1.5 py-0.5 text-[10px] font-mono font-bold">
                {unacknowledgedCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-4">
          {rulesLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 animate-pulse bg-muted rounded" />
                    <div className="h-3 w-72 animate-pulse bg-muted rounded" />
                  </div>
                  <div className="h-6 w-10 animate-pulse bg-muted rounded-full" />
                  <div className="h-4 w-4 animate-pulse bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : !rules || rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 rounded-full bg-muted p-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-mono text-lg font-semibold text-foreground mb-2">No alert rules</h3>
              <p className="text-metric-sm text-muted-foreground mb-6 max-w-sm">
                Set up alerts to get notified when relays go down or metrics cross thresholds
              </p>
              <Button onClick={() => setShowCreate(true)} className="gap-1.5">
                <Plus className="h-4 w-4" /> Create Alert
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule, i) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  relayName={relays?.find((r) => r.id === rule.relay_id)?.name}
                  index={i}
                  onToggle={(active) =>
                    toggleMutation.mutate({ id: rule.id, is_active: active })
                  }
                  onDelete={() => setDeleteTarget(rule.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {eventsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-card animate-pulse border border-border" />
              ))}
            </div>
          ) : !events || events.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/50 py-12 text-center">
              <Check className="h-8 w-8 text-success mx-auto mb-3" />
              <p className="text-muted-foreground">No alerts triggered yet</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Time</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Metric</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Condition</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">Value</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">
                        {formatDistanceToNow(new Date(event.triggered_at), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs">
                        {ALERT_METRICS.find((m) => m.key === event.metric_key)?.label ?? event.metric_key}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        <span className="text-muted-foreground">
                          {CONDITION_LABELS[event.condition] ?? event.condition}{" "}
                        </span>
                        <span className="font-mono font-medium">{event.threshold}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono text-xs font-medium text-destructive">
                        {event.value.toFixed(1)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {event.acknowledged ? (
                          <span className="text-[10px] text-muted-foreground">Ack</span>
                        ) : (
                          <button
                            onClick={() => ackMutation.mutate(event.id)}
                            className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors"
                          >
                            Acknowledge
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this alert rule?</AlertDialogTitle>
            <AlertDialogDescription>
              It will stop monitoring and all history will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget);
                  setDeleteTarget(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateAlertDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        relays={relays ?? []}
        userId={user?.id ?? ""}
      />
    </div>
  );
}

function RuleCard({
  rule,
  relayName,
  index,
  onToggle,
  onDelete,
}: {
  rule: AlertRule;
  relayName?: string;
  index: number;
  onToggle: (active: boolean) => void;
  onDelete: () => void;
}) {
  const metric = ALERT_METRICS.find((m) => m.key === rule.metric_key);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className={cn(
        "flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all",
        !rule.is_active && "opacity-50"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="font-mono text-sm font-medium text-foreground">{rule.name}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {relayName && <span className="text-primary">{relayName}</span>}
          {relayName && " · "}
          {metric?.label ?? rule.metric_key}{" "}
          <span className="text-warning">{CONDITION_LABELS[rule.condition]}</span>{" "}
          <span className="font-mono font-medium">{rule.threshold}{metric?.unit}</span>
        </div>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Switch
              checked={rule.is_active}
              onCheckedChange={onToggle}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>Toggle alert on/off</TooltipContent>
      </Tooltip>
      <button
        onClick={onDelete}
        className="text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

function CreateAlertDialog({
  open,
  onClose,
  relays,
  userId,
}: {
  open: boolean;
  onClose: () => void;
  relays: { id: string; name: string }[];
  userId: string;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [metricKey, setMetricKey] = useState("relay_latency_connect_ms");
  const [condition, setCondition] = useState<"gt" | "lt">("gt");
  const [threshold, setThreshold] = useState("");
  const [relayId, setRelayId] = useState<string>("");

  const metric = ALERT_METRICS.find((m) => m.key === metricKey);

  const createMutation = useMutation({
    mutationFn: () =>
      createAlertRule({
        user_id: userId,
        relay_id: relayId || null,
        metric_key: metricKey,
        condition,
        threshold: parseFloat(threshold),
        name: name || `${metric?.label} alert`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
      toast.success("Alert rule created");
      onClose();
      setName("");
      setThreshold("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono">New Alert Rule</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Name</label>
            <Input
              placeholder="e.g. High latency warning"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Metric</label>
            <Select value={metricKey} onValueChange={setMetricKey}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALERT_METRICS.map((m) => (
                  <SelectItem key={m.key} value={m.key}>
                    {m.label} {m.unit && `(${m.unit})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {metric?.relayScoped && relays.length > 0 && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Relay (optional — leave blank for all relays)</label>
              <Select value={relayId} onValueChange={setRelayId}>
                <SelectTrigger>
                  <SelectValue placeholder="All relays" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">All relays</SelectItem>
                  {relays.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Condition</label>
              <Select value={condition} onValueChange={(v) => setCondition(v as "gt" | "lt")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gt">Exceeds</SelectItem>
                  <SelectItem value="lt">Drops below</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Threshold {metric?.unit && `(${metric.unit})`}
              </label>
              <Input
                type="number"
                placeholder="500"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground flex gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Alert rules are checked after each relay probe (every 5 minutes). When the condition is met, an alert event is recorded.
            </span>
          </div>

          <Button
            className="w-full"
            disabled={!threshold || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? "Creating..." : "Create Alert Rule"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
