import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createRelay, createMetric, fetchApiKeys, createApiKey } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ApiSnippet from "@/components/ApiSnippet";
import { ArrowLeft, Check, Radio } from "lucide-react";
import { toast } from "sonner";

export default function NewRelayPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState("wss://");
  const [name, setName] = useState("");
  const [relayId, setRelayId] = useState("");
  const [apiKey, setApiKey] = useState("");

  const { data: apiKeys } = useQuery({
    queryKey: ["api-keys"],
    queryFn: fetchApiKeys,
  });

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      // Create relay
      const relay = await createRelay({ url, name, user_id: user.id });
      setRelayId(relay.id);

      // Create latency metric
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      await createMetric({
        key: `${slug}_latency_ms`,
        name: `${name} Latency`,
        description: `Round-trip latency for ${url}`,
        unit: "ms",
        value_type: "float",
        user_id: user.id,
        tags: { relay: url },
      });

      // Create uptime metric
      await createMetric({
        key: `${slug}_uptime`,
        name: `${name} Uptime`,
        description: `Uptime status for ${url} (1=up, 0=down)`,
        unit: "",
        value_type: "int",
        user_id: user.id,
        tags: { relay: url },
      });

      // Get or create API key
      let key = apiKeys?.[0]?.key;
      if (!key) {
        const newKey = await createApiKey(user.id);
        key = newKey.key;
      }
      setApiKey(key);

      queryClient.invalidateQueries({ queryKey: ["relays"] });
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
      setStep(2);
    } catch (err: any) {
      toast.error(err.message || "Failed to create relay");
    } finally {
      setLoading(false);
    }
  };

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "your-project-id";
  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL || "https://" + projectId + ".supabase.co"}/functions/v1/ingest`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "_");

  const curlSnippet = `curl -X POST '${functionUrl}' \\
  -H 'Content-Type: application/json' \\
  -H 'X-API-KEY: ${apiKey || "your-api-key"}' \\
  -d '[
    {
      "key": "${slug}_latency_ms",
      "value": 42.5,
      "tags": { "geo": "us-east" }
    },
    {
      "key": "${slug}_uptime",
      "value": 1
    }
  ]'`;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/relays")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-metric-lg text-foreground">Add Relay</h1>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2">
        {[1, 2].map((s) => (
          <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      {step === 1 && (
        <form onSubmit={handleStep1} className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-card">
          <div className="flex items-center gap-2 text-metric-sm text-muted-foreground">
            <Radio className="h-4 w-4 text-primary" />
            <span>Step 1: Relay Details</span>
          </div>
          <div className="space-y-2">
            <Label className="text-metric-sm">Relay Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Damus Relay"
              required
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-metric-sm">WebSocket URL</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="wss://relay.damus.io"
              required
              pattern="wss?://.*"
              className="bg-background font-mono"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Setting up..." : "Create Relay & Metrics"}
          </Button>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <Check className="h-5 w-5 text-success" />
              <span className="text-metric-base font-medium text-foreground">Relay created</span>
            </div>
            <p className="mb-4 text-metric-sm text-muted-foreground">
              Two metrics have been created: <code className="font-mono text-foreground">{slug}_latency_ms</code> and{" "}
              <code className="font-mono text-foreground">{slug}_uptime</code>. Send data using the snippet below:
            </p>
            <ApiSnippet code={curlSnippet} />
          </div>
          <Button onClick={() => navigate("/")} className="w-full" variant="outline">
            Go to Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}
