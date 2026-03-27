import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTheme, THEME_PRESETS, ThemePreset } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, Check, Bell, Palette, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import SetupPage from "@/pages/SetupPage";

function isValidNpub(value: string): boolean {
  return value === "" || (value.startsWith("npub1") && value.length >= 60 && value.length <= 70);
}

const THEME_KEY = "numbrs-theme";
type Theme = "dark" | "light" | "system";

function applyTheme(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else if (theme === "light") {
    document.documentElement.classList.remove("dark");
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", prefersDark);
  }
}

// Common IANA timezone identifiers for the selector
const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "America/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "America/Sao_Paulo",
  "America/Buenos_Aires",
  "America/Mexico_City",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Stockholm",
  "Europe/Helsinki",
  "Europe/Warsaw",
  "Europe/Bucharest",
  "Europe/Istanbul",
  "Europe/Moscow",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Hong_Kong",
  "Asia/Jakarta",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Pacific/Auckland",
  "Pacific/Honolulu",
];

function ThemeSwatchGrid() {
  const { preset, setPreset, savePreset, saving } = useTheme();
  const [selected, setSelected] = useState<ThemePreset>(preset);

  // Keep local selection in sync if preset changes externally
  useEffect(() => {
    setSelected(preset);
  }, [preset]);

  const handleClick = (p: ThemePreset) => {
    setSelected(p);
    setPreset(p); // live preview
  };

  const handleSave = async () => {
    await savePreset(selected);
    toast.success(`Theme "${selected.name}" saved`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {THEME_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => handleClick(p)}
            title={p.name}
            className={cn(
              "relative flex flex-col items-center gap-2 rounded-lg border p-3 text-left transition-all",
              selected.id === p.id
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border bg-background hover:border-border/80 hover:bg-muted/30"
            )}
          >
            <div
              className="h-8 w-8 rounded-full border border-white/10 shadow-sm"
              style={{ background: p.swatch }}
            />
            <span className="text-[10px] font-medium text-center leading-tight text-foreground">
              {p.name}
            </span>
            {selected.id === p.id && (
              <span className="absolute top-1.5 right-1.5">
                <Check className="h-3 w-3 text-primary" />
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between pt-1">
        <p className="text-[11px] text-muted-foreground">
          Click a theme to preview instantly. Save to persist across sessions.
        </p>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || selected.id === preset.id}
        >
          {saving ? "Saving…" : "Save Theme"}
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "account";

  // Light/dark/system toggle (separate from accent theme)
  const [currentTheme, setCurrentTheme] = useState<Theme>(
    () => (localStorage.getItem(THEME_KEY) as Theme) || "dark"
  );

  const [displayNameInput, setDisplayNameInput] = useState("");
  const [timezoneInput, setTimezoneInput] = useState("UTC");
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
        .select("display_name, timezone")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile?.display_name) setDisplayNameInput(profile.display_name);
    if ((profile as any)?.timezone) setTimezoneInput((profile as any).timezone);
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

  const saveTimezone = useMutation({
    mutationFn: async (tz: string) => {
      const { error } = await (supabase as any)
        .from("profiles")
        .upsert({ user_id: user!.id, timezone: tz }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Timezone saved");
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

  const lightDarkThemes: { value: Theme; label: string; desc: string }[] = [
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

          {/* ── Appearance ─────────────────────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Appearance
              </h2>
            </div>

            {/* Light / dark / system */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <h3 className="text-metric-sm font-semibold text-foreground">Display Mode</h3>
              <div className="grid grid-cols-3 gap-3">
                {lightDarkThemes.map((t) => (
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

            {/* Accent theme presets */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <div>
                <h3 className="text-metric-sm font-semibold text-foreground">Accent Theme</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Changes accent colours, buttons, and chart palette across the whole app.
                </p>
              </div>
              <ThemeSwatchGrid />
            </div>
          </section>

          {/* ── Notifications ──────────────────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Notifications
              </h2>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              {/* Nostr DM alerts */}
              <div>
                <h3 className="text-metric-sm font-semibold text-foreground">Nostr DM Alerts</h3>
                <p className="text-metric-sm text-muted-foreground mt-1">
                  Receive NIP-04 direct messages when alert rules fire.
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

              {/* Slack webhook link */}
              <div className="border-t border-border/50 pt-4">
                <h3 className="text-metric-sm font-semibold text-foreground mb-1">Slack Webhook</h3>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Configure a Slack webhook to receive alert notifications in your workspace.
                </p>
                <Link
                  to="/alerts?tab=channels"
                  className="inline-flex items-center gap-1.5 text-metric-sm text-primary hover:underline"
                >
                  Manage Slack channels in Alerts
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </section>

          {/* ── Account ────────────────────────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Account
              </h2>
            </div>

            {/* Display Name */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <div>
                <h3 className="text-metric-sm font-semibold text-foreground">Display Name</h3>
                <p className="text-metric-sm text-muted-foreground mt-0.5">
                  Shown in your profile. Separate from your Nostr identity.
                </p>
              </div>
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
                    {saveDisplayName.isPending ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Timezone */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <div>
                <h3 className="text-metric-sm font-semibold text-foreground">Timezone</h3>
                <p className="text-metric-sm text-muted-foreground mt-0.5">
                  Used for displaying timestamps in your local time.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="timezone" className="text-metric-sm">Timezone</Label>
                  <select
                    id="timezone"
                    value={timezoneInput}
                    onChange={(e) => setTimezoneInput(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => saveTimezone.mutate(timezoneInput)}
                    disabled={saveTimezone.isPending}
                    size="sm"
                  >
                    {saveTimezone.isPending ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Data Retention */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-3">
              <div>
                <h3 className="text-metric-sm font-semibold text-foreground">Data Retention</h3>
                <p className="text-metric-sm text-muted-foreground mt-0.5">
                  How long raw metric datapoints are kept before being pruned.
                </p>
              </div>
              <div className="flex items-center justify-between rounded-md bg-background border border-border/50 px-3 py-2.5">
                <div>
                  <p className="text-metric-sm font-medium text-foreground">90 days</p>
                  <p className="text-[11px] text-muted-foreground">Current plan limit</p>
                </div>
                <span className="text-[11px] text-muted-foreground bg-muted rounded px-2 py-0.5">
                  Default
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Custom retention periods coming soon with paid plans.
              </p>
            </div>

            {/* Links */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-2">
              <h3 className="text-metric-sm font-semibold text-foreground mb-3">Quick Links</h3>
              {[
                { to: "/settings?tab=setup", label: "Setup Guide" },
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
                  <p className="text-[11px] text-muted-foreground mt-0.5">Ends all active sessions</p>
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
          </section>
        </div>
      )}
    </div>
  );
}
