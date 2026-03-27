import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApiKeys, createApiKey, deleteApiKey } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Copy, Check, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function ApiKeysPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newKeyName, setNewKeyName] = useState("Default");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const maskKey = (key: string) => key.slice(0, 8) + "••••••••••••";

  const { data: keys, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: fetchApiKeys,
  });

  const createMutation = useMutation({
    mutationFn: () => createApiKey(user!.id, newKeyName),
    onSuccess: () => {
      toast.success("API key created");
      setNewKeyName("Default");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteApiKey,
    onSuccess: () => {
      toast.success("API key deleted");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const copyKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Copied to clipboard");
  };

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const exampleCurl = () =>
    `curl -X POST \\
  https://${projectId}.supabase.co/functions/v1/ingest \\
  -H "Content-Type: application/json" \\
  -H "X-API-KEY: YOUR_API_KEY" \\
  -d '{
    "metric_key": "relay_latency_connect_ms",
    "relay_url": "wss://relay.damus.io",
    "value": 142.5
  }'`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-xl font-semibold text-foreground">API Keys</h1>
        <p className="text-metric-sm text-muted-foreground mt-1">
          Manage keys for the metrics ingestion API
        </p>
      </div>

      {/* Create key */}
      <div className="flex items-end gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="key-name" className="text-metric-sm">Key Name</Label>
          <Input
            id="key-name"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="My key"
            className="bg-background"
          />
        </div>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> Create Key
        </Button>
      </div>

      {/* Keys list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : !keys || keys.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center text-muted-foreground">
          No API keys yet. Create one to start ingesting metrics.
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <div key={k.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-foreground text-sm">{k.name}</span>
                  <span className="ml-2 text-metric-sm text-muted-foreground">
                    Created {new Date(k.created_at).toLocaleDateString()}
                  </span>
                  {k.last_used_at && (
                    <span className="ml-2 text-metric-sm text-muted-foreground">
                      · Last used {new Date(k.last_used_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyKey(k.key, k.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copiedId === k.id ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this API key?")) deleteMutation.mutate(k.id);
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 font-mono text-metric-sm text-muted-foreground bg-background rounded px-3 py-2 break-all">
                  {revealedIds.has(k.id) ? k.key : maskKey(k.key)}
                </div>
                <button
                  onClick={() => toggleReveal(k.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  title={revealedIds.has(k.id) ? "Hide key" : "Show key"}
                >
                  {revealedIds.has(k.id) ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              <details className="group">
                <summary className="text-metric-sm text-primary cursor-pointer hover:underline">
                  Show example curl command
                </summary>
                <pre className="mt-2 overflow-x-auto rounded bg-background p-3 text-[11px] font-mono text-muted-foreground leading-relaxed">
                  {exampleCurl()}
                </pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
