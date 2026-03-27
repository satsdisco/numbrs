import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Dashboard Templates ──────────────────────────────────────────────────────

const TEMPLATES: Record<string, { name: string; description: string; panels: unknown[] }> = {
  "relay-health": {
    name: "Relay Health",
    description: "Relay status overview, latency charts, and uptime",
    panels: [
      { title: "Connect Latency", panel_type: "line", config: { metric_key: "relay_latency_connect_ms", data_source: "relay", unit: "ms" }, layout: { x: 0, y: 0, w: 6, h: 4 } },
      { title: "Event Latency", panel_type: "line", config: { metric_key: "relay_latency_first_event_ms", data_source: "relay", unit: "ms" }, layout: { x: 6, y: 0, w: 6, h: 4 } },
      { title: "Uptime", panel_type: "gauge", config: { metric_key: "relay_up", data_source: "relay", stat_field: "avg", gauge_max: 1 }, layout: { x: 0, y: 4, w: 4, h: 3 } },
      { title: "Avg Connect Time", panel_type: "stat", config: { metric_key: "relay_latency_connect_ms", data_source: "relay", stat_field: "avg", unit: "ms" }, layout: { x: 4, y: 4, w: 4, h: 2 } },
      { title: "P95 Connect Time", panel_type: "stat", config: { metric_key: "relay_latency_connect_ms", data_source: "relay", stat_field: "p95", unit: "ms" }, layout: { x: 8, y: 4, w: 4, h: 2 } },
    ],
  },
  "bitaxe": {
    name: "Bitaxe Miner",
    description: "Hashrate, temperature, shares, best difficulty, and power stats",
    panels: [
      { title: "Hashrate", panel_type: "area", config: { metric_key: "bitaxe.hashrate_ghs", data_source: "custom", unit: "GH/s" }, layout: { x: 0, y: 0, w: 8, h: 4 } },
      { title: "Hashrate (GH/s)", panel_type: "stat", config: { metric_key: "bitaxe.hashrate_ghs", data_source: "custom", stat_field: "latest", unit: "GH/s" }, layout: { x: 8, y: 0, w: 4, h: 2 } },
      { title: "Best Difficulty", panel_type: "stat", config: { metric_key: "bitaxe.best_diff", data_source: "custom", stat_field: "latest", unit: "" }, layout: { x: 8, y: 2, w: 4, h: 2 } },
      { title: "Temperature", panel_type: "area", config: { metric_key: "bitaxe.temp_c", data_source: "custom", unit: "°C" }, layout: { x: 0, y: 4, w: 6, h: 4 } },
      { title: "Power Draw", panel_type: "area", config: { metric_key: "bitaxe.power_w", data_source: "custom", unit: "W" }, layout: { x: 6, y: 4, w: 6, h: 4 } },
      { title: "Temp", panel_type: "gauge", config: { metric_key: "bitaxe.temp_c", data_source: "custom", stat_field: "latest", gauge_max: 100 }, layout: { x: 0, y: 8, w: 3, h: 3 } },
      { title: "Accepted Shares", panel_type: "stat", config: { metric_key: "bitaxe.shares_accepted", data_source: "custom", stat_field: "sum", unit: "" }, layout: { x: 3, y: 8, w: 3, h: 2 } },
      { title: "Rejected Shares", panel_type: "stat", config: { metric_key: "bitaxe.shares_rejected", data_source: "custom", stat_field: "sum", unit: "" }, layout: { x: 6, y: 8, w: 3, h: 2 } },
      { title: "Efficiency", panel_type: "stat", config: { metric_key: "bitaxe.efficiency_j_th", data_source: "custom", stat_field: "avg", unit: "J/TH" }, layout: { x: 9, y: 8, w: 3, h: 2 } },
    ],
  },
  "system-health": {
    name: "System Health",
    description: "CPU, RAM, and disk usage for your server or desktop",
    panels: [
      { title: "CPU Usage", panel_type: "area", config: { metric_key: "system.cpu_pct", data_source: "custom", unit: "%" }, layout: { x: 0, y: 0, w: 6, h: 4 } },
      { title: "RAM Usage", panel_type: "area", config: { metric_key: "system.ram_pct", data_source: "custom", unit: "%" }, layout: { x: 6, y: 0, w: 6, h: 4 } },
      { title: "CPU %", panel_type: "stat", config: { metric_key: "system.cpu_pct", data_source: "custom", stat_field: "latest", unit: "%" }, layout: { x: 0, y: 4, w: 3, h: 2 } },
      { title: "RAM %", panel_type: "stat", config: { metric_key: "system.ram_pct", data_source: "custom", stat_field: "latest", unit: "%" }, layout: { x: 3, y: 4, w: 3, h: 2 } },
      { title: "RAM Used", panel_type: "stat", config: { metric_key: "system.ram_used_mb", data_source: "custom", stat_field: "latest", unit: "MB" }, layout: { x: 6, y: 4, w: 3, h: 2 } },
      { title: "Boot Disk", panel_type: "gauge", config: { metric_key: "system.disk_boot_pct", data_source: "custom", stat_field: "latest", gauge_max: 100, unit: "%" }, layout: { x: 0, y: 6, w: 3, h: 3 } },
      { title: "External Disk", panel_type: "gauge", config: { metric_key: "system.disk_external_pct", data_source: "custom", stat_field: "latest", gauge_max: 100, unit: "%" }, layout: { x: 3, y: 6, w: 3, h: 3 } },
      { title: "Disk Free (GB)", panel_type: "stat", config: { metric_key: "system.disk_external_free_gb", data_source: "custom", stat_field: "latest", unit: "GB" }, layout: { x: 6, y: 6, w: 3, h: 2 } },
      { title: "Network In", panel_type: "line", config: { metric_key: "system.net_in_mbps", data_source: "custom", unit: "Mbps" }, layout: { x: 0, y: 9, w: 6, h: 4 } },
      { title: "Network Out", panel_type: "line", config: { metric_key: "system.net_out_mbps", data_source: "custom", unit: "Mbps" }, layout: { x: 6, y: 9, w: 6, h: 4 } },
    ],
  },
  "media": {
    name: "Media Server",
    description: "Plex/Jellyfin play counts, active streams, and library stats",
    panels: [
      { title: "Plex Active Streams", panel_type: "area", config: { metric_key: "plex.active_streams", data_source: "custom", unit: "streams" }, layout: { x: 0, y: 0, w: 8, h: 4 } },
      { title: "Streams Now", panel_type: "stat", config: { metric_key: "plex.active_streams", data_source: "custom", stat_field: "latest", unit: "" }, layout: { x: 8, y: 0, w: 4, h: 2 } },
      { title: "Plays Today", panel_type: "stat", config: { metric_key: "plex.plays_today", data_source: "custom", stat_field: "sum", unit: "" }, layout: { x: 8, y: 2, w: 4, h: 2 } },
      { title: "Movies", panel_type: "stat", config: { metric_key: "plex.library.movies.count", data_source: "custom", stat_field: "latest", unit: "titles" }, layout: { x: 0, y: 4, w: 3, h: 2 } },
      { title: "TV Shows", panel_type: "stat", config: { metric_key: "plex.library.tv_shows.count", data_source: "custom", stat_field: "latest", unit: "shows" }, layout: { x: 3, y: 4, w: 3, h: 2 } },
      { title: "Music Tracks", panel_type: "stat", config: { metric_key: "plex.library.music.count", data_source: "custom", stat_field: "latest", unit: "tracks" }, layout: { x: 6, y: 4, w: 3, h: 2 } },
      { title: "Audiobooks", panel_type: "stat", config: { metric_key: "plex.library.audiobooks.count", data_source: "custom", stat_field: "latest", unit: "titles" }, layout: { x: 9, y: 4, w: 3, h: 2 } },
      { title: "Jellyfin Active Streams", panel_type: "area", config: { metric_key: "jellyfin.active_streams", data_source: "custom", unit: "streams" }, layout: { x: 0, y: 6, w: 8, h: 4 } },
      { title: "Jellyfin Streams", panel_type: "stat", config: { metric_key: "jellyfin.active_streams", data_source: "custom", stat_field: "latest", unit: "" }, layout: { x: 8, y: 6, w: 4, h: 2 } },
      { title: "Jellyfin Songs", panel_type: "stat", config: { metric_key: "jellyfin.song_count", data_source: "custom", stat_field: "latest", unit: "" }, layout: { x: 8, y: 8, w: 4, h: 2 } },
    ],
  },
};

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function authenticate(req: Request, supabase: ReturnType<typeof createClient>) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return { userId: null, error: "Missing X-API-KEY header" };

  const { data: userId, error: keyError } = await supabase.rpc(
    "get_user_id_from_api_key",
    { api_key_value: apiKey }
  );

  if (keyError || !userId) return { userId: null, error: "Invalid API key" };

  // Update last_used_at
  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() } as never)
    .eq("key", apiKey);

  return { userId: userId as string, error: null };
}

// ─── Route parsing ────────────────────────────────────────────────────────────

function parsePath(req: Request): { resource: string; id: string | null; sub: string | null } {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // Strip any leading path segments up to and including "api"
  const apiIdx = parts.lastIndexOf("api");
  const route = apiIdx >= 0 ? parts.slice(apiIdx + 1) : parts;
  // route[0] = resource, route[1] = id or sub-route
  const resource = route[0] ?? "";
  const second = route[1] ?? null;
  // Distinguish between an ID (UUID-like) and a sub-route (word without hyphens in UUID pattern)
  const isUUID = second && /^[0-9a-f-]{36}$/i.test(second);
  return {
    resource,
    id: isUUID ? second : null,
    sub: !isUUID ? second : null,
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { userId, error: authError } = await authenticate(req, supabase);
  if (!userId) return json({ error: authError }, 401);

  const { resource, id, sub } = parsePath(req);
  const method = req.method;

  try {
    // ── Relays ──────────────────────────────────────────────────────────────
    if (resource === "relays") {
      if (method === "GET" && !id) {
        const { data, error } = await supabase
          .from("relays")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }

      if (method === "POST" && !id) {
        const body = await req.json();
        if (!body.name || !body.url) return json({ error: "name and url are required" }, 400);
        const { data, error } = await supabase
          .from("relays")
          .insert({ name: body.name, url: body.url, region: body.region ?? null, user_id: userId } as never)
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        return json(data, 201);
      }

      if (method === "PATCH" && id) {
        const body = await req.json();
        const allowed = ["name", "url", "region"];
        const updates: Record<string, unknown> = {};
        for (const k of allowed) if (k in body) updates[k] = body[k];
        const { data, error } = await supabase
          .from("relays")
          .update(updates as never)
          .eq("id", id)
          .eq("user_id", userId)
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        if (!data) return json({ error: "Not found" }, 404);
        return json(data);
      }

      if (method === "DELETE" && id) {
        const { error } = await supabase
          .from("relays")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
        if (error) return json({ error: error.message }, 500);
        return json({ deleted: true });
      }
    }

    // ── Dashboards ──────────────────────────────────────────────────────────
    if (resource === "dashboards") {
      if (method === "GET" && !id && !sub) {
        const { data, error } = await supabase
          .from("dashboards")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }

      if (method === "POST" && sub === "from-template") {
        const body = await req.json();
        const templateKey = body.template as string;
        const tpl = TEMPLATES[templateKey];
        if (!tpl) {
          return json({ error: `Unknown template "${templateKey}". Available: ${Object.keys(TEMPLATES).join(", ")}` }, 400);
        }

        const dashName = body.name || tpl.name;
        const { data: dashboard, error: dbErr } = await supabase
          .from("dashboards")
          .insert({ name: dashName, description: tpl.description, user_id: userId } as never)
          .select()
          .single();
        if (dbErr) return json({ error: dbErr.message }, 500);

        const panels = tpl.panels.map((p: never) => ({ ...(p as object), dashboard_id: (dashboard as { id: string }).id }));
        const { error: panelErr } = await supabase.from("panels").insert(panels as never);
        if (panelErr) return json({ error: panelErr.message }, 500);

        const { data: full } = await supabase
          .from("panels")
          .select("*")
          .eq("dashboard_id", (dashboard as { id: string }).id);

        return json({ ...dashboard, panels: full }, 201);
      }

      if (method === "POST" && !id && !sub) {
        const body = await req.json();
        if (!body.name) return json({ error: "name is required" }, 400);
        const { data, error } = await supabase
          .from("dashboards")
          .insert({ name: body.name, description: body.description ?? null, user_id: userId } as never)
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        return json(data, 201);
      }

      if (method === "DELETE" && id) {
        // Delete panels first
        await supabase.from("panels").delete().eq("dashboard_id", id);
        const { error } = await supabase
          .from("dashboards")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
        if (error) return json({ error: error.message }, 500);
        return json({ deleted: true });
      }
    }

    // ── Alerts ──────────────────────────────────────────────────────────────
    if (resource === "alerts") {
      if (method === "GET" && !id) {
        const { data, error } = await supabase
          .from("alert_rules")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }

      if (method === "POST" && !id) {
        const body = await req.json();
        if (!body.name || !body.metric || !body.condition || body.threshold === undefined) {
          return json({ error: "name, metric, condition, and threshold are required" }, 400);
        }
        if (!["gt", "lt"].includes(body.condition)) {
          return json({ error: 'condition must be "gt" or "lt"' }, 400);
        }
        const { data, error } = await supabase
          .from("alert_rules")
          .insert({
            name: body.name,
            metric_key: body.metric,
            condition: body.condition,
            threshold: Number(body.threshold),
            relay_id: body.relay_id ?? null,
            user_id: userId,
          } as never)
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        return json(data, 201);
      }

      if (method === "PATCH" && id) {
        const body = await req.json();
        const allowed = ["name", "metric_key", "condition", "threshold", "relay_id", "is_active", "enabled"];
        const updates: Record<string, unknown> = {};
        for (const k of allowed) {
          if (k in body) {
            // Map "enabled" -> "is_active"
            updates[k === "enabled" ? "is_active" : k] = body[k];
          }
        }
        const { data, error } = await supabase
          .from("alert_rules")
          .update(updates as never)
          .eq("id", id)
          .eq("user_id", userId)
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        if (!data) return json({ error: "Not found" }, 404);
        return json(data);
      }

      if (method === "DELETE" && id) {
        const { error } = await supabase
          .from("alert_rules")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
        if (error) return json({ error: error.message }, 500);
        return json({ deleted: true });
      }
    }

    // ── Monitors ─────────────────────────────────────────────────────────────
    if (resource === "monitors") {
      if (method === "GET" && !id) {
        const { data, error } = await supabase
          .from("uptime_monitors")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }

      if (method === "POST" && !id) {
        const body = await req.json();
        if (!body.name || !body.url) return json({ error: "name and url are required" }, 400);
        const monitorType = body.type ?? "http";
        if (!["http", "wss"].includes(monitorType)) {
          return json({ error: 'type must be "http" or "wss"' }, 400);
        }
        const { data, error } = await supabase
          .from("uptime_monitors")
          .insert({
            name: body.name,
            url: body.url,
            interval_seconds: body.interval_seconds ?? 60,
            user_id: userId,
          } as never)
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        return json(data, 201);
      }

      if (method === "DELETE" && id) {
        const { error } = await supabase
          .from("uptime_monitors")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
        if (error) return json({ error: error.message }, 500);
        return json({ deleted: true });
      }
    }

    // ── Account ──────────────────────────────────────────────────────────────
    if (resource === "me" && method === "GET") {
      const [relaysRes, dashboardsRes, alertsRes, monitorsRes, keysRes] = await Promise.all([
        supabase.from("relays").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("dashboards").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("alert_rules").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("uptime_monitors").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("api_keys").select("id, name, created_at, last_used_at").eq("user_id", userId),
      ]);

      return json({
        user_id: userId,
        stats: {
          relays: relaysRes.count ?? 0,
          dashboards: dashboardsRes.count ?? 0,
          alerts: alertsRes.count ?? 0,
          monitors: monitorsRes.count ?? 0,
        },
        api_keys: keysRes.data ?? [],
      });
    }

    return json({ error: `Unknown route: ${method} /${resource}${id ? `/${id}` : ""}` }, 404);
  } catch (err) {
    console.error("API error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
