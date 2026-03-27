import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import SetupPage from "@/pages/SetupPage";

function isValidNpub(value: string): boolean {
  return value === "" || (value.startsWith("npub1") && value.length >= 60 && value.length <= 70);
}

const THEME_KEY = "numbrs-theme";

type Theme = "dark" | "light" | "system";

function applyTheme(theme: Theme) {
  // Currently only dark mode variables are defined, so we always keep dark
  // This sets it for when light is implemented
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else if (theme === "light") {
    document.documentElement.classList.remove("dark");
  } else {
    // system
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", prefersDark);
  }
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "account";
  const [currentTheme, setCurrentTheme] = useState<Theme>(
    () => (localStorage.getItem(THEME_KEY) as Theme) || "dark"
  );
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [npubInput, setNpubInput] = useState(
    () => user?.user_metadata?.nostr_npub ?? ""
  );

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile?.display_name) {
      setDisplayNameInput(profile.display_name);
    }
  }, [profile]);

  const saveDisplayName = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id: user!.id, display_name: name }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Display name saved");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveNpub = useMutation({
    mutationFn: async (npub: string) => {
      const { error } = await supabase.auth.updateUser({
        data: { nostr_npub: npub },
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Nostr npub saved"),
    onError: (err: Error) => toast.error(err.message),
  });

  const handleThemeSelect = (theme: Theme) => {
    if (theme !== "dark") {
      toast("Light theme coming soon", { description: "Only dark mode is available right now." });
      return;
    }
    setCurrentTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
  };

  const themes: { value: Theme; label: string; desc: string }[] = [
    { value: "dark", label: "Dark", desc: "Default — always dark" },
    { value: "light", label: "Light", desc: "Coming soon" },
    { value: "system", label: "System", desc: "Coming soon" },
  ];

  const tabs = [
    { id: "account", label: "Account" },
    { id: "setup", label: "Setup" },
  ];

  return (
    <div className="space-y-0">
      {/* Tab switcher */}
      <div className="flex gap-0 border-b border-border mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => tab.id === "account" ? setSearchParams({}) : setSearchParams({ tab: tab.id })}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "setup" ? (
        <SetupPage />
      ) : (
      <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-mono text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-metric-sm text-muted-foreground mt-1">Manage your preferences</p>
      </div>

      {/* Theme */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h3 className="text-metric-sm font-semibold text-foreground">Theme</h3>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => (
            <button
              key={t.value}
              onClick={() => handleThemeSelect(t.value)}
              className={cn(
                "rounded-md border p-3 text-left transition-colors",
                currentTheme === t.value
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background hover:border-border/80",
                t.value !== "dark" && "opacity-50 cursor-not-allowed"
              )}
            >
              <p className="text-metric-sm font-medium text-foreground">{t.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Display Name */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h3 className="text-metric-sm font-semibold text-foreground">Display Name</h3>
        <p className="text-metric-sm text-muted-foreground">
          Shown in your profile. Separate from your Nostr identity.
        </p>
        <div className="flex gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="display-name" className="text-metric-sm">Name</Label>
            <Input
              id="display-name"
              value={displayNameInput}
              onChange={(e) => setDisplayNameInput(e.target.value)}
              placeholder="Your display name"
              className="bg-background"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => saveDisplayName.mutate(displayNameInput)}
              disabled={saveDisplayName.isPending || !displayNameInput.trim()}
              size="sm"
            >
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Nostr Alerts */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div>
          <h3 className="text-metric-sm font-semibold text-foreground">Nostr Alerts</h3>
          <p className="text-metric-sm text-muted-foreground mt-1">
            When enabled, you will receive Nostr DMs (NIP-04) when alert rules fire.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="nostr-npub" className="text-metric-sm">
              Nostr npub (for DM alerts)
            </Label>
            <Input
              id="nostr-npub"
              value={npubInput}
              onChange={(e) => setNpubInput(e.target.value)}
              placeholder="npub1..."
              className={cn(
                "bg-background font-mono text-xs",
                npubInput && !isValidNpub(npubInput) && "border-destructive"
              )}
            />
            {npubInput && !isValidNpub(npubInput) && (
              <p className="text-[11px] text-destructive">
                Must start with "npub1" and be approximately 63 characters
              </p>
            )}
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => saveNpub.mutate(npubInput)}
              disabled={saveNpub.isPending || !isValidNpub(npubInput)}
              size="sm"
            >
              {saveNpub.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-2">
        <h3 className="text-metric-sm font-semibold text-foreground mb-3">Links</h3>
        {[
          { to: "/setup", label: "Setup Guide" },
          { to: "/profile", label: "Profile" },
          { to: "/api-keys", label: "API Keys" },
        ].map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center justify-between rounded-md px-3 py-2 text-metric-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            {label}
            <ExternalLink className="h-3.5 w-3.5 opacity-50" />
          </Link>
        ))}
        <div className="pt-2 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              localStorage.removeItem("onboarding_complete");
              navigate("/");
            }}
          >
            Restart Setup Guide
          </Button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-lg border border-destructive/30 bg-card p-5 space-y-4">
        <h3 className="text-metric-sm font-semibold text-destructive">Danger Zone</h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-metric-sm font-medium text-foreground">Sign out everywhere</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Ends all active sessions
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            Sign Out
          </Button>
        </div>

        <div className="border-t border-border/50 pt-4 flex items-center justify-between">
          <div>
            <p className="text-metric-sm font-medium text-foreground">Delete all my data</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Permanently removes all dashboards, relays, events, and API keys
            </p>
          </div>
          {!deleteConfirm ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirm(true)}
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Delete Data
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-destructive">Are you sure?</span>
              <Button
                variant="destructive"
                size="sm"
                disabled={isDeleting}
                onClick={async () => {
                  if (!user) return;
                  setIsDeleting(true);
                  try {
                    const tables = [
                      "metrics",
                      "dashboards",
                      "panels",
                      "relays",
                      "uptime_monitors",
                      "alert_rules",
                      "api_keys",
                      "plex_events",
                      "jellyfin_events",
                    ];
                    for (const table of tables) {
                      await supabase.from(table as any).delete().eq("user_id", user.id);
                    }
                    toast.success("All data deleted. Signing out…");
                    await signOut();
                  } catch (err: any) {
                    toast.error(err.message ?? "Failed to delete data");
                    setIsDeleting(false);
                    setDeleteConfirm(false);
                  }
                }}
              >
                {isDeleting ? "Deleting…" : "Confirm"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
      </div>
      )}
    </div>
  );
}
