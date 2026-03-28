import { useState, useEffect, useRef } from "react";
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
  const [isPublic, setIsPublic] = useState(false);
  const [regionLoading, setRegionLoading] = useState(false);
  const regionUserEdited = useRef(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (regionUserEdited.current) return;
      let hostname = "";
      try {
        hostname = new URL(url).hostname;
      } catch {
        return;
      }
      if (!hostname) return;
      setRegionLoading(true);
      try {
        const res = await fetch(`http://ip-api.com/json/${hostname}?fields=city,country,countryCode`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.city && data.countryCode && !regionUserEdited.current) {
          setRegion(`${data.city}, ${data.countryCode}`);
        }
      } catch {
        // leave region empty on error
      } finally {
        setRegionLoading(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [url]);

  const mutation = useMutation({
    mutationFn: (data: { name: string; url: string; region?: string; user_id: string; is_public: boolean }) =>
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
      is_public: isPublic,
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
          <div className="flex items-center gap-2">
            <Label htmlFor="region" className="text-metric-sm">Region (optional)</Label>
            {regionLoading && (
              <span className="text-xs text-muted-foreground">Looking up...</span>
            )}
          </div>
          <Input
            id="region"
            value={region}
            onChange={(e) => {
              regionUserEdited.current = true;
              setRegion(e.target.value);
            }}
            placeholder="Frankfurt, DE"
            className="bg-background"
          />
        </div>

        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="is-public"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
          />
          <div>
            <label htmlFor="is-public" className="text-metric-sm font-medium cursor-pointer">
              List publicly
            </label>
            <p className="text-xs text-muted-foreground">
              Show this relay on the Explore page and Leaderboard
            </p>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Adding..." : "Add Relay"}
        </Button>
      </form>
    </div>
  );
}
