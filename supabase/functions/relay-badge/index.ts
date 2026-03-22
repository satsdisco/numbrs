import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Returns an SVG uptime badge for a relay.
 * Usage: GET /functions/v1/relay-badge?relay_id=xxx&hours=24
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const relayId = url.searchParams.get("relay_id");
  const hours = parseInt(url.searchParams.get("hours") || "24", 10);

  if (!relayId) {
    return new Response(makeBadge("error", "no relay_id", "#e05d44"), {
      headers: { ...corsHeaders, "Content-Type": "image/svg+xml", "Cache-Control": "no-cache" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const now = new Date();
    const start = new Date(now.getTime() - hours * 3600 * 1000);

    // Get relay name
    const { data: relay } = await supabase
      .from("relays")
      .select("name")
      .eq("id", relayId)
      .maybeSingle();

    const label = relay?.name || "relay";

    // Get uptime metric ID
    const { data: metric } = await supabase
      .from("metrics")
      .select("id")
      .eq("key", "relay_up")
      .maybeSingle();

    if (!metric) {
      return new Response(makeBadge(label, "no data", "#9f9f9f"), {
        headers: { ...corsHeaders, "Content-Type": "image/svg+xml", "Cache-Control": "max-age=300" },
      });
    }

    // Calculate uptime percentage
    const { data: stats } = await supabase.rpc("get_metric_stats", {
      p_metric_id: metric.id,
      p_start: start.toISOString(),
      p_end: now.toISOString(),
    });

    const row = (stats as any)?.[0];
    const uptime = row?.avg_val != null ? (row.avg_val * 100).toFixed(1) : null;

    if (uptime === null) {
      return new Response(makeBadge(label, "no data", "#9f9f9f"), {
        headers: { ...corsHeaders, "Content-Type": "image/svg+xml", "Cache-Control": "max-age=300" },
      });
    }

    const uptimeNum = parseFloat(uptime);
    let color = "#4c1"; // green
    if (uptimeNum < 99) color = "#dfb317"; // yellow
    if (uptimeNum < 95) color = "#e05d44"; // red

    return new Response(makeBadge(label, `${uptime}% uptime`, color), {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    console.error("Badge error:", err);
    return new Response(makeBadge("error", "failed", "#e05d44"), {
      headers: { ...corsHeaders, "Content-Type": "image/svg+xml" },
    });
  }
});

function makeBadge(label: string, value: string, color: string): string {
  const labelWidth = label.length * 6.5 + 12;
  const valueWidth = value.length * 6.5 + 12;
  const totalWidth = labelWidth + valueWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(label)}</text>
    <text x="${labelWidth / 2}" y="14" fill="#fff">${escapeXml(label)}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(value)}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14" fill="#fff">${escapeXml(value)}</text>
  </g>
</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
