import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Check, Copy, ChevronDown, ChevronUp } from "lucide-react";
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

// ─── Integration card ──────────────────────────────────────────────────────────

interface Integration {
  id: string;
  icon: string;
  name: string;
  description: string;
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
    id: "vercel",
    icon: "▲",
    name: "Vercel Webhook",
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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-mono text-xl font-semibold text-foreground">Integrations</h1>
        <p className="text-metric-sm text-muted-foreground mt-1">
          Connect any data source. Push metrics with a single HTTP call.
        </p>
      </div>

      {/* Quick start banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
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

      {/* Integration cards */}
      <div>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Available integrations
        </h2>
        <div className="space-y-3">
          {INTEGRATIONS.map((integration, i) => (
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

      {/* Footer note */}
      <div className="rounded-lg border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">Need a different integration?</strong> numbrs supports
        any HTTP client. If you have a metric as a number, you can push it. Open an issue or PR on
        GitHub to add more integrations to this page.
      </div>
    </div>
  );
}
