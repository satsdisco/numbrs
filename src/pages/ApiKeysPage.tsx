import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchApiKeys, createApiKey, deleteApiKey } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Key, Plus, Trash2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

export default function ApiKeysPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { data: keys, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: fetchApiKeys,
  });

  const handleCreate = async () => {
    if (!user) return;
    try {
      await createApiKey(user.id, `Key ${(keys?.length || 0) + 1}`);
      toast.success("API key created");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    } catch {
      toast.error("Failed to create key");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this API key? Any scripts using it will stop working.")) return;
    try {
      await deleteApiKey(id);
      toast.success("Key deleted");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    } catch {
      toast.error("Failed to delete key");
    }
  };

  const handleCopy = async (key: string, id: string) => {
    await navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-metric-lg text-foreground">API Keys</h1>
          <p className="text-metric-sm text-muted-foreground">Authenticate your data ingestion scripts</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={handleCreate}>
          <Plus className="h-3.5 w-3.5" />
          New Key
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-card" />
          ))}
        </div>
      ) : keys && keys.length > 0 ? (
        <div className="space-y-3">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-3 min-w-0">
                <Key className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <h3 className="text-metric-base font-medium text-foreground">{k.name}</h3>
                  <p className="truncate font-mono text-metric-sm text-muted-foreground">{k.key}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-metric-sm text-muted-foreground mr-2">
                  {formatDistanceToNow(new Date(k.created_at), { addSuffix: true })}
                </span>
                <Button variant="ghost" size="icon" onClick={() => handleCopy(k.key, k.id)}>
                  {copiedId === k.id ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(k.id)} className="text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-16">
          <Key className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-metric-base text-muted-foreground">No API keys yet</p>
          <p className="mt-1 text-metric-sm text-muted-foreground">Create an API key to start ingesting data.</p>
        </div>
      )}
    </div>
  );
}
