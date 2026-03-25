import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchRelays, deleteRelay } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ExternalLink, Radio } from "lucide-react";
import { toast } from "sonner";

export default function RelaysPage() {
  const queryClient = useQueryClient();

  const { data: relays, isLoading } = useQuery({
    queryKey: ["relays"],
    queryFn: fetchRelays,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRelay,
    onSuccess: () => {
      toast.success("Relay deleted");
      queryClient.invalidateQueries({ queryKey: ["relays"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

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

      {isLoading ? (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-metric-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">URL</th>
                  <th className="px-4 py-3 text-left font-medium">Region</th>
                  <th className="px-4 py-3 text-left font-medium">Added</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-3"><div className="h-4 w-28 animate-pulse bg-muted rounded" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-52 animate-pulse bg-muted rounded" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse bg-muted rounded" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse bg-muted rounded" /></td>
                    <td className="px-4 py-3 text-right"><div className="h-4 w-4 animate-pulse bg-muted rounded ml-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : !relays || relays.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 py-20 text-center">
          <Radio className="h-10 w-10 text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium text-foreground mb-2">No relays yet</h2>
          <p className="text-metric-sm text-muted-foreground mb-2 max-w-sm">
            Add a Nostr relay to start tracking latency, uptime, and health scores automatically.
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            Want to push custom metrics instead?{" "}
            <Link to="/integrations" className="text-primary hover:underline">View integrations →</Link>
          </p>
          <Link to="/relays/new">
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" /> Add your first relay
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-metric-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">URL</th>
                <th className="px-4 py-3 text-left font-medium">Region</th>
                <th className="px-4 py-3 text-left font-medium">Added</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {relays.map((relay) => (
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
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(relay.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`Delete relay "${relay.name}"?`))
                          deleteMutation.mutate(relay.id);
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
