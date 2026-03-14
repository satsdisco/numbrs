import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Verify a NIP-07 signed Nostr event (kind 22242 or 27235).
 * Uses WebCrypto schnorr verification via P-256... actually Nostr uses secp256k1 schnorr.
 * We'll verify by re-computing the event ID and checking the signature.
 */
async function verifyNostrEvent(event: NostrEvent): Promise<boolean> {
  // 1. Verify event ID = sha256 of serialized event
  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);

  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(serialized)
  );
  const computedId = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (computedId !== event.id) {
    console.error("Event ID mismatch", { computedId, eventId: event.id });
    return false;
  }

  // 2. Verify schnorr signature using @noble/curves (secp256k1)
  const { schnorr } = await import("https://esm.sh/@noble/curves@1.4.0/secp256k1");
  
  try {
    const sigBytes = hexToBytes(event.sig);
    const idBytes = hexToBytes(event.id);
    const pubkeyBytes = hexToBytes(event.pubkey);
    return schnorr.verify(sigBytes, idBytes, pubkeyBytes);
  } catch (e) {
    console.error("Signature verification failed:", e);
    return false;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { event } = (await req.json()) as { event: NostrEvent };

    if (!event || !event.pubkey || !event.sig || !event.id) {
      return json({ error: "Missing signed Nostr event" }, 400);
    }

    // Verify kind (NIP-42 AUTH = 22242, or NIP-98 HTTP Auth = 27235)
    if (event.kind !== 22242 && event.kind !== 27235) {
      return json({ error: "Invalid event kind, expected 22242 or 27235" }, 400);
    }

    // Verify event is recent (within 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - event.created_at) > 300) {
      return json({ error: "Event too old or too far in the future" }, 400);
    }

    // Verify signature
    const valid = await verifyNostrEvent(event);
    if (!valid) {
      return json({ error: "Invalid event signature" }, 401);
    }

    // Authenticated! Now find or create user.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const pubkey = event.pubkey;
    const dummyEmail = `${pubkey.slice(0, 16)}@nostr.local`;

    // Check if profile exists with this pubkey
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("pubkey", pubkey)
      .maybeSingle();

    let userId: string;

    if (existingProfile) {
      userId = existingProfile.user_id;
    } else {
      // Create new auth user
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();
      const { data: newUser, error: createError } =
        await supabase.auth.admin.createUser({
          email: dummyEmail,
          password: randomPassword,
          email_confirm: true,
          user_metadata: { pubkey, nostr_login: true },
        });

      if (createError || !newUser.user) {
        console.error("Failed to create user:", createError);
        return json({ error: "Failed to create user" }, 500);
      }

      userId = newUser.user.id;

      // Update profile with pubkey (trigger should have created it)
      await supabase
        .from("profiles")
        .update({ pubkey, display_name: pubkey.slice(0, 8) + "..." })
        .eq("user_id", userId);
    }

    // Generate a session for this user
    // We use admin.generateLink to create a magic link, then exchange it
    // Actually, we'll sign a JWT directly using the Supabase JWT secret

    const jwtSecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    // Use the admin API to create a session directly
    const { data: sessionData, error: sessionError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: dummyEmail,
      });

    if (sessionError || !sessionData) {
      console.error("Failed to generate session:", sessionError);
      return json({ error: "Failed to generate session" }, 500);
    }

    // Extract the token hash and use it to verify OTP
    // The generateLink returns properties.hashed_token which we can use
    const tokenHash = sessionData.properties?.hashed_token;
    if (!tokenHash) {
      return json({ error: "Failed to generate auth token" }, 500);
    }

    // Verify the OTP to get an actual session
    const { data: verifyData, error: verifyError } =
      await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "magiclink",
      });

    if (verifyError || !verifyData.session) {
      console.error("Failed to verify OTP:", verifyError);
      return json({ error: "Failed to create session" }, 500);
    }

    return json({
      access_token: verifyData.session.access_token,
      refresh_token: verifyData.session.refresh_token,
      user: {
        id: userId,
        pubkey,
      },
    });
  } catch (err) {
    console.error("Nostr auth error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
