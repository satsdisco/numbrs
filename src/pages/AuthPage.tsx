import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Activity, Zap, AlertCircle } from "lucide-react";
import { hasNostrExtension, signAuthEvent, truncatePubkey } from "@/lib/nostr";
import { supabase } from "@/integrations/supabase/client";

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [hasExtension, setHasExtension] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check after a small delay since extensions inject window.nostr async
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

      // Set the session in Supabase client
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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-primary">
            <Activity className="h-8 w-8" />
            <span className="text-metric-lg font-mono tracking-tight">NUMBERS</span>
          </div>
          <p className="text-metric-sm text-muted-foreground">
            Time-series metrics for the Nostr ecosystem
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-card space-y-4">
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
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 p-3 text-metric-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                No Nostr extension detected.{" "}
                <a
                  href="https://github.com/nickytonline/nos2x"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Install nos2x
                </a>{" "}
                or{" "}
                <a
                  href="https://getalby.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Alby
                </a>{" "}
                to get started.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
