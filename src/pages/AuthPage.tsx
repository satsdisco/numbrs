import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Activity, Zap, AlertCircle, Globe, Eye, EyeOff, Shield, Loader2 } from "lucide-react";
import {
  hasNostrExtension,
  signAuthEvent,
  signAuthEventWithNsec,
  signAuthEventWithBunker,
  truncatePubkey,
} from "@/lib/nostr";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

type SignerStatus = "idle" | "connecting" | "signing" | "loading";

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [signerStatus, setSignerStatus] = useState<SignerStatus>("idle");
  const [hasExtension, setHasExtension] = useState(false);
  const [nsecValue, setNsecValue] = useState("");
  const [showNsec, setShowNsec] = useState(false);
  const [bunkerUri, setBunkerUri] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setHasExtension(hasNostrExtension()), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleSession = async (signedEvent: Awaited<ReturnType<typeof signAuthEvent>>) => {
    const { data, error } = await supabase.functions.invoke("nostr-auth", {
      body: { event: signedEvent },
    });

    if (error || !data?.access_token) {
      throw new Error(data?.error || error?.message || "Authentication failed");
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });

    if (sessionError) throw sessionError;
    toast.success(`Signed in as ${truncatePubkey(signedEvent.pubkey)}`);
    navigate("/");
  };

  const handleExtensionLogin = async () => {
    if (!hasNostrExtension()) {
      toast.error("No Nostr extension detected. Install nos2x, Alby, or similar.");
      return;
    }
    setLoading(true);
    try {
      const signedEvent = await signAuthEvent();
      await handleSession(signedEvent);
    } catch (err: any) {
      console.error("Nostr auth error:", err);
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleNsecLogin = async () => {
    if (!nsecValue.trim()) {
      toast.error("Please enter your private key");
      return;
    }
    setLoading(true);
    try {
      const signedEvent = await signAuthEventWithNsec(nsecValue);
      await handleSession(signedEvent);
    } catch (err: any) {
      console.error("nsec auth error:", err);
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBunkerLogin = async () => {
    if (!bunkerUri.trim()) {
      toast.error("Please enter your bunker:// connection string");
      return;
    }
    setSignerStatus("connecting");
    try {
      setSignerStatus("signing");
      const signedEvent = await signAuthEventWithBunker(bunkerUri);
      await handleSession(signedEvent);
    } catch (err: any) {
      console.error("Bunker auth error:", err);
      toast.error(err.message || "Remote signer connection failed");
      setSignerStatus("idle");
    }
  };

  const bunkerButtonLabel = () => {
    if (signerStatus === "connecting") return "Connecting to bunker…";
    if (signerStatus === "signing") return "Waiting for signature…";
    return "Sign in with Remote Signer";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.06),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,hsl(var(--primary)/0.04),transparent_50%)]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative w-full max-w-sm space-y-6"
      >
        <div className="flex flex-col items-center gap-3">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex items-center gap-2.5 text-primary"
          >
            <Activity className="h-8 w-8" />
            <span className="text-metric-lg font-mono tracking-tight">NUMBERS</span>
          </motion.div>
          <p className="text-metric-sm text-muted-foreground text-center">
            Time-series metrics for the Nostr ecosystem
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-6 shadow-card">
          <Tabs defaultValue="extension" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="extension">Extension</TabsTrigger>
              <TabsTrigger value="nsec">Private Key</TabsTrigger>
              <TabsTrigger value="bunker">Remote Signer</TabsTrigger>
            </TabsList>

            {/* Tab 1: NIP-07 Extension */}
            <TabsContent value="extension" className="space-y-3 mt-0">
              <Button
                onClick={handleExtensionLogin}
                disabled={loading}
                className="w-full gap-2"
                size="lg"
              >
                <Zap className="h-4 w-4" />
                {loading ? "Signing in…" : "Sign in with Extension"}
              </Button>
              <p className="text-center text-metric-sm text-muted-foreground">
                Uses your browser extension (nos2x, Alby, etc.)
              </p>
              {!hasExtension && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex items-start gap-2 rounded-md border border-border bg-muted/50 p-3 text-metric-sm text-muted-foreground"
                >
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    No Nostr extension detected.{" "}
                    <a href="https://github.com/nickytonline/nos2x" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Install nos2x
                    </a>{" "}
                    or{" "}
                    <a href="https://getalby.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Alby
                    </a>{" "}
                    to get started.
                  </span>
                </motion.div>
              )}
            </TabsContent>

            {/* Tab 2: nsec / hex private key */}
            <TabsContent value="nsec" className="space-y-3 mt-0">
              <div className="relative">
                <Input
                  type={showNsec ? "text" : "password"}
                  placeholder="nsec1… or 64-char hex"
                  value={nsecValue}
                  onChange={(e) => setNsecValue(e.target.value)}
                  className="pr-10 font-mono text-sm"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShowNsec((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showNsec ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Button
                onClick={handleNsecLogin}
                disabled={loading || !nsecValue.trim()}
                className="w-full gap-2"
                size="lg"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {loading ? "Signing in…" : "Sign in"}
              </Button>

              <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 p-3 text-metric-sm text-muted-foreground">
                <Shield className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
                <span>Your key never leaves your browser</span>
              </div>
            </TabsContent>

            {/* Tab 3: NIP-46 Remote Signer */}
            <TabsContent value="bunker" className="space-y-3 mt-0">
              <Input
                type="text"
                placeholder="bunker://pubkey?relay=…"
                value={bunkerUri}
                onChange={(e) => setBunkerUri(e.target.value)}
                className="font-mono text-sm"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />

              <Button
                onClick={handleBunkerLogin}
                disabled={signerStatus !== "idle" || !bunkerUri.trim()}
                className="w-full gap-2"
                size="lg"
              >
                {signerStatus !== "idle" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {bunkerButtonLabel()}
              </Button>

              <p className="text-center text-metric-sm text-muted-foreground">
                Works with Amber (Android), nsecBunker, and other NIP-46 signers
              </p>
            </TabsContent>
          </Tabs>
        </div>

        <div className="text-center">
          <Link
            to="/explore"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            Browse the Relay Directory
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
