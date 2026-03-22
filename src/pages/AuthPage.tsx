import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Activity, Zap, AlertCircle, Globe } from "lucide-react";
import { hasNostrExtension, signAuthEvent, truncatePubkey } from "@/lib/nostr";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [hasExtension, setHasExtension] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setHasExtension(hasNostrExtension()), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleNostrLogin = async () => {
    if (!hasNostrExtension()) {
      toast.error("No Nostr extension detected. Install nos2x, Alby, or similar.");
      return;
    }

    setLoading(true);
    try {
      const signedEvent = await signAuthEvent();
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
    } catch (err: any) {
      console.error("Nostr auth error:", err);
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
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

        <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-6 shadow-card space-y-4">
          <Button
            onClick={handleNostrLogin}
            disabled={loading}
            className="w-full gap-2"
            size="lg"
          >
            <Zap className="h-4 w-4" />
            {loading ? "Signing in..." : "Sign in with Nostr"}
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
