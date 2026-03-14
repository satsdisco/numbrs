import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchRelays, deleteRelay } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus, Trash2, Radio, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function RelaysPage() {
  const queryClient = useQueryClient();
  const { data: relays, isLoading } = useQuery({
    queryKey: ["relays"],
    queryFn: fetchRelays,
  });

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete relay "${name}"?`)) return;
    try {
      await deleteRelay(id);
      toast.success("Relay deleted");
      queryClient.invalidateQueries({ queryKey: ["relays"] });
    } catch {
      toast.error("Failed to delete relay");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-metric-lg text-foreground">Relays</h1>
          <p className="text-metric-sm text-muted-foreground">Manage your Nostr relay monitoring</p>
        </div>
        <Link to="/relays/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Relay
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-card" />
          ))}
        </div>
      ) : relays && relays.length > 0 ? (
        <div className="space-y-3">
          {relays.map((relay) => (
            <div key={relay.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-3">
                <Radio className="h-4 w-4 text-primary" />
                <div>
                  <h3 className="text-metric-base font-medium text-foreground">{relay.name}</h3>
                  <a
                    href={relay.url.replace("wss://", "https://")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono text-metric-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {relay.url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(relay.id, relay.name)} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-16">
          <Radio className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-metric-base text-muted-foreground">No relays configured</p>
          <p className="mt-1 text-metric-sm text-muted-foreground">Add a relay to start monitoring its health.</p>
        </div>
      )}
    </div>
  );
}
