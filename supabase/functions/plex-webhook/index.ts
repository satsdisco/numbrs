import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Resolve owner from API key in query string: ?api_key=nmbr_xxx
    const url = new URL(req.url);
    const apiKey = url.searchParams.get("api_key");

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing api_key query parameter" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up user from API key
    const { data: ownerId, error: keyError } = await supabase.rpc(
      "get_user_id_from_api_key",
      { api_key_value: apiKey }
    );

    if (keyError || !ownerId) {
      return new Response(JSON.stringify({ error: "Invalid api_key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Plex sends multipart/form-data with a "payload" JSON field
    let payload: any;
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const payloadStr = formData.get("payload")?.toString();
      if (!payloadStr) return new Response("no payload", { status: 400 });
      payload = JSON.parse(payloadStr);
    } else {
      payload = await req.json();
    }

    const event = payload.event;
    const account = payload.Account ?? {};
    const metadata = payload.Metadata ?? {};
    const player = payload.Player ?? {};

    // Only care about play/stop/scrobble events
    const trackedEvents = ["media.play", "media.stop", "media.scrobble", "media.pause", "media.resume"];
    if (!trackedEvents.includes(event)) {
      return new Response(JSON.stringify({ ok: true, skipped: event }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const row = {
      owner_id: ownerId,
      event,
      user_id_plex: account.id ? Number(account.id) : null,
      username: account.title || null,
      title: metadata.title || null,
      parent_title: metadata.parentTitle || null,
      grandparent_title: metadata.grandparentTitle || null,
      media_type: metadata.type || null,
      rating_key: metadata.ratingKey ? String(metadata.ratingKey) : null,
      duration_ms: metadata.duration ? Number(metadata.duration) : null,
      view_offset_ms: metadata.viewOffset ? Number(metadata.viewOffset) : null,
      player_title: player.title || null,
      player_platform: player.platform || null,
      local: player.local ?? null,
    };

    const { error } = await supabase.from("plex_events").insert(row);
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, event, title: metadata.title }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
