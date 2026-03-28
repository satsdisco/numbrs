import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Check, Copy, ChevronDown, ChevronUp, Bot, Info, X, Loader2,
  AlertCircle, RefreshCw, Zap, Search, ExternalLink,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  fetchIntegrations,
  upsertIntegration,
  deleteIntegration,
  toggleIntegration,
  fetchLatestMetricValues,
  fetchFirstMetricLike,
  type UserIntegration,
} from "@/lib/integrations-api";
import {
  INTEGRATION_CATALOG,
  CATALOG_CATEGORIES,
  type CatalogIntegration,
} from "@/lib/integration-catalog";
import { cn } from "@/lib/utils";

// ─── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-all",
        copied
          ? "bg-success/20 text-success"
          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          Copy
        </>
      )}
    </button>
  );
}

// ─── Code block ───────────────────────────────────────────────────────────────

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  return (
    <div className="relative group">
      <pre className="rounded-lg bg-[#0d0d0d] border border-border/60 p-4 overflow-x-auto text-xs leading-relaxed font-mono text-[#e0e0e0] scrollbar-thin">
        <code>{code.trim()}</code>
      </pre>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={code.trim()} />
      </div>
    </div>
  );
}

// ─── formatSyncTime ────────────────────────────────────────────────────────────

function formatSyncTime(ts: string | null) {
  if (!ts) return "Never synced";
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString();
}

// ─── MetricPreview ─────────────────────────────────────────────────────────────

function MetricPreview({
  keys,
  formatters,
}: {
  keys: string[];
  formatters?: Record<string, (v: number) => string>;
}) {
  const { data } = useQuery({
    queryKey: ["metric-preview", ...keys],
    queryFn: () => fetchLatestMetricValues(keys),
    staleTime: 2 * 60_000,
    enabled: keys.length > 0,
  });

  if (!data) return null;

  const parts = keys
    .filter((k) => data[k] !== null)
    .map((k) => {
      const val = data[k]!;
      const fmt = formatters?.[k];
      return fmt ? fmt(val.value) : val.value.toLocaleString();
    });

  if (parts.length === 0) {
    return <p className="text-[11px] text-muted-foreground/50 italic">No data yet</p>;
  }

  return (
    <p className="text-[11px] text-muted-foreground/70">
      Latest: {parts.join(" · ")}
    </p>
  );
}

function MetricPreviewLike({
  pattern,
  format,
}: {
  pattern: string;
  format?: (key: string, value: number) => string;
}) {
  const { data } = useQuery({
    queryKey: ["metric-preview-like", pattern],
    queryFn: () => fetchFirstMetricLike(pattern),
    staleTime: 2 * 60_000,
  });

  if (!data) return null;
  const label = format ? format(data.key, data.value) : data.value.toLocaleString();
  return (
    <p className="text-[11px] text-muted-foreground/70">
      Latest: {label}
    </p>
  );
}

// ─── Manual integration card (expandable code snippet) ────────────────────────

interface ManualIntegration {
  id: string;
  icon: string;
  name: string;
  description: string;
  category: string;
  language?: string;
  snippets: { label: string; code: string; language?: string }[];
}

function IntegrationCard({ integration }: { integration: ManualIntegration }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-border/80"
    >
      <button
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-2xl shrink-0">{integration.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-foreground">{integration.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{integration.description}</div>
        </div>
        <div className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="border-t border-border px-5 pb-5 pt-4 space-y-4"
        >
          {integration.snippets.map((snippet, i) => (
            <div key={i} className="space-y-2">
              {snippet.label && (
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {snippet.label}
                </div>
              )}
              <CodeBlock code={snippet.code} language={snippet.language ?? integration.language} />
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Manual integration definitions ────────────────────────────────────────────

const INTEGRATIONS: ManualIntegration[] = [
  {
    id: "http-api",
    icon: "🌐",
    name: "HTTP API",
    category: "developer",
    description: "Push metrics from any language or tool with a simple POST request",
    language: "bash",
    snippets: [
      {
        label: "Single metric",
        code: `curl -sX POST https://numbrs.lol/functions/v1/ingest \\
  -H "x-api-key: YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"key": "my.metric", "value": 42}'`,
      },
      {
        label: "Batch (array)",
        code: `curl -sX POST https://numbrs.lol/functions/v1/ingest \\
  -H "x-api-key: YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '[{"key": "cpu.usage", "value": 87.3}, {"key": "mem.used_mb", "value": 1024}]'`,
      },
    ],
  },
  {
    id: "bash",
    icon: "🐚",
    name: "Bash / Cron",
    category: "infrastructure",
    description: "Track server metrics from a cron job or shell script",
    language: "bash",
    snippets: [
      {
        label: "CPU usage one-liner",
        code: `#!/bin/bash
NUMBRS_KEY="your_api_key"
curl -sX POST https://numbrs.lol/functions/v1/ingest \\
  -H "x-api-key: $NUMBRS_KEY" \\
  -H "Content-Type: application/json" \\
  -d "{\\"key\\": \\"server.cpu_pct\\", \\"value\\": $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d. -f1)}"`,
      },
      {
        label: "Add to crontab (runs every 5 minutes)",
        code: `*/5 * * * * /path/to/your/script.sh`,
      },
    ],
  },
  {
    id: "bitaxe",
    icon: "⛏️",
    name: "Bitaxe",
    category: "mining",
    description: "Monitor your Bitaxe miner — hashrate, temp, shares, efficiency. Runs on any machine on your local network.",
    language: "bash",
    snippets: [
      {
        label: "1. Set environment variables",
        code: `export BITAXE_IP="192.168.1.100"   # Your Bitaxe's local IP
export NUMBRS_URL="https://numbrs.lol/functions/v1/ingest"
export NUMBRS_KEY="your_api_key"   # From Settings → API Keys`,
      },
      {
        label: "2. Collector script (save as collect-bitaxe.sh)",
        code: `#!/usr/bin/env bash
# Bitaxe collector for numbrs — run on any machine that can reach your miner
DEVICE_IP="\${BITAXE_IP:-192.168.1.100}"
NUMBRS_URL="\${NUMBRS_URL:-https://numbrs.lol/functions/v1/ingest}"
NUMBRS_KEY="\${NUMBRS_KEY}"

DATA=$(curl -sf "http://\${DEVICE_IP}/api/system/info") || { echo "Cannot reach Bitaxe"; exit 1; }

HR=$(echo "$DATA" | jq '.hashRate // 0')
TEMP=$(echo "$DATA" | jq '.temp // 0')
SA=$(echo "$DATA" | jq '.sharesAccepted // 0')
SR=$(echo "$DATA" | jq '.sharesRejected // 0')
BD=$(echo "$DATA" | jq '.bestDiff // 0')
PW=$(echo "$DATA" | jq '.power // 0')
UP=$(echo "$DATA" | jq '.uptimeSeconds // 0')
EFF=$(awk "BEGIN { print ($HR > 0) ? $PW / ($HR / 1000) : 0 }")

curl -sf -X POST "$NUMBRS_URL" \\
  -H "X-API-KEY: $NUMBRS_KEY" \\
  -H "Content-Type: application/json" \\
  -d "[
    {\\"key\\":\\"mining.bitaxe.hashrate\\",\\"value\\":$HR},
    {\\"key\\":\\"mining.bitaxe.temperature\\",\\"value\\":$TEMP},
    {\\"key\\":\\"mining.bitaxe.shares_accepted\\",\\"value\\":$SA},
    {\\"key\\":\\"mining.bitaxe.shares_rejected\\",\\"value\\":$SR},
    {\\"key\\":\\"mining.bitaxe.best_diff\\",\\"value\\":$BD},
    {\\"key\\":\\"mining.bitaxe.power\\",\\"value\\":$PW},
    {\\"key\\":\\"mining.bitaxe.efficiency\\",\\"value\\":$EFF},
    {\\"key\\":\\"mining.bitaxe.uptime\\",\\"value\\":$UP}
  ]"`,
      },
      {
        label: "3. Schedule with cron (every 5 minutes)",
        code: `chmod +x collect-bitaxe.sh
crontab -e
# Add: */5 * * * * /path/to/collect-bitaxe.sh`,
      },
    ],
  },
  {
    id: "braiins",
    icon: "🔥",
    name: "Braiins Mini Miner",
    category: "mining",
    description: "Monitor your Braiins Mini Miner — hashrate, pool stats, efficiency, temp, fan speed.",
    language: "bash",
    snippets: [
      {
        label: "1. Set environment variables",
        code: `export BRAIINS_IP="192.168.1.101"   # Your Braiins miner's local IP
export NUMBRS_URL="https://numbrs.lol/functions/v1/ingest"
export NUMBRS_KEY="your_api_key"   # From Settings → API Keys`,
      },
      {
        label: "2. Collector script (save as collect-braiins.sh)",
        code: `#!/usr/bin/env bash
# Braiins Mini Miner collector for numbrs
DEVICE_IP="\${BRAIINS_IP:-192.168.1.101}"
NUMBRS_URL="\${NUMBRS_URL:-https://numbrs.lol/functions/v1/ingest}"
NUMBRS_KEY="\${NUMBRS_KEY}"

DATA=$(curl -sf "http://\${DEVICE_IP}/cgi-bin/luci/admin/miner/api_status") || { echo "Cannot reach miner"; exit 1; }

HR=$(echo "$DATA" | jq '.summary[0].MHS_av // 0 | . / 1000000')
TEMP=$(echo "$DATA" | jq '.temps[0].Chip // 0')
FAN=$(echo "$DATA" | jq '.fans[0].RPM // 0')
PW=$(echo "$DATA" | jq '.summary[0].Power // 0')
ACC=$(echo "$DATA" | jq '.summary[0].Accepted // 0')
REJ=$(echo "$DATA" | jq '.summary[0].Rejected // 0')
UP=$(echo "$DATA" | jq '.summary[0].Elapsed // 0')
EFF=$(awk "BEGIN { print ($HR > 0) ? $PW / $HR : 0 }")

curl -sf -X POST "$NUMBRS_URL" \\
  -H "X-API-KEY: $NUMBRS_KEY" \\
  -H "Content-Type: application/json" \\
  -d "[
    {\\"key\\":\\"mining.braiins.hashrate\\",\\"value\\":$HR},
    {\\"key\\":\\"mining.braiins.temperature\\",\\"value\\":$TEMP},
    {\\"key\\":\\"mining.braiins.fan_speed\\",\\"value\\":$FAN},
    {\\"key\\":\\"mining.braiins.power\\",\\"value\\":$PW},
    {\\"key\\":\\"mining.braiins.efficiency\\",\\"value\\":$EFF},
    {\\"key\\":\\"mining.braiins.pool_accepted\\",\\"value\\":$ACC},
    {\\"key\\":\\"mining.braiins.pool_rejected\\",\\"value\\":$REJ},
    {\\"key\\":\\"mining.braiins.uptime\\",\\"value\\":$UP}
  ]"`,
      },
      {
        label: "3. Schedule with cron (every 5 minutes)",
        code: `chmod +x collect-braiins.sh
crontab -e
# Add: */5 * * * * /path/to/collect-braiins.sh`,
      },
    ],
  },
  {
    id: "github-actions",
    icon: "⚙️",
    name: "GitHub Actions",
    category: "developer",
    description: "Track deploys, test runs, and build metrics in your CI/CD pipeline",
    language: "yaml",
    snippets: [
      {
        label: "Track deploy count",
        code: `- name: Track deploy to numbrs
  run: |
    curl -sX POST https://numbrs.lol/functions/v1/ingest \\
      -H "x-api-key: \${{ secrets.NUMBRS_API_KEY }}" \\
      -H "Content-Type: application/json" \\
      -d '{"key": "deploy.count", "value": 1}'`,
      },
      {
        label: "Track build duration",
        code: `- name: Track build duration
  run: |
    curl -sX POST https://numbrs.lol/functions/v1/ingest \\
      -H "x-api-key: \${{ secrets.NUMBRS_API_KEY }}" \\
      -H "Content-Type: application/json" \\
      -d "{\\"key\\": \\"build.duration_ms\\", \\"value\\": $((SECONDS * 1000))}"`,
      },
    ],
  },
  {
    id: "vercel-webhook",
    icon: "▲",
    name: "Vercel Webhook",
    category: "developer",
    description: "Get notified on every deploy — track deploy frequency and status",
    language: "bash",
    snippets: [
      {
        label: "Setup instructions",
        code: `# 1. Go to your Vercel project → Settings → Git → Deploy Hooks
# 2. Create a new hook named "numbrs"
# 3. Copy the generated webhook URL
# 4. Use the numbrs ingest endpoint as a deploy hook target:

https://numbrs.lol/functions/v1/ingest?key=deploy.count&value=1&api_key=YOUR_KEY

# Or use a proxy script to POST on deploy completion`,
      },
      {
        label: "Track via vercel.json postBuild",
        code: `{
  "build": {
    "env": {
      "NUMBRS_KEY": "@numbrs_api_key"
    }
  }
}

# In your build script:
curl -sX POST https://numbrs.lol/functions/v1/ingest \\
  -H "x-api-key: $NUMBRS_KEY" \\
  -d '{"key": "deploy.count", "value": 1}'`,
      },
    ],
  },
  {
    id: "python",
    icon: "🐍",
    name: "Python",
    category: "developer",
    description: "Track metrics from Python scripts, ML training runs, or API servers",
    language: "python",
    snippets: [
      {
        label: "Simple helper",
        code: `import requests

def track(key: str, value: float, api_key: str):
    requests.post(
        "https://numbrs.lol/functions/v1/ingest",
        headers={"x-api-key": api_key},
        json={"key": key, "value": value}
    )

# Usage
track("model.inference_ms", 142.3, "nmbr_your_key")
track("training.loss", 0.0023, "nmbr_your_key")`,
      },
      {
        label: "Batch tracking",
        code: `import requests

def track_batch(metrics: list[dict], api_key: str):
    requests.post(
        "https://numbrs.lol/functions/v1/ingest",
        headers={"x-api-key": api_key},
        json=metrics
    )

track_batch([
    {"key": "epoch.loss", "value": 0.0023},
    {"key": "epoch.accuracy", "value": 0.98},
    {"key": "epoch.duration_s", "value": 45.2},
], "nmbr_your_key")`,
      },
    ],
  },
  {
    id: "nodejs",
    icon: "🟢",
    name: "Node.js",
    category: "developer",
    description: "Push metrics from Express, Next.js, or any Node.js application",
    language: "javascript",
    snippets: [
      {
        label: "Fetch-based helper",
        code: `async function track(key, value) {
  await fetch("https://numbrs.lol/functions/v1/ingest", {
    method: "POST",
    headers: {
      "x-api-key": "nmbr_your_key",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ key, value })
  });
}

// Usage
await track("api.requests", 1);
await track("api.latency_ms", 238);`,
      },
      {
        label: "Express middleware example",
        code: `app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    track("api.latency_ms", Date.now() - start);
    track("api.requests", 1);
  });
  next();
});`,
      },
    ],
  },
];

// ─── Claude Usage section ──────────────────────────────────────────────────────

const COLLECTOR_SCRIPT = `#!/usr/bin/env bash
# numbrs-claude-collector.sh — sync Claude Code + OpenClaw usage to numbrs
# Run every 5 min: */5 * * * * /path/to/numbrs-claude-collector.sh

NUMBRS_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
NUMBRS_SUPABASE_SERVICE_KEY="YOUR_SERVICE_KEY"
NUMBRS_OWNER_ID="YOUR_USER_ID"

python3 << 'PYEOF'
import json, os, glob, urllib.request
from collections import defaultdict
from datetime import datetime, timedelta

SB_URL = os.environ.get("NUMBRS_SUPABASE_URL", "")
SB_KEY = os.environ.get("NUMBRS_SUPABASE_SERVICE_KEY", "")
OWNER_ID = os.environ.get("NUMBRS_OWNER_ID", "")

# [Claude Code section]
PROJECTS_DIR = os.path.expanduser("~/.claude/projects")
cutoff = (datetime.now() - timedelta(hours=2)).timestamp()

def project_name(dir_name):
    # customize this for your username
    n = dir_name.replace("-Users-YOUR_USERNAME--", "").strip("-")
    return n or "workspace"

# ... [rest of script]
PYEOF`;

const CRON_EXAMPLE = `*/5 * * * * NUMBRS_SUPABASE_URL=https://YOUR_PROJECT.supabase.co NUMBRS_SUPABASE_SERVICE_KEY=YOUR_SERVICE_KEY NUMBRS_OWNER_ID=YOUR_USER_ID /path/to/numbrs-claude-collector.sh`;

const CLAUDE_SETUP_STEPS = [
  "Get your User ID from the numbrs Settings page (Profile → User ID)",
  "Get your Supabase service key from Settings → Advanced",
  "Download the collector script below",
  "Run it manually first to backfill recent history",
  "Add the cron job to run every 5 minutes",
];

function ClaudeSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <button
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-2xl shrink-0">🤖</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-foreground">Claude Code + OpenClaw</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Track token consumption, API equivalent costs, and session patterns — requires a local collector script
          </div>
        </div>
        <div className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="border-t border-border px-5 pb-5 pt-4 space-y-5"
        >
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              What it tracks
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span><strong className="text-foreground">Claude Code sessions</strong> — tokens in/out, estimated API cost, per-project breakdown</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span><strong className="text-foreground">OpenClaw sessions</strong> — AI assistant usage, session durations, tool call patterns</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              How it works
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A local Python script reads JSONL session files from{" "}
              <code className="font-mono bg-muted/50 px-1 py-0.5 rounded text-[11px]">~/.claude/projects/</code>{" "}
              (Claude Code) and{" "}
              <code className="font-mono bg-muted/50 px-1 py-0.5 rounded text-[11px]">~/.openclaw/agents/main/sessions/</code>{" "}
              (OpenClaw), aggregates usage stats, and pushes them to your numbrs instance via the Supabase API. No data ever leaves your machine except to your own database.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Setup
            </div>
            <ol className="space-y-2">
              {CLAUDE_SETUP_STEPS.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-xs text-muted-foreground">
                  <span className="shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Collector script
            </div>
            <CodeBlock code={COLLECTOR_SCRIPT} language="bash" />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Crontab entry (every 5 minutes)
            </div>
            <CodeBlock code={CRON_EXAMPLE} language="bash" />
            <p className="text-xs text-muted-foreground">
              Run{" "}
              <code className="font-mono bg-muted/50 px-1 py-0.5 rounded text-[11px]">crontab -e</code>{" "}
              and paste the line above, replacing the placeholder values with your actual credentials.
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Config dialogs ─────────────────────────────────────────────────────────────

function GitHubDialog({
  open,
  onClose,
  integration,
}: {
  open: boolean;
  onClose: () => void;
  integration: UserIntegration | undefined;
}) {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState((integration?.config as any)?.username ?? "");
  const [token, setToken] = useState((integration?.config as any)?.token ?? "");

  const upsertMutation = useMutation({
    mutationFn: () => upsertIntegration("github", { username, ...(token ? { token } : {}) }),
    onSuccess: () => {
      toast.success("GitHub connected");
      onClose();
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect GitHub</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="gh-username">GitHub username <span className="text-destructive">*</span></Label>
            <Input
              id="gh-username"
              placeholder="octocat"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gh-token">
              Personal access token{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="gh-token"
              type="password"
              placeholder="ghp_…"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Required for private repos and higher rate limits.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!username.trim() || upsertMutation.isPending}
            onClick={() => upsertMutation.mutate()}
          >
            {upsertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VercelDialog({
  open,
  onClose,
  integration,
}: {
  open: boolean;
  onClose: () => void;
  integration: UserIntegration | undefined;
}) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState((integration?.config as any)?.token ?? "");

  const upsertMutation = useMutation({
    mutationFn: () => upsertIntegration("vercel", { token }),
    onSuccess: () => {
      toast.success("Vercel connected");
      onClose();
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Vercel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="vercel-token">
              API token <span className="text-destructive">*</span>
            </Label>
            <Input
              id="vercel-token"
              type="password"
              placeholder="vercel_…"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Create a token at vercel.com/account/tokens
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!token.trim() || upsertMutation.isPending}
            onClick={() => upsertMutation.mutate()}
          >
            {upsertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FREDDialog({
  open,
  onClose,
  integration,
}: {
  open: boolean;
  onClose: () => void;
  integration: UserIntegration | undefined;
}) {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState((integration?.config as any)?.api_key ?? "");

  const upsertMutation = useMutation({
    mutationFn: () => upsertIntegration("fred", { api_key: apiKey }),
    onSuccess: () => {
      toast.success("FRED connected");
      onClose();
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect FRED</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="fred-key">
              API key <span className="text-destructive">*</span>
            </Label>
            <Input
              id="fred-key"
              type="password"
              placeholder="abcdef1234567890abcdef1234567890"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Free key at fred.stlouisfed.org/docs/api/api_key.html
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!apiKey.trim() || upsertMutation.isPending}
            onClick={() => upsertMutation.mutate()}
          >
            {upsertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WeatherDialog({
  open,
  onClose,
  integration,
}: {
  open: boolean;
  onClose: () => void;
  integration: UserIntegration | undefined;
}) {
  const queryClient = useQueryClient();
  const [locationName, setLocationName] = useState((integration?.config as any)?.location_name ?? "");
  const [latitude, setLatitude] = useState(String((integration?.config as any)?.latitude ?? ""));
  const [longitude, setLongitude] = useState(String((integration?.config as any)?.longitude ?? ""));
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");

  const geocodeLocation = async () => {
    const q = locationName.trim();
    if (!q) return;
    setGeoLoading(true);
    setGeoError("");
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`
      );
      const data = await res.json();
      if (data.results?.length) {
        const { latitude: lat, longitude: lon, name, country } = data.results[0];
        setLatitude(String(lat));
        setLongitude(String(lon));
        setLocationName(`${name}, ${country}`);
        setGeoError("");
      } else {
        setGeoError("Location not found — try a different name");
      }
    } catch {
      setGeoError("Geocoding failed — enter coordinates manually");
    } finally {
      setGeoLoading(false);
    }
  };

  const upsertMutation = useMutation({
    mutationFn: () =>
      upsertIntegration("weather", {
        location_name: locationName.trim(),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      }),
    onSuccess: () => {
      toast.success("Weather connected");
      onClose();
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canSave =
    locationName.trim().length > 0 &&
    !isNaN(parseFloat(latitude)) &&
    !isNaN(parseFloat(longitude)) &&
    !upsertMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Weather</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="weather-location">
              Location <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="weather-location"
                placeholder="Prague, New York, Tokyo..."
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    geocodeLocation();
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={geocodeLocation}
                disabled={!locationName.trim() || geoLoading}
              >
                {geoLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Lookup"}
              </Button>
            </div>
            {geoError && (
              <p className="text-xs text-destructive">{geoError}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="weather-lat">Latitude</Label>
              <Input
                id="weather-lat"
                placeholder="50.0755"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weather-lon">Longitude</Label>
              <Input
                id="weather-lon"
                placeholder="14.4378"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Type a city name and click Lookup to auto-fill coordinates, or enter them manually.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!canSave} onClick={() => upsertMutation.mutate()}>
            {upsertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Difficulty + type badge helpers ──────────────────────────────────────────

function DifficultyBadge({ difficulty }: { difficulty: CatalogIntegration["difficulty"] }) {
  return (
    <span
      className={cn(
        "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
        difficulty === "easy" && "bg-success/15 text-success",
        difficulty === "medium" && "bg-amber-500/15 text-amber-400",
        difficulty === "advanced" && "bg-destructive/15 text-destructive"
      )}
    >
      {difficulty}
    </span>
  );
}

function TypeBadge({ type }: { type: CatalogIntegration["type"] }) {
  if (type === "server-side") return null;
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
      {type === "collector" ? "script" : "manual"}
    </span>
  );
}

// ─── Generic server-side one-click card ───────────────────────────────────────

function ServerSideCard({
  catalogEntry,
  integration,
  featured = false,
}: {
  catalogEntry: CatalogIntegration;
  integration: UserIntegration | undefined;
  featured?: boolean;
}) {
  const queryClient = useQueryClient();

  const upsertMutation = useMutation({
    mutationFn: () => upsertIntegration(catalogEntry.id, {}),
    onSuccess: () => {
      toast.success(`${catalogEntry.name} enabled`);
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteIntegration(catalogEntry.id),
    onSuccess: () => {
      toast.success(`${catalogEntry.name} removed`);
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (active: boolean) => toggleIntegration(catalogEntry.id, active),
    onSuccess: (_, active) => {
      toast.success(active ? `${catalogEntry.name} enabled` : `${catalogEntry.name} paused`);
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const connected = !!integration;
  const busy = upsertMutation.isPending || deleteMutation.isPending || toggleMutation.isPending;

  // Show first 2–3 concrete metric keys (skip template keys with {placeholder})
  const previewKeys = catalogEntry.metrics
    .filter((m) => !m.key.includes("{"))
    .slice(0, 3)
    .map((m) => m.key);

  const card = (
    <div
      className={cn(
        "rounded-xl border bg-card flex flex-col gap-3 transition-all",
        featured ? "p-5 hover:border-primary/40" : "p-4",
        connected ? "border-success/30" : "border-border hover:border-border/80"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className={cn("shrink-0", featured ? "text-2xl" : "text-xl")}>{catalogEntry.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn("font-semibold text-foreground", featured ? "text-sm" : "text-sm")}>
              {catalogEntry.name}
            </span>
            {connected && (
              <span
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                  integration.is_active
                    ? "bg-success/15 text-success"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {integration.is_active ? "Active" : "Paused"}
              </span>
            )}
            {catalogEntry.free && !connected && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                Free
              </span>
            )}
          </div>
          <p className={cn("text-muted-foreground mt-0.5", featured ? "text-xs" : "text-[11px]")}>
            {catalogEntry.description}
          </p>
        </div>
      </div>

      {/* Status + metrics */}
      {connected && (
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            {formatSyncTime(integration.last_synced_at)}
          </p>
          {previewKeys.length > 0 && (
            <MetricPreview keys={previewKeys} />
          )}
          {integration.last_error && (
            <p className="text-[11px] text-destructive flex items-start gap-1">
              <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
              {integration.last_error}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto">
        {connected ? (
          <>
            <Switch
              checked={integration.is_active}
              disabled={busy}
              onCheckedChange={(v) => toggleMutation.mutate(v)}
            />
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => deleteMutation.mutate()}
              className="text-muted-foreground hover:text-destructive text-xs h-7 ml-auto"
            >
              {busy && deleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove"}
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            disabled={busy}
            onClick={() => upsertMutation.mutate()}
            className="h-7 text-xs"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Enable"}
          </Button>
        )}
      </div>
    </div>
  );

  if (featured && !connected) {
    return (
      <div className="rounded-xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-px">
        {card}
      </div>
    );
  }

  return card;
}

// ─── Config card (for integrations needing API key / setup) ───────────────────

function ConfigCard({
  catalogEntry,
  integration,
}: {
  catalogEntry: CatalogIntegration;
  integration: UserIntegration | undefined;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Weather also supports toggle
  const hasToggle = catalogEntry.id === "weather";

  const deleteMutation = useMutation({
    mutationFn: () => deleteIntegration(catalogEntry.id),
    onSuccess: () => {
      toast.success(`${catalogEntry.name} disconnected`);
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (active: boolean) => toggleIntegration(catalogEntry.id, active),
    onSuccess: (_, active) => {
      toast.success(active ? `${catalogEntry.name} enabled` : `${catalogEntry.name} paused`);
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const connected = !!integration;
  const busy = deleteMutation.isPending || toggleMutation.isPending;

  const handleOpen = () => {
    setOpen(true);
  };

  // Context-specific detail shown when connected
  const connectedDetail = () => {
    if (catalogEntry.id === "github") {
      return (integration?.config as any)?.username ? `@${(integration?.config as any)?.username}` : null;
    }
    if (catalogEntry.id === "weather") {
      return (integration?.config as any)?.location_name ?? null;
    }
    return null;
  };

  const detail = connectedDetail();

  return (
    <>
      <div
        className={cn(
          "rounded-xl border bg-card p-4 flex flex-col gap-3 transition-all",
          connected ? "border-success/30" : "border-border hover:border-border/80"
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <span className="text-xl shrink-0">{catalogEntry.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm text-foreground">{catalogEntry.name}</span>
              {connected && (
                <span
                  className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                    hasToggle
                      ? integration!.is_active
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground"
                      : "bg-success/15 text-success"
                  )}
                >
                  {hasToggle ? (integration!.is_active ? "Active" : "Paused") : "Connected"}
                </span>
              )}
              {catalogEntry.free && !connected && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  Free key
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{catalogEntry.description}</p>
          </div>
        </div>

        {/* Status */}
        {connected && (
          <div className="space-y-1">
            {detail && (
              <p className="text-[11px] text-muted-foreground">{detail}</p>
            )}
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              {formatSyncTime(integration!.last_synced_at)}
            </p>
            {integration!.last_error && (
              <p className="text-[11px] text-destructive flex items-start gap-1">
                <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                {integration!.last_error}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto">
          {connected ? (
            <>
              {hasToggle && (
                <Switch
                  checked={integration!.is_active}
                  disabled={busy}
                  onCheckedChange={(v) => toggleMutation.mutate(v)}
                />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpen}
                className="h-7 text-xs"
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => deleteMutation.mutate()}
                className="text-muted-foreground hover:text-destructive text-xs h-7 ml-auto"
              >
                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Disconnect"}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={handleOpen} className="h-7 text-xs">
              Connect
            </Button>
          )}
        </div>
      </div>

      {/* Config dialog — specific to integration ID */}
      {catalogEntry.id === "github" && (
        <GitHubDialog open={open} onClose={() => setOpen(false)} integration={integration} />
      )}
      {catalogEntry.id === "vercel" && (
        <VercelDialog open={open} onClose={() => setOpen(false)} integration={integration} />
      )}
      {catalogEntry.id === "fred" && (
        <FREDDialog open={open} onClose={() => setOpen(false)} integration={integration} />
      )}
      {catalogEntry.id === "weather" && (
        <WeatherDialog open={open} onClose={() => setOpen(false)} integration={integration} />
      )}
    </>
  );
}

// ─── Collector/info card (non-server-side catalog entries) ────────────────────

function CatalogInfoCard({ entry }: { entry: CatalogIntegration }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0">{entry.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{entry.name}</span>
            <DifficultyBadge difficulty={entry.difficulty} />
            <TypeBadge type={entry.type} />
            {entry.free && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                Free
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{entry.description}</p>
        </div>
      </div>
      {entry.metrics.length > 0 && (
        <p className="text-[10px] text-muted-foreground/60 font-mono truncate">
          {entry.metrics.slice(0, 2).map((m) => m.key).join(" · ")}
          {entry.metrics.length > 2 ? ` +${entry.metrics.length - 2} more` : ""}
        </p>
      )}
      <div className="mt-auto">
        <span className="text-[10px] text-muted-foreground/60 italic">
          Collector script required — see Manual section below
        </span>
      </div>
    </div>
  );
}

// ─── Render the right card type for a catalog entry ───────────────────────────

function CatalogCard({
  entry,
  integration,
}: {
  entry: CatalogIntegration;
  integration: UserIntegration | undefined;
}) {
  if (entry.type !== "server-side") {
    return <CatalogInfoCard entry={entry} />;
  }
  if (entry.setupType === "one-click") {
    return <ServerSideCard catalogEntry={entry} integration={integration} />;
  }
  // api-key server-side
  return <ConfigCard catalogEntry={entry} integration={integration} />;
}

// ─── Quick Start Banner ────────────────────────────────────────────────────────

function QuickStartBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem("integrations_banner_dismissed") === "true"
  );

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem("integrations_banner_dismissed", "true");
    setDismissed(true);
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
      <Info className="h-4 w-4 text-primary shrink-0" />
      <p className="text-xs text-muted-foreground flex-1">
        New to numbrs?{" "}
        <a
          href="https://docs.numbrs.lol/getting-started/quick-start/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline font-medium"
        >
          Start with the Quick Start guide →
        </a>
      </p>
      <button
        onClick={handleDismiss}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Category filter bar ──────────────────────────────────────────────────────

function CategoryFilter({
  active,
  onChange,
}: {
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
      {CATALOG_CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={cn(
            "shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap",
            active === cat.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <span>{cat.icon}</span>
          <span>{cat.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const FEATURED_IDS = ["bitcoin", "mempool", "fng", "lightning"];

export default function IntegrationsPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const { data: integrations = [], isLoading: integrationsLoading } = useQuery({
    queryKey: ["user-integrations"],
    queryFn: fetchIntegrations,
    retry: 1,
  });

  const byProvider = useMemo(
    () => Object.fromEntries(integrations.map((i) => [i.provider, i])),
    [integrations]
  );

  const isFiltered = !!search || activeCategory !== "all";
  const q = search.toLowerCase();

  // Filter catalog entries
  const filteredCatalog = useMemo(() => {
    return INTEGRATION_CATALOG.filter((entry) => {
      if (activeCategory !== "all" && entry.category !== activeCategory) return false;
      if (q && !entry.name.toLowerCase().includes(q) && !entry.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [activeCategory, q]);

  // Sort: enabled first, then by category order
  const sortedCatalog = useMemo(() => {
    return [...filteredCatalog].sort((a, b) => {
      const aEnabled = !!byProvider[a.id];
      const bEnabled = !!byProvider[b.id];
      if (aEnabled && !bEnabled) return -1;
      if (!aEnabled && bEnabled) return 1;
      return 0;
    });
  }, [filteredCatalog, byProvider]);

  // Featured entries (only shown when no filter/search active)
  const featuredEntries = useMemo(
    () => INTEGRATION_CATALOG.filter((e) => FEATURED_IDS.includes(e.id)),
    []
  );

  // Filter manual integrations
  const filteredManual = useMemo(() => {
    if (activeCategory !== "all" && !["developer", "infrastructure", "mining"].includes(activeCategory)) {
      return [];
    }
    return INTEGRATIONS.filter((i) => {
      if (activeCategory !== "all" && i.category !== activeCategory) return false;
      if (q && !i.name.toLowerCase().includes(q) && !i.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [activeCategory, q]);

  const showManualSection = filteredManual.length > 0;
  const showClaudeSection =
    (activeCategory === "all" || activeCategory === "developer") &&
    (!q || "claude openclaw ai token".includes(q));

  return (
    <div className="space-y-10">
      <QuickStartBanner />

      {/* Header */}
      <div>
        <h1 className="font-mono text-xl font-semibold text-foreground">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect data sources to power your dashboards
        </p>
      </div>

      {/* Search + category filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search integrations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-card pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
          />
        </div>
        <CategoryFilter active={activeCategory} onChange={setActiveCategory} />
      </div>

      {/* Featured section — only when no filter/search */}
      <AnimatePresence>
        {!isFiltered && (
          <motion.div
            key="featured"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-primary" />
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Featured — free &amp; instant
              </h2>
            </div>
            {integrationsLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 rounded-xl bg-card border border-border animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {featuredEntries.map((entry) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <ServerSideCard
                      catalogEntry={entry}
                      integration={byProvider[entry.id]}
                      featured
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* All integrations grid */}
      <div>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          {isFiltered ? "Results" : "All Integrations"}
          {filteredCatalog.length > 0 && (
            <span className="ml-2 text-muted-foreground/50 normal-case tracking-normal font-normal">
              {filteredCatalog.length} sources
            </span>
          )}
        </h2>

        {integrationsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : sortedCatalog.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-sm text-muted-foreground">No integrations found for "{search}"</p>
            <button
              onClick={() => { setSearch(""); setActiveCategory("all"); }}
              className="text-xs text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedCatalog.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
              >
                <CatalogCard entry={entry} integration={byProvider[entry.id]} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Manual / Developer section */}
      {showManualSection && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Manual &amp; Developer Integrations
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Push data from scripts, CI/CD, or your own code using the ingest API.
          </p>

          {/* One-liner quick start */}
          {(activeCategory === "all" || activeCategory === "developer") && !q && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 mb-4">
              <div className="flex items-start gap-4">
                <div className="shrink-0 rounded-lg bg-primary/10 p-2.5">
                  <span className="text-xl">⚡</span>
                </div>
                <div className="space-y-2 flex-1">
                  <div className="font-semibold text-sm text-foreground">One endpoint, any metric</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Push any numeric value to numbrs using your API key. Pick a metric key (like{" "}
                    <code className="font-mono bg-muted/50 px-1 py-0.5 rounded text-[11px]">cpu.usage</code>{" "}
                    or{" "}
                    <code className="font-mono bg-muted/50 px-1 py-0.5 rounded text-[11px]">deploy.count</code>
                    ) and we handle storage, graphing, and alerting. Get your API key from{" "}
                    <span className="text-primary">Settings → API Keys</span>.
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <CodeBlock code={`POST https://numbrs.lol/functions/v1/ingest\nx-api-key: YOUR_KEY\nContent-Type: application/json\n\n{"key": "my.metric", "value": 42}`} />
              </div>
            </div>
          )}

          <div className="space-y-3">
            {filteredManual.map((integration, i) => (
              <motion.div
                key={integration.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <IntegrationCard integration={integration} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Claude AI Usage section */}
      {showClaudeSection && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Claude AI Usage
            </h2>
          </div>
          <ClaudeSection />
        </div>
      )}

      {/* Footer note */}
      {activeCategory === "all" && !search && (
        <div className="rounded-lg border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
          <strong className="text-foreground">Need a different integration?</strong> numbrs supports
          any HTTP client. If you have a metric as a number, you can push it. Open an issue or PR on
          GitHub to add more integrations to this page.
        </div>
      )}
    </div>
  );
}
