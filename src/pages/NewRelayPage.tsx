import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createRelay } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function NewRelayPage() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("wss://");
  const [region, setRegion] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: { name: string; url: string; region?: string; user_id: string }) =>
      createRelay(data),
    onSuccess: () => {
      toast.success("Relay added");
      queryClient.invalidateQueries({ queryKey: ["relays"] });
      navigate("/relays");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.startsWith("wss://")) {
      toast.error("Relay URL must start with wss://");
      return;
    }
    if (!user) return;
    mutation.mutate({
      name: name || url.replace(/^wss:\/\//, "").replace(/\/$/, ""),
      url: url.trim(),
      region: region.trim() || undefined,
      user_id: user.id,
    });
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="font-mono text-xl font-semibold text-foreground">Add Relay</h1>
        <p className="text-metric-sm text-muted-foreground mt-1">
          Register a Nostr relay for health monitoring
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6">
        <div className="space-y-2">
          <Label htmlFor="url" className="text-metric-sm">Relay URL *</Label>
          <Input
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="wss://relay.example.com"
            required
            className="bg-background font-mono"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="name" className="text-metric-sm">Display Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Relay (auto-derived from URL if empty)"
            className="bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="region" className="text-metric-sm">Region (optional)</Label>
          <Input
            id="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="us-east, eu-west, etc."
            className="bg-background"
          />
        </div>

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Adding..." : "Add Relay"}
        </Button>
      </form>
    </div>
  );
}
