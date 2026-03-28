import { useState } from "react";
import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchRelays, deleteRelay, updateRelay, fetchRelayHealth } from "@/lib/api";
import type { RelayRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, ExternalLink, Radio, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";

// ─── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ isUp }: { isUp: boolean | null }) {
  if (isUp === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
        —
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        isUp ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isUp ? "bg-success animate-live-pulse" : "bg-destructive"
        )}
      />
      {isUp ? "UP" : "DOWN"}
    </span>
  );
}

// ─── Edit dialog ───────────────────────────────────────────────────────────────

function EditRelayDialog({
  relay,
  onClose,
}: {
  relay: RelayRow;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(relay.name);
  const [url, setUrl] = useState(relay.url);
  const [region, setRegion] = useState(relay.region ?? "");

  const updateMutation = useMutation({
    mutationFn: () =>
      updateRelay(relay.id, {
        name: name.trim(),
        url: url.trim(),
        region: region.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["relays"] });
      toast.success("Relay updated");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono">Edit Relay</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Relay"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">URL</label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="wss://relay.example.com"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Region</label>
            <Input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. us-east"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={!name.trim() || !url.trim() || updateMutation.isPending}
              onClick={() => updateMutation.mutate()}
            >
              {updateMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function RelaysPage() {
  const queryClient = useQueryClient();
  const [editTarget, setEditTarget] = useState<RelayRow | null>(null);

  const { pullIndicator } = usePullToRefresh({
    queryKeys: [["relays"], ["relay-health"]],
  });

  const { data: relays, isLoading } = useQuery({
    queryKey: ["relays"],
    queryFn: fetchRelays,
  });

  const healthQueries = useQueries({
    queries: (relays ?? []).map((relay) => ({
      queryKey: ["relay-health", relay.id, "24h"],
      queryFn: () => fetchRelayHealth(relay.id, "24h"),
      enabled: !!relays,
    })),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRelay,
    onSuccess: () => {
      toast.success("Relay deleted");
      queryClient.invalidateQueries({ queryKey: ["relays"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Summary bar stats
  const totalRelays = relays?.length ?? 0;
  const healthLoaded = healthQueries.length > 0 && healthQueries.every((q) => !q.isLoading);
  const healthyCount = healthQueries.filter((q) => {
    const h = q.data;
    return h && h.total_checks > 0 && h.uptime_pct !== null && h.uptime_pct >= 50;
  }).length;
  const incidentCount = healthQueries.reduce(
    (sum, q) => sum + (q.data?.downtime_incidents ?? 0),
    0
  );

  const tableHead = (
    <thead>
      <tr className="border-b border-border text-muted-foreground">
        <th className="px-4 py-3 text-left font-medium">Name</th>
        <th className="px-4 py-3 text-left font-medium">URL</th>
        <th className="px-4 py-3 text-left font-medium">Region</th>
        <th className="px-4 py-3 text-left font-medium">Status</th>
        <th className="px-4 py-3 text-left font-medium">Added</th>
        <th className="px-4 py-3 text-right font-medium">Actions</th>
      </tr>
    </thead>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-semibold text-foreground">Relays</h1>
          <p className="text-metric-sm text-muted-foreground mt-1">Manage your Nostr relays</p>
        </div>
        <Link to="/relays/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Relay
          </Button>
        </Link>
      </div>

      {/* Summary bar */}
      {!isLoading && totalRelays > 0 && (
        <div className="rounded-md border border-border bg-muted/30 px-4 py-2.5 text-xs font-mono text-muted-foreground flex items-center gap-2">
          {healthLoaded ? (
            <>
              <span
                className={cn(
                  "font-medium",
                  healthyCount === totalRelays
                    ? "text-success"
                    : healthyCount > 0
                    ? "text-warning"
                    : "text-destructive"
                )}
              >
                {healthyCount} of {totalRelays} relay{totalRelays !== 1 ? "s" : ""} healthy
              </span>
              <span className="opacity-30">·</span>
              <span>
                {incidentCount} incident{incidentCount !== 1 ? "s" : ""} in last 24h
              </span>
            </>
          ) : (
            <span className="animate-pulse">Loading health data…</span>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-metric-sm">
              {tableHead}
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-3"><div className="h-4 w-28 animate-pulse bg-muted rounded" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-52 animate-pulse bg-muted rounded" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse bg-muted rounded" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-12 animate-pulse bg-muted rounded" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse bg-muted rounded" /></td>
                    <td className="px-4 py-3 text-right"><div className="h-4 w-12 animate-pulse bg-muted rounded ml-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : !relays || relays.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <Radio className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-mono text-lg font-semibold text-foreground mb-2">No relays monitored</h3>
          <p className="text-metric-sm text-muted-foreground mb-6 max-w-sm">
            Add a Nostr relay to start tracking uptime, latency, and performance
          </p>
          <Link to="/relays/new">
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Relay
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-metric-sm">
              {tableHead}
              <tbody>
                {relays.map((relay, idx) => {
                  const health = healthQueries[idx]?.data ?? null;
                  const isUp =
                    health && health.total_checks > 0
                      ? health.uptime_pct !== null && health.uptime_pct >= 50
                      : null;
                  return (
                    <tr
                      key={relay.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/relays/${relay.id}`}
                          className="font-mono font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {relay.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground max-w-[240px]">
                        <a
                          href={relay.url.replace("wss://", "https://")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-foreground transition-colors truncate"
                          title={relay.url}
                        >
                          <span className="truncate">{relay.url}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {relay.region || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill isUp={isUp} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(relay.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditTarget(relay)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit relay"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete relay "${relay.name}"?`))
                                deleteMutation.mutate(relay.id);
                            }}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            title="Delete relay"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editTarget && (
        <EditRelayDialog relay={editTarget} onClose={() => setEditTarget(null)} />
      )}
    </div>
  );
}
