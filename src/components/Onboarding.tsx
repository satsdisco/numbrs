import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Activity, BarChart2, Bot, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "onboarding_complete";

export function isOnboardingComplete(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function markOnboardingComplete() {
  localStorage.setItem(STORAGE_KEY, "true");
}

type Track = "relays" | "uptime" | "custom" | "claude" | null;

interface StepProps {
  onNext: () => void;
  onSkip: () => void;
}

function WelcomeStep({ onNext, onSkip }: StepProps) {
  return (
    <div className="space-y-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2.5 text-primary">
          <Activity className="h-7 w-7" />
          <span className="text-2xl font-semibold tracking-tight">numbrs</span>
        </div>
        <h2 className="text-lg font-semibold text-foreground leading-snug">
          The open metrics platform<br />built for the nostr generation.
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Track relay health, uptime, and any custom metric. Push data from any tool, see it instantly.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Button onClick={onNext} className="gap-2">
          Get started <ArrowRight className="h-4 w-4" />
        </Button>
        <button
          onClick={onSkip}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          Skip setup
        </button>
      </div>
    </div>
  );
}

const TRACK_OPTIONS = [
  {
    id: "relays" as Track,
    icon: Radio,
    emoji: "⚡",
    title: "My Nostr Relays",
    description: "Monitor WebSocket relay uptime, latency, and health scores",
  },
  {
    id: "uptime" as Track,
    icon: Activity,
    emoji: "🟢",
    title: "Website Uptime",
    description: "Ping any URL and track availability + response time",
  },
  {
    id: "custom" as Track,
    icon: BarChart2,
    emoji: "📊",
    title: "Custom Metrics",
    description: "Push any number from scripts, APIs, GitHub Actions, and more",
  },
  {
    id: "claude" as Track,
    icon: Bot,
    emoji: "🤖",
    title: "Claude AI Usage",
    description: "Track token consumption, API equivalent costs, and usage patterns across Claude Code and OpenClaw sessions",
  },
];

function TrackStep({
  onSelect,
  onSkip,
}: {
  onSelect: (track: Track) => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-base font-semibold text-foreground">What do you want to track?</h2>
        <p className="text-sm text-muted-foreground mt-1">Pick one to get a tailored setup guide.</p>
      </div>
      <div className="space-y-2">
        {TRACK_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className="w-full flex items-center gap-4 rounded-lg border border-border bg-card p-4 text-left hover:border-primary/40 hover:bg-muted/20 transition-all group"
          >
            <span className="text-xl shrink-0">{opt.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground">{opt.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{opt.description}</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </button>
        ))}
      </div>
      <button
        onClick={onSkip}
        className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        Skip for now
      </button>
    </div>
  );
}

function RelaysStep({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-5 text-center">
      <div>
        <span className="text-3xl">⚡</span>
        <h2 className="text-base font-semibold text-foreground mt-3">Add your first relay</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
          Paste a <code className="font-mono text-xs bg-muted px-1 rounded">wss://</code> relay URL and we'll start monitoring latency, uptime, and health every 5 minutes.
        </p>
      </div>
      <div className="rounded-lg bg-muted/30 border border-border p-3 text-left text-xs font-mono text-muted-foreground space-y-1">
        <div>wss://relay.damus.io</div>
        <div>wss://nos.lol</div>
        <div>wss://relay.nostr.band</div>
      </div>
      <div className="flex flex-col gap-2">
        <Button onClick={() => { onDone(); navigate("/relays/new"); }} className="gap-2">
          <Radio className="h-4 w-4" /> Add a relay
        </Button>
        <button onClick={onDone} className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
          I'll do this later
        </button>
      </div>
    </div>
  );
}

function UptimeStep({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-5 text-center">
      <div>
        <span className="text-3xl">🟢</span>
        <h2 className="text-base font-semibold text-foreground mt-3">Monitor any URL</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
          Add a URL and numbrs will ping it on a schedule, tracking uptime % and response latency.
        </p>
      </div>
      <div className="rounded-lg bg-muted/30 border border-border p-3 text-left text-xs font-mono text-muted-foreground space-y-1">
        <div>https://yoursite.com</div>
        <div>https://api.yourapp.com/health</div>
        <div>https://yourrelay.xyz</div>
      </div>
      <div className="flex flex-col gap-2">
        <Button onClick={() => { onDone(); navigate("/uptime"); }} className="gap-2">
          <Activity className="h-4 w-4" /> Set up uptime monitor
        </Button>
        <button onClick={onDone} className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
          I'll do this later
        </button>
      </div>
    </div>
  );
}

function CustomStep({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-5">
      <div className="text-center">
        <span className="text-3xl">📊</span>
        <h2 className="text-base font-semibold text-foreground mt-3">Push your first metric</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Get your API key, then push any number with one curl command.
        </p>
      </div>
      <div className="rounded-lg bg-[#0d0d0d] border border-border/60 p-3 font-mono text-xs text-[#e0e0e0] overflow-x-auto">
        <pre>{`curl -sX POST https://numbrs.lol/functions/v1/ingest \\
  -H "x-api-key: YOUR_KEY" \\
  -d '{"key": "my.metric", "value": 42}'`}</pre>
      </div>
      <div className="flex flex-col gap-2">
        <Button onClick={() => { onDone(); navigate("/api-keys"); }} className="gap-2">
          <BarChart2 className="h-4 w-4" /> Get my API key
        </Button>
        <button
          onClick={() => { onDone(); navigate("/integrations"); }}
          className="text-xs text-primary hover:underline transition-colors py-1"
        >
          View all integrations →
        </button>
        <button onClick={onDone} className="text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5">
          I'll do this later
        </button>
      </div>
    </div>
  );
}

function ClaudeStep({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-5">
      <div className="text-center">
        <span className="text-3xl">🤖</span>
        <h2 className="text-base font-semibold text-foreground mt-3">Track Claude AI usage</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
          numbrs reads your local Claude Code and OpenClaw session files to track token consumption, estimated API costs, and usage patterns over time.
        </p>
      </div>
      <div className="rounded-lg bg-muted/30 border border-border p-3 text-xs text-muted-foreground space-y-1.5">
        <div className="flex items-center gap-2">
          <span>📁</span>
          <code className="font-mono">~/.claude/projects/</code>
          <span className="text-muted-foreground/60">— Claude Code sessions</span>
        </div>
        <div className="flex items-center gap-2">
          <span>📁</span>
          <code className="font-mono">~/.openclaw/agents/</code>
          <span className="text-muted-foreground/60">— OpenClaw sessions</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Requires a local collector script that runs every 5 minutes. Full setup instructions on the Integrations page.
      </p>
      <div className="flex flex-col gap-2">
        <Button onClick={() => { onDone(); navigate("/integrations"); }} className="gap-2">
          <Bot className="h-4 w-4" /> View setup instructions
        </Button>
        <button onClick={onDone} className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
          I'll set it up later
        </button>
      </div>
    </div>
  );
}

// ─── Main Onboarding Component ─────────────────────────────────────────────────

type Step = "welcome" | "track" | "detail";

export default function Onboarding() {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState<Step>("welcome");
  const [track, setTrack] = useState<Track>(null);

  const handleSkip = () => {
    markOnboardingComplete();
    setOpen(false);
  };

  const handleDone = () => {
    markOnboardingComplete();
    setOpen(false);
  };

  const handleSelectTrack = (t: Track) => {
    setTrack(t);
    setStep("detail");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleSkip(); }}>
      <DialogContent className="max-w-sm p-6 gap-0">
        <button
          onClick={handleSkip}
          className="absolute right-4 top-4 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <AnimatePresence mode="wait">
          {step === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <WelcomeStep onNext={() => setStep("track")} onSkip={handleSkip} />
            </motion.div>
          )}
          {step === "track" && (
            <motion.div
              key="track"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <TrackStep onSelect={handleSelectTrack} onSkip={handleSkip} />
            </motion.div>
          )}
          {step === "detail" && track === "relays" && (
            <motion.div
              key="relays"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <RelaysStep onDone={handleDone} />
            </motion.div>
          )}
          {step === "detail" && track === "uptime" && (
            <motion.div
              key="uptime"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <UptimeStep onDone={handleDone} />
            </motion.div>
          )}
          {step === "detail" && track === "custom" && (
            <motion.div
              key="custom"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <CustomStep onDone={handleDone} />
            </motion.div>
          )}
          {step === "detail" && track === "claude" && (
            <motion.div
              key="claude"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <ClaudeStep onDone={handleDone} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step indicator */}
        <div className="flex justify-center gap-1.5 mt-5">
          {(["welcome", "track", "detail"] as Step[]).map((s) => (
            <span
              key={s}
              className={cn(
                "h-1 rounded-full transition-all duration-200",
                s === step
                  ? "w-4 bg-primary"
                  : step === "detail" && s === "track"
                  ? "w-2 bg-muted-foreground/40"
                  : "w-2 bg-muted-foreground/20"
              )}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
