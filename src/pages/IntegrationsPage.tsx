import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Check, Copy, ChevronDown, ChevronUp, Bot, Info, X, Loader2, AlertCircle, RefreshCw, Zap, Search } from "lucide-react";
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
import {
  fetchIntegrations,
  upsertIntegration,
  deleteIntegration,
  toggleIntegration,
  type UserIntegration,
} from "@/lib/integrations-api";
import { CATALOG_CATEGORIES } from "@/lib/integration-catalog";
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

// ─── Integration card (manual) ────────────────────────────────────────────────

interface Integration {
  id: string;
  icon: string;
  name: string;
  description: string;
  category: string;
  language?: string;
  snippets: { label: string; code: string; language?: string }[];
}

function IntegrationCard({ integration }: { integration: Integration }) {
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

// ─── Integration definitions ───────────────────────────────────────────────────

const INTEGRATIONS: Integration[] = [
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

// ─── CoinGecko card ───────────────────────────────────────────────────────────

function CoinGeckoCard({ integration }: { integration: UserIntegration | undefined }) {
  const queryClient = useQueryClient();

  const upsertMutation = useMutation({
    mutationFn: () => upsertIntegration("coingecko", {}),
    onSuccess: () => {
      toast.success("CoinGecko tracking enabled");
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteIntegration("coingecko"),
    onSuccess: () => {
      toast.success("CoinGecko integration removed");
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (active: boolean) => toggleIntegration("coingecko", active),
    onSuccess: (_, active) => {
      toast.success(active ? "CoinGecko tracking enabled" : "CoinGecko tracking paused");
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const connected = !!integration;
  const busy = upsertMutation.isPending || deleteMutation.isPending || toggleMutation.isPending;

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4">
      <span className="text-2xl shrink-0 mt-0.5">🦎</span>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground">CoinGecko</span>
          {connected && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${integration.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
              {integration.is_active ? "Active" : "Paused"}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          BTC dominance, total market cap, 24h volume, and active cryptocurrencies. No config needed.
        </p>
        {connected && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            {formatSyncTime(integration.last_synced_at)}
          </p>
        )}
        {integration?.last_error && (
          <p className="text-xs text-destructive flex items-start gap-1">
            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
            {integration.last_error}
          </p>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-2">
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
              className="text-muted-foreground hover:text-destructive text-xs h-7"
            >
              Remove
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
}

// ─── FRED card ────────────────────────────────────────────────────────────────

function FREDCard({ integration }: { integration: UserIntegration | undefined }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState(
    (integration?.config as any)?.api_key ?? ""
  );

  const upsertMutation = useMutation({
    mutationFn: () => upsertIntegration("fred", { api_key: apiKey }),
    onSuccess: () => {
      toast.success("FRED connected");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteIntegration("fred"),
    onSuccess: () => {
      toast.success("FRED disconnected");
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const connected = !!integration;
  const busy = deleteMutation.isPending;

  const handleOpen = () => {
    setApiKey((integration?.config as any)?.api_key ?? "");
    setOpen(true);
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4">
        <span className="text-2xl shrink-0 mt-0.5">🏛️</span>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">FRED (M2 / CPI)</span>
            {connected && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-success/15 text-success">
                Connected
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            US M2 money supply, CPI, and Fed funds rate from the Federal Reserve. Free API key required.
          </p>
          {connected && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              {formatSyncTime(integration.last_synced_at)}
            </p>
          )}
          {integration?.last_error && (
            <p className="text-xs text-destructive flex items-start gap-1">
              <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
              {integration.last_error}
            </p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {connected ? (
            <>
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
                className="text-muted-foreground hover:text-destructive text-xs h-7"
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

      <Dialog open={open} onOpenChange={setOpen}>
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
                Free key at{" "}
                <span className="text-primary">fred.stlouisfed.org/docs/api/api_key.html</span>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!apiKey.trim() || upsertMutation.isPending}
              onClick={() => upsertMutation.mutate()}
            >
              {upsertMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Server-side integration helpers ──────────────────────────────────────────

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

// ─── Bitcoin card ─────────────────────────────────────────────────────────────

function BitcoinCard({ integration }: { integration: UserIntegration | undefined }) {
  const queryClient = useQueryClient();

  const upsertMutation = useMutation({
    mutationFn: () => upsertIntegration("bitcoin", {}),
    onSuccess: () => {
      toast.success("Bitcoin price tracking enabled");
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteIntegration("bitcoin"),
    onSuccess: () => {
      toast.success("Bitcoin integration removed");
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (active: boolean) => toggleIntegration("bitcoin", active),
    onSuccess: (_, active) => {
      toast.success(active ? "Bitcoin tracking enabled" : "Bitcoin tracking paused");
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const connected = !!integration;
  const busy = upsertMutation.isPending || deleteMutation.isPending || toggleMutation.isPending;

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4">
      <span className="text-2xl shrink-0 mt-0.5">₿</span>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground">Bitcoin Price</span>
          {connected && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${integration.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
              {integration.is_active ? "Active" : "Paused"}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Tracks BTC/USD price automatically. No config needed.
        </p>
        {connected && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            {formatSyncTime(integration.last_synced_at)}
          </p>
        )}
        {integration?.last_error && (
          <p className="text-xs text-destructive flex items-start gap-1">
            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
            {integration.last_error}
          </p>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-2">
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
              className="text-muted-foreground hover:text-destructive text-xs h-7"
            >
              Remove
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
}

// ─── Mempool card ─────────────────────────────────────────────────────────────

function MempoolCard({ integration }: { integration: UserIntegration | undefined }) {
  const queryClient = useQueryClient();

  const upsertMutation = useMutation({
    mutationFn: () => upsertIntegration("mempool", {}),
    onSuccess: () => {
      toast.success("Mempool tracking enabled");
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteIntegration("mempool"),
    onSuccess: () => {
      toast.success("Mempool integration removed");
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (active: boolean) => toggleIntegration("mempool", active),
    onSuccess: (_, active) => {
      toast.success(active ? "Mempool tracking enabled" : "Mempool tracking paused");
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const connected = !!integration;
  const busy = upsertMutation.isPending || deleteMutation.isPending || toggleMutation.isPending;

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4">
      <span className="text-2xl shrink-0 mt-0.5">⛓️</span>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground">Mempool.space</span>
          {connected && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${integration.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
              {integration.is_active ? "Active" : "Paused"}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Fee rates, hashrate, difficulty, block height, and mempool stats. No config needed.
        </p>
        {connected && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            {formatSyncTime(integration.last_synced_at)}
          </p>
        )}
        {integration?.last_error && (
          <p className="text-xs text-destructive flex items-start gap-1">
            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
            {integration.last_error}
          </p>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-2">
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
              className="text-muted-foreground hover:text-destructive text-xs h-7"
            >
              Remove
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
}

// ─── GitHub card ──────────────────────────────────────────────────────────────

function GitHubCard({ integration }: { integration: UserIntegration | undefined }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState(
    (integration?.config as any)?.username ?? ""
  );
  const [token, setToken] = useState(
    (integration?.config as any)?.token ?? ""
  );

  const upsertMutation = useMutation({
    mutationFn: () =>
      upsertIntegration("github", { username, ...(token ? { token } : {}) }),
    onSuccess: () => {
      toast.success("GitHub connected");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteIntegration("github"),
    onSuccess: () => {
      toast.success("GitHub disconnected");
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const connected = !!integration;
  const busy = deleteMutation.isPending;

  const handleOpen = () => {
    setUsername((integration?.config as any)?.username ?? "");
    setToken((integration?.config as any)?.token ?? "");
    setOpen(true);
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4">
        <span className="text-2xl shrink-0 mt-0.5">🐙</span>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">GitHub Stats</span>
            {connected && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-success/15 text-success">
                Connected
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Tracks stars, forks, commits, and PR activity across your repos.
          </p>
          {connected && (
            <p className="text-xs text-muted-foreground">
              @{(integration.config as any)?.username}
              {" · "}
              <span className="flex items-center gap-1 inline-flex">
                <RefreshCw className="h-3 w-3" />
                {formatSyncTime(integration.last_synced_at)}
              </span>
            </p>
          )}
          {integration?.last_error && (
            <p className="text-xs text-destructive flex items-start gap-1">
              <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
              {integration.last_error}
            </p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {connected ? (
            <>
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
                className="text-muted-foreground hover:text-destructive text-xs h-7"
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

      <Dialog open={open} onOpenChange={setOpen}>
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
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!username.trim() || upsertMutation.isPending}
              onClick={() => upsertMutation.mutate()}
            >
              {upsertMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Vercel card ──────────────────────────────────────────────────────────────

function VercelCard({ integration }: { integration: UserIntegration | undefined }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState(
    (integration?.config as any)?.token ?? ""
  );

  const upsertMutation = useMutation({
    mutationFn: () => upsertIntegration("vercel", { token }),
    onSuccess: () => {
      toast.success("Vercel connected");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteIntegration("vercel"),
    onSuccess: () => {
      toast.success("Vercel disconnected");
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const connected = !!integration;
  const busy = deleteMutation.isPending;

  const handleOpen = () => {
    setToken((integration?.config as any)?.token ?? "");
    setOpen(true);
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4">
        <span className="text-2xl shrink-0 mt-0.5">▲</span>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">Vercel</span>
            {connected && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-success/15 text-success">
                Connected
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Tracks deployments, build times, and project activity across your Vercel projects.
          </p>
          {connected && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              {formatSyncTime(integration.last_synced_at)}
            </p>
          )}
          {integration?.last_error && (
            <p className="text-xs text-destructive flex items-start gap-1">
              <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
              {integration.last_error}
            </p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {connected ? (
            <>
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
                className="text-muted-foreground hover:text-destructive text-xs h-7"
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

      <Dialog open={open} onOpenChange={setOpen}>
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
                Create one at vercel.com → Account Settings → Tokens.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!token.trim() || upsertMutation.isPending}
              onClick={() => upsertMutation.mutate()}
            >
              {upsertMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Weather card ─────────────────────────────────────────────────────────────

function WeatherCard({ integration }: { integration: UserIntegration | undefined }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [locationName, setLocationName] = useState(
    (integration?.config as any)?.location_name ?? ""
  );
  const [latitude, setLatitude] = useState(
    String((integration?.config as any)?.latitude ?? "")
  );
  const [longitude, setLongitude] = useState(
    String((integration?.config as any)?.longitude ?? "")
  );

  const upsertMutation = useMutation({
    mutationFn: () =>
      upsertIntegration("weather", {
        location_name: locationName.trim(),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      }),
    onSuccess: () => {
      toast.success("Weather connected");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteIntegration("weather"),
    onSuccess: () => {
      toast.success("Weather integration removed");
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (active: boolean) => toggleIntegration("weather", active),
    onSuccess: (_, active) => {
      toast.success(active ? "Weather tracking enabled" : "Weather tracking paused");
      queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const connected = !!integration;
  const busy = deleteMutation.isPending || toggleMutation.isPending;

  const handleOpen = () => {
    setLocationName((integration?.config as any)?.location_name ?? "");
    setLatitude(String((integration?.config as any)?.latitude ?? ""));
    setLongitude(String((integration?.config as any)?.longitude ?? ""));
    setOpen(true);
  };

  const canSave =
    locationName.trim().length > 0 &&
    !isNaN(parseFloat(latitude)) &&
    !isNaN(parseFloat(longitude)) &&
    !upsertMutation.isPending;

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4">
        <span className="text-2xl shrink-0 mt-0.5">🌤️</span>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">Weather</span>
            {connected && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${integration.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                {integration.is_active ? "Active" : "Paused"}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Temperature, humidity, rain, snow, wind, and UV via Open-Meteo. Free, no API key needed.
          </p>
          {connected && (
            <p className="text-xs text-muted-foreground">
              {(integration.config as any)?.location_name}
              {" · "}
              <span className="inline-flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                {formatSyncTime(integration.last_synced_at)}
              </span>
            </p>
          )}
          {integration?.last_error && (
            <p className="text-xs text-destructive flex items-start gap-1">
              <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
              {integration.last_error}
            </p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {connected ? (
            <>
              <Switch
                checked={integration.is_active}
                disabled={busy}
                onCheckedChange={(v) => toggleMutation.mutate(v)}
              />
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
                className="text-muted-foreground hover:text-destructive text-xs h-7"
              >
                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove"}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={handleOpen} className="h-7 text-xs">
              Connect
            </Button>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Weather</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="weather-location">
                Location name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="weather-location"
                placeholder="Home"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Used as a metric key prefix, e.g. <code className="font-mono bg-muted/50 px-1 rounded text-[11px]">weather.home.temperature</code>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="weather-lat">
                  Latitude <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="weather-lat"
                  placeholder="40.7128"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weather-lon">
                  Longitude <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="weather-lon"
                  placeholder="-74.0060"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Find your coordinates at{" "}
              <span className="text-primary">latlong.net</span> or right-click any location in Google Maps.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!canSave} onClick={() => upsertMutation.mutate()}>
              {upsertMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Server-side integrations section ─────────────────────────────────────────

// Map each server-side provider to a category for filtering
const SERVER_SIDE_CATEGORIES: Record<string, string> = {
  bitcoin: "bitcoin",
  mempool: "bitcoin",
  github: "developer",
  vercel: "developer",
  weather: "weather",
  coingecko: "finance",
  fred: "finance",
};

// Search terms per card (name + description)
const SERVER_SIDE_SEARCH: Record<string, string> = {
  bitcoin: "bitcoin price btc usd coinbase",
  mempool: "mempool bitcoin fees hashrate difficulty block height",
  github: "github stars forks issues repos developer",
  vercel: "vercel deploy build duration project developer",
  weather: "weather temperature humidity rain snow wind uv open-meteo",
  coingecko: "coingecko crypto market cap btc dominance volume altcoin",
  fred: "fred m2 money supply cpi inflation federal reserve interest rate",
};

interface FilterProps {
  activeCategory: string;
  search: string;
}

function ServerSideIntegrations({ activeCategory, search }: FilterProps) {
  const { data: integrations = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["user-integrations"],
    queryFn: fetchIntegrations,
    retry: 1,
  });

  const byProvider = Object.fromEntries(
    integrations.map((i) => [i.provider, i])
  );

  const providers = ["bitcoin", "mempool", "github", "vercel", "weather", "coingecko", "fred"];
  const q = search.toLowerCase();

  const visible = providers.filter((p) => {
    if (activeCategory !== "all" && SERVER_SIDE_CATEGORIES[p] !== activeCategory) return false;
    if (q && !SERVER_SIDE_SEARCH[p].includes(q)) return false;
    return true;
  });

  if (visible.length === 0) return null;

  const renderCard = (provider: string) => {
    switch (provider) {
      case "bitcoin":   return <BitcoinCard    key="bitcoin"   integration={byProvider["bitcoin"]}   />;
      case "mempool":   return <MempoolCard    key="mempool"   integration={byProvider["mempool"]}   />;
      case "github":    return <GitHubCard     key="github"    integration={byProvider["github"]}    />;
      case "vercel":    return <VercelCard     key="vercel"    integration={byProvider["vercel"]}    />;
      case "weather":   return <WeatherCard    key="weather"   integration={byProvider["weather"]}   />;
      case "coingecko": return <CoinGeckoCard  key="coingecko" integration={byProvider["coingecko"]} />;
      case "fred":      return <FREDCard       key="fred"      integration={byProvider["fred"]}      />;
      default: return null;
    }
  };

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Could not load server-side integrations. Please refresh.
          </p>
          <button
            onClick={() => refetch()}
            className="text-xs text-primary hover:underline"
          >
            Retry
          </button>
        </div>
      ) : (
        visible.map(renderCard)
      )}
    </div>
  );
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

// Only show categories that have actual integrations on this page
const PAGE_CATEGORIES = CATALOG_CATEGORIES.filter((c) =>
  ["all", "bitcoin", "finance", "weather", "developer", "infrastructure"].includes(c.id)
);

interface CategoryFilterProps {
  active: string;
  onChange: (id: string) => void;
}

function CategoryFilter({ active, onChange }: CategoryFilterProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
      {PAGE_CATEGORIES.map((cat) => (
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

export default function IntegrationsPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const q = search.toLowerCase();

  // Filter manual integrations
  const filteredManual = useMemo(() => {
    return INTEGRATIONS.filter((i) => {
      if (activeCategory !== "all" && i.category !== activeCategory) return false;
      if (q && !i.name.toLowerCase().includes(q) && !i.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [activeCategory, q]);

  // Show the manual section wrapper when there's something to show
  const showManualSection =
    (activeCategory === "all" || ["developer", "infrastructure"].includes(activeCategory)) &&
    filteredManual.length > 0;

  // Show Claude section only when relevant
  const showClaudeSection =
    (activeCategory === "all" || activeCategory === "developer") &&
    (!q || "claude openclaw ai token".includes(q));

  // Show server-side section when relevant categories are selected
  const showServerSideSection =
    activeCategory === "all" ||
    ["bitcoin", "weather", "developer", "finance"].includes(activeCategory);

  return (
    <div className="space-y-8">
      <QuickStartBanner />
      <div>
        <h1 className="font-mono text-xl font-semibold text-foreground">Integrations</h1>
        <p className="text-metric-sm text-muted-foreground mt-1">
          Connect any data source. Push metrics with a single HTTP call.
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

      {/* Server-side integrations */}
      {showServerSideSection && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Server-Side Integrations
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            These run automatically — no scripts needed.
          </p>
          <ServerSideIntegrations activeCategory={activeCategory} search={search} />
        </div>
      )}

      {/* Manual integrations */}
      {showManualSection && (
        <div>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Manual Integrations
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Push data from scripts, CI/CD, or your own code.
          </p>

          {/* Quick start — only show when not filtering to a specific non-developer category */}
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

      {/* Claude Usage section */}
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

      {/* Empty state */}
      {!showServerSideSection && !showManualSection && !showClaudeSection && (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-sm text-muted-foreground">No integrations found for "{search}"</p>
          <button
            onClick={() => { setSearch(""); setActiveCategory("all"); }}
            className="text-xs text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Footer note */}
      {(activeCategory === "all" || !search) && (
        <div className="rounded-lg border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
          <strong className="text-foreground">Need a different integration?</strong> numbrs supports
          any HTTP client. If you have a metric as a number, you can push it. Open an issue or PR on
          GitHub to add more integrations to this page.
        </div>
      )}
    </div>
  );
}
