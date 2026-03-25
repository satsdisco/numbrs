import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { truncatePubkey, pubkeyToNpub } from "@/lib/nostr";
import { Copy, Check, LogOut, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface NostrProfile {
  name?: string;
  picture?: string;
  about?: string;
  nip05?: string;
  banner?: string;
}

async function fetchNostrProfile(pubkeyHex: string): Promise<NostrProfile | null> {
  // Try purplepag.es first (HTTP, fast)
  try {
    const res = await fetch(`https://purplepag.es/${pubkeyHex}`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const event = await res.json();
      if (event?.content) {
        const profile = JSON.parse(event.content);
        if (profile.picture) localStorage.setItem("numbrs-nostr-picture", profile.picture);
        if (profile.name) localStorage.setItem("numbrs-nostr-name", profile.name);
        return profile;
      }
    }
  } catch {}

  // Fallback: try primal.net NIP-05 style lookup
  try {
    const res = await fetch(`https://primal.net/api/user/${pubkeyHex}`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      const picture = data?.picture || data?.image;
      const name = data?.name || data?.display_name;
      if (picture) {
        const profile = { picture, name, about: data?.about, nip05: data?.nip05 };
        localStorage.setItem("numbrs-nostr-picture", picture);
        if (name) localStorage.setItem("numbrs-nostr-name", name);
        return profile;
      }
    }
  } catch {}

  return null;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(label ? `${label} copied` : "Copied");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const pubkey = user?.user_metadata?.pubkey as string | undefined;

  const { data: nostrProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["nostr-profile", pubkey],
    queryFn: () => fetchNostrProfile(pubkey!),
    enabled: !!pubkey,
    staleTime: 5 * 60 * 1000,
  });

  const { data: dashboardCount } = useQuery({
    queryKey: ["profile-dashboard-count"],
    queryFn: async () => {
      const { count } = await supabase.from("dashboards").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: relayCount } = useQuery({
    queryKey: ["profile-relay-count"],
    queryFn: async () => {
      const { count } = await supabase.from("relays").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: plexCount } = useQuery({
    queryKey: ["profile-plex-count"],
    queryFn: async () => {
      const { count } = await (supabase as any).from("plex_events").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: jellyfinCount } = useQuery({
    queryKey: ["profile-jellyfin-count"],
    queryFn: async () => {
      const { count } = await (supabase as any).from("jellyfin_events").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: apiKeyCount } = useQuery({
    queryKey: ["profile-api-key-count"],
    queryFn: async () => {
      const { count } = await supabase.from("api_keys").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const displayName = nostrProfile?.name || "Anonymous";
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long" })
    : null;

  let npub: string | null = null;
  try {
    if (pubkey) npub = pubkeyToNpub(pubkey);
  } catch {
    // ignore
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-mono text-xl font-semibold text-foreground">Profile</h1>
        <p className="text-metric-sm text-muted-foreground mt-1">Your Nostr identity and account info</p>
      </div>

      {/* Profile card */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          {profileLoading ? (
            <div className="h-20 w-20 rounded-full bg-muted animate-pulse shrink-0" />
          ) : nostrProfile?.picture ? (
            <img
              src={nostrProfile.picture}
              alt={displayName}
              className="h-20 w-20 rounded-full object-cover shrink-0 border border-border"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-border">
              <span className="text-2xl font-semibold text-primary font-mono">
                {displayName.slice(0, 1).toUpperCase()}
              </span>
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-1">
            <h2 className="text-lg font-semibold text-foreground font-mono">{displayName}</h2>

            {nostrProfile?.nip05 && (
              <p className="text-metric-sm text-primary font-mono">{nostrProfile.nip05}</p>
            )}

            {nostrProfile?.about && (
              <p className="text-metric-sm text-muted-foreground mt-2 leading-relaxed">
                {nostrProfile.about}
              </p>
            )}

            {memberSince && (
              <p className="text-[11px] text-muted-foreground/60">Member since {memberSince}</p>
            )}
          </div>
        </div>

        {/* Keys */}
        {pubkey && (
          <div className="mt-5 space-y-2 border-t border-border pt-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                  Pubkey (hex)
                </span>
                <p className="font-mono text-metric-sm text-muted-foreground truncate">
                  {truncatePubkey(pubkey)}
                </p>
              </div>
              <CopyButton text={pubkey} label="Pubkey" />
            </div>

            {npub && (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                    npub
                  </span>
                  <p className="font-mono text-metric-sm text-muted-foreground truncate">
                    {npub.slice(0, 12)}…{npub.slice(-6)}
                  </p>
                </div>
                <CopyButton text={npub} label="npub" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Account Stats */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-metric-sm font-semibold text-foreground mb-4">Account Stats</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: "Dashboards", value: dashboardCount },
            { label: "Relays", value: relayCount },
            { label: "Plex Events", value: plexCount },
            { label: "Jellyfin Events", value: jellyfinCount },
            { label: "API Keys", value: apiKeyCount },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-md bg-background border border-border/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                {label}
              </p>
              <p className="text-2xl font-mono font-semibold text-foreground mt-1">
                {value === undefined || value === null ? (
                  <span className="text-base text-muted-foreground animate-pulse">…</span>
                ) : (
                  value.toLocaleString()
                )}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-metric-sm font-semibold text-foreground mb-3">Quick Links</h3>
        <div className="space-y-2">
          <Link
            to="/settings?tab=setup"
            className="flex items-center justify-between rounded-md px-3 py-2 text-metric-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            Setup Guide
            <ExternalLink className="h-3.5 w-3.5 opacity-50" />
          </Link>
          <Link
            to="/api-keys"
            className="flex items-center justify-between rounded-md px-3 py-2 text-metric-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            API Keys
            <ExternalLink className="h-3.5 w-3.5 opacity-50" />
          </Link>
          <Link
            to="/settings"
            className="flex items-center justify-between rounded-md px-3 py-2 text-metric-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            Settings
            <ExternalLink className="h-3.5 w-3.5 opacity-50" />
          </Link>
          <button
            onClick={signOut}
            className="w-full flex items-center justify-between rounded-md px-3 py-2 text-metric-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            Sign Out
            <LogOut className="h-3.5 w-3.5 opacity-70" />
          </button>
        </div>
      </div>
    </div>
  );
}
