import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Check, Copy, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchRelays, fetchApiKeys, fetchMetrics } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ─── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Copied");
        setTimeout(() => setCopied(false), 2000);
      }}
      className={cn(
        "flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-all shrink-0",
        copied ? "bg-success/20 text-success" : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {copied ? <><Check className="h-3 w-3" />Copied!</> : <><Copy className="h-3 w-3" />Copy</>}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative group">
      <pre className="rounded-lg bg-[#0d0d0d] border border-border/60 p-4 overflow-x-auto text-xs leading-relaxed font-mono text-[#e0e0e0] whitespace-pre-wrap scrollbar-thin">
        {code.trim()}
      </pre>
      <div className="absolute top-2 right-2">
        <CopyButton text={code.trim()} />
      </div>
    </div>
  );
}

// ─── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span className={cn(
      "flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium shrink-0",
      connected ? "bg-success/10 text-success" : "bg-muted/50 text-muted-foreground"
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-success animate-pulse" : "bg-muted-foreground/50")} />
      {connected ? "Connected" : "Not set up"}
    </span>
  );
}

// ─── Service card ──────────────────────────────────────────────────────────────

interface ServiceCardProps {
  emoji: string;
  name: string;
  description: string;
  connected: boolean;
  children: React.ReactNode;
  actionLabel?: string;
  actionHref?: string;
}

function ServiceCard({ emoji, name, description, connected, children, actionLabel, actionHref }: ServiceCardProps) {
  const [open, setOpen] = useState(!connected);

  return (
    <div className={cn(
      "rounded-xl border bg-card transition-all",
      connected ? "border-success/30" : "border-border"
    )}>
      <button
        className="w-full flex items-center gap-4 p-5 text-left"
        onClick={() => setOpen(v => !v)}
      >
        <span className="text-2xl shrink-0">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{name}</span>
            <StatusBadge connected={connected} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <div className="shrink-0 text-muted-foreground">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-5 pb-5 pt-4 space-y-4">
          {children}
          {actionLabel && actionHref && (
            <Link to={actionHref}>
              <Button size="sm" variant={connected ? "outline" : "default"} className="gap-1.5 mt-1">
                <ExternalLink className="h-3.5 w-3.5" /> {actionLabel}
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold mt-0.5">{n}</span>
      <div className="space-y-2 flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {children}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function SetupPage() {
  const { data: relays } = useQuery({ queryKey: ["relays"], queryFn: fetchRelays });
  const { data: apiKeys } = useQuery({ queryKey: ["api-keys"], queryFn: fetchApiKeys });
  const { data: allMetrics } = useQuery({ queryKey: ["all-metrics"], queryFn: fetchMetrics });

  const { data: jellyfinCount } = useQuery({
    queryKey: ["jellyfin-count"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { count } = await supabase.from("jellyfin_events").select("id", { count: "exact", head: true }).gte("date_played", since);
      return count ?? 0;
    },
  });

  const { data: plexCount } = useQuery({
    queryKey: ["plex-count"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { count } = await supabase.from("plex_events").select("id", { count: "exact", head: true }).gte("created_at", since);
      return count ?? 0;
    },
  });

  const apiKey = apiKeys?.[0]?.key ?? "YOUR_API_KEY";
  const hasApiKey = !!apiKeys?.length;
  const metricKeys = allMetrics?.map(m => m.key) ?? [];
  const hasSystem = metricKeys.some(k => k.startsWith("system.cpu"));
  const hasBtc = metricKeys.some(k => k === "bitcoin.price_usd");
  const hasGithub = metricKeys.some(k => k.startsWith("github."));
  const hasRelays = (relays?.length ?? 0) > 0;
  const hasJellyfin = (jellyfinCount ?? 0) > 0;
  const hasPlex = (plexCount ?? 0) > 0;

  const connected = [hasRelays, hasPlex, hasJellyfin, hasSystem, hasBtc, hasGithub].filter(Boolean).length;
  const total = 6;

  const jellyfinCollector = `#!/bin/bash
# Jellyfin collector — add to cron: */5 * * * * /path/to/jellyfin-collector.sh
NUMBRS_KEY="${apiKey}"
JELLYFIN_URL="http://YOUR_JELLYFIN_IP:8096"
JELLYFIN_API_KEY="YOUR_JELLYFIN_API_KEY"
INGEST="https://numbrs.lol/functions/v1/ingest"

push() {
  curl -s -X POST "$INGEST" \\
    -H "x-api-key: $NUMBRS_KEY" \\
    -H "Content-Type: application/json" \\
    -d "{\\"key\\":\\"$1\\",\\"value\\":$2}" > /dev/null
}

# Active sessions
SESSIONS=$(curl -s "$JELLYFIN_URL/Sessions?api_key=$JELLYFIN_API_KEY" | \\
  python3 -c "import json,sys; d=json.load(sys.stdin); print(len([s for s in d if s.get('NowPlayingItem')]))" 2>/dev/null || echo 0)
push "jellyfin.active_streams" "$SESSIONS"

# Library counts
COUNTS=$(curl -s "$JELLYFIN_URL/Items/Counts?api_key=$JELLYFIN_API_KEY")
SONGS=$(echo "$COUNTS" | python3 -c "import json,sys; print(json.load(sys.stdin).get('SongCount',0))" 2>/dev/null || echo 0)
push "jellyfin.song_count" "$SONGS"

echo "$(date): jellyfin streams=$SESSIONS songs=$SONGS"`;

  const systemCollector = `#!/bin/bash
# System health collector — add to cron: */5 * * * * /path/to/system-collector.sh
NUMBRS_KEY="${apiKey}"
INGEST="https://numbrs.lol/functions/v1/ingest"

push() {
  curl -s -X POST "$INGEST" \\
    -H "x-api-key: $NUMBRS_KEY" \\
    -H "Content-Type: application/json" \\
    -d "{\\"key\\":\\"$1\\",\\"value\\":$2}" > /dev/null
}

# CPU usage
CPU=$(ps -A -o %cpu | awk '{s+=$1} END {printf "%.1f", s}')
push "system.cpu_pct" "$CPU"

# RAM usage (macOS)
RAM_PCT=$(vm_stat | python3 -c "
import sys, re
d = {m.group(1): int(m.group(2)) for m in re.finditer(r'(.+?):\\s+(\\d+)', sys.stdin.read())}
used = d.get('Pages active',0) + d.get('Pages wired down',0)
total = sum(d.values())
print(round(used/total*100, 1) if total else 0)")
push "system.ram_pct" "$RAM_PCT"

echo "$(date): cpu=$CPU% ram=$RAM_PCT%"`;

  const githubCollector = `#!/bin/bash
# GitHub stats collector — run once or add to daily cron
NUMBRS_KEY="${apiKey}"
GH_USER="your-github-username"  # <-- change this
INGEST="https://numbrs.lol/functions/v1/ingest"

curl -s "https://api.github.com/users/$GH_USER/repos?per_page=100&type=public" | \\
python3 -c "
import json, sys, urllib.request

INGEST = '$INGEST'
KEY = '$NUMBRS_KEY'
repos = json.load(sys.stdin)

for r in repos:
    slug = r['full_name'].replace('/', '.')
    for metric, val in [
        (f'github.{slug}.stars', r['stargazers_count']),
        (f'github.{slug}.forks', r['forks_count']),
        (f'github.{slug}.issues', r['open_issues_count']),
    ]:
        data = json.dumps({'key': metric, 'value': val}).encode()
        req = urllib.request.Request(INGEST, data, {'x-api-key': KEY, 'Content-Type': 'application/json'})
        try: urllib.request.urlopen(req, timeout=5)
        except: pass
    print(f'{r[\"name\"]}: {r[\"stargazers_count\"]} stars')
"`;

  const btcCron = `# Add this line to crontab (runs every 5 minutes):
*/5 * * * * curl -s "https://api.coinbase.com/v2/prices/BTC-USD/spot" | python3 -c "import json,sys; price=round(float(json.load(sys.stdin)['data']['amount'])); import urllib.request; urllib.request.urlopen(urllib.request.Request('https://numbrs.lol/functions/v1/ingest', ('[{\"key\":\"bitcoin.price_usd\",\"value\":'+str(price)+'}]').encode(), {'x-api-key':'${apiKey}','Content-Type':'application/json'}))"`;

  const plexWebhookUrl = `https://numbrs.lol/functions/v1/plex-webhook?api_key=${apiKey}`;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-mono text-xl font-semibold text-foreground">Setup</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your services and get data flowing into numbrs.
        </p>
        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(connected / total) * 100}%` }} />
          </div>
          <span className="text-xs text-muted-foreground font-mono shrink-0">{connected}/{total} connected</span>
        </div>
      </div>

      {/* API Key warning */}
      {!hasApiKey && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 flex items-start gap-3">
          <span className="text-lg shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-medium text-foreground">You need an API key first</p>
            <p className="text-xs text-muted-foreground mt-1">All collectors and integrations require an API key to authenticate with numbrs.</p>
            <Link to="/api-keys" className="mt-2 inline-block">
              <Button size="sm" className="gap-1.5 mt-1">Create API key →</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Service cards */}
      <div className="space-y-3">

        <ServiceCard emoji="⚡" name="Nostr Relays" description="Monitor WebSocket relay uptime, latency, and health scores in real time" connected={hasRelays} actionLabel="Add a relay" actionHref="/relays/new">
          <Step n={1} title="Add a relay URL">
            <p className="text-xs text-muted-foreground">Click "Add Relay" in the sidebar or use the button below. Paste any <code className="font-mono bg-muted px-1 rounded">wss://</code> URL.</p>
          </Step>
          <Step n={2} title="We probe it automatically">
            <p className="text-xs text-muted-foreground">numbrs checks your relay every 5 minutes — connect latency, event latency, uptime %, and health score.</p>
          </Step>
        </ServiceCard>

        <ServiceCard emoji="🎬" name="Plex Media Server" description="Track plays, scrobbles, top content, and user activity from your Plex server" connected={hasPlex} actionLabel="View Plex analytics" actionHref="/plex">
          <Step n={1} title="Open Plex Settings → Webhooks">
            <p className="text-xs text-muted-foreground">In your Plex web app: Settings → Webhooks → Add Webhook</p>
          </Step>
          <Step n={2} title="Add this webhook URL">
            <CodeBlock code={plexWebhookUrl} />
            <p className="text-xs text-muted-foreground mt-1">Plex will POST every play, pause, stop, and scrobble event to numbrs automatically.</p>
          </Step>
          <Step n={3} title="Done — plays start flowing in immediately">
            <p className="text-xs text-muted-foreground">Check the Plex page in the sidebar after your next play event.</p>
          </Step>
        </ServiceCard>

        <ServiceCard emoji="🎵" name="Jellyfin" description="Track listening history, top artists, active streams, and user activity" connected={hasJellyfin} actionLabel="View Jellyfin analytics" actionHref="/jellyfin">
          <Step n={1} title="Get your Jellyfin API key">
            <p className="text-xs text-muted-foreground">In Jellyfin: Dashboard → API Keys → + → copy the key</p>
          </Step>
          <Step n={2} title="Save this collector script">
            <CodeBlock code={jellyfinCollector} />
          </Step>
          <Step n={3} title="Add to crontab (runs every 5 minutes)">
            <CodeBlock code={`*/5 * * * * /path/to/jellyfin-collector.sh >> /tmp/jellyfin-collector.log 2>&1`} />
          </Step>
        </ServiceCard>

        <ServiceCard emoji="🖥️" name="System Health" description="CPU, RAM, and disk usage from your Mac or Linux server" connected={hasSystem} actionLabel="View Mac Mini Health" actionHref="/dashboards">
          <Step n={1} title="Save the collector script">
            <CodeBlock code={systemCollector} />
          </Step>
          <Step n={2} title="Add to crontab">
            <CodeBlock code={`*/5 * * * * /path/to/system-collector.sh >> /tmp/system-collector.log 2>&1`} />
          </Step>
          <Step n={3} title="Create a Mac Mini Health dashboard">
            <p className="text-xs text-muted-foreground">Go to Dashboards → New Dashboard → choose the Mac Mini Health template.</p>
          </Step>
        </ServiceCard>

        <ServiceCard emoji="₿" name="Bitcoin Price" description="Live BTC/USD price tracked every 5 minutes from Coinbase" connected={hasBtc}>
          <Step n={1} title="Add this one-liner to crontab">
            <CodeBlock code={btcCron} />
            <p className="text-xs text-muted-foreground mt-1">Fetches from Coinbase public API — no auth needed.</p>
          </Step>
        </ServiceCard>

        <ServiceCard emoji="🐙" name="GitHub Stats" description="Stars, forks, open issues, and commit counts across your repos" connected={hasGithub}>
          <Step n={1} title="Save the collector script (replace your username)">
            <CodeBlock code={githubCollector} />
          </Step>
          <Step n={2} title="Add to daily cron">
            <CodeBlock code={`0 * * * * /path/to/github-collector.sh >> /tmp/github-collector.log 2>&1`} />
          </Step>
          <Step n={3} title="Create a GitHub Projects dashboard">
            <p className="text-xs text-muted-foreground">Dashboards → New → GitHub Projects template. Update metric keys to match <code className="font-mono bg-muted px-1 rounded">github.YOUR_USER.REPO_NAME.stars</code></p>
          </Step>
        </ServiceCard>

      </div>

      {/* Footer */}
      <div className="rounded-lg border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">Need more integrations?</strong> Any numeric value can be pushed to numbrs with a single HTTP call. Check the{" "}
        <Link to="/integrations" className="text-primary hover:underline">Integrations page</Link> for Python, Node.js, GitHub Actions, and more examples.
      </div>
    </div>
  );
}
