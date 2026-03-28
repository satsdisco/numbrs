import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WeatherConfig {
  latitude?: number;
  longitude?: number;
  location_name?: string;
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    rain: number;
    snowfall: number;
    wind_speed_10m: number;
    uv_index: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active weather integrations (requires lat/lon config)
    const { data: integrations } = await supabase
      .from("user_integrations")
      .select("user_id, config")
      .eq("provider", "weather")
      .eq("is_active", true);

    let totalSynced = 0;
    const results: { user_id: string; location: string; synced: number; error?: string }[] = [];

    for (const integration of integrations || []) {
      const config = integration.config as WeatherConfig;
      const latitude = config.latitude;
      const longitude = config.longitude;
      const locationName = config.location_name ?? "home";

      if (latitude === undefined || longitude === undefined) {
        await supabase
          .from("user_integrations")
          .update({ last_error: "Missing latitude or longitude in config" })
          .eq("user_id", integration.user_id)
          .eq("provider", "weather");
        results.push({ user_id: integration.user_id, location: locationName, synced: 0, error: "no coordinates" });
        continue;
      }

      // Slug-ify the location name for use in metric keys
      const locationSlug = locationName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

      try {
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", String(latitude));
        url.searchParams.set("longitude", String(longitude));
        url.searchParams.set(
          "current",
          "temperature_2m,relative_humidity_2m,precipitation,rain,snowfall,wind_speed_10m,uv_index"
        );
        url.searchParams.set("wind_speed_unit", "kmh");

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`Open-Meteo API: ${res.status}`);
        const data = (await res.json()) as OpenMeteoResponse;
        const c = data.current;

        const metrics = [
          { key: `weather.${locationSlug}.temperature`, value: c.temperature_2m, name: `${locationName} Temperature`, unit: "°C" },
          { key: `weather.${locationSlug}.humidity`, value: c.relative_humidity_2m, name: `${locationName} Humidity`, unit: "%" },
          { key: `weather.${locationSlug}.precipitation`, value: c.precipitation, name: `${locationName} Precipitation`, unit: "mm" },
          { key: `weather.${locationSlug}.rain`, value: c.rain, name: `${locationName} Rain`, unit: "mm" },
          { key: `weather.${locationSlug}.snowfall`, value: c.snowfall, name: `${locationName} Snowfall`, unit: "cm" },
          { key: `weather.${locationSlug}.wind_speed`, value: c.wind_speed_10m, name: `${locationName} Wind Speed`, unit: "km/h" },
          { key: `weather.${locationSlug}.uv_index`, value: c.uv_index, name: `${locationName} UV Index`, unit: "" },
        ];

        let synced = 0;
        for (const m of metrics) {
          let metricId: string;
          const { data: existing } = await supabase
            .from("metrics")
            .select("id")
            .eq("key", m.key)
            .eq("user_id", integration.user_id)
            .maybeSingle();

          if (existing) {
            metricId = existing.id;
          } else {
            const { data: created, error } = await supabase
              .from("metrics")
              .insert({
                key: m.key,
                name: m.name,
                user_id: integration.user_id,
                value_type: "float",
                category: "custom",
                unit: m.unit,
              })
              .select("id")
              .single();
            if (error) continue;
            metricId = created.id;
          }

          const { error: insertErr } = await supabase.from("datapoints").insert({
            metric_id: metricId,
            value: m.value,
          });

          if (!insertErr) synced++;
        }

        totalSynced += synced;
        results.push({ user_id: integration.user_id, location: locationName, synced });

        await supabase
          .from("user_integrations")
          .update({ last_synced_at: new Date().toISOString(), last_error: null })
          .eq("user_id", integration.user_id)
          .eq("provider", "weather");
      } catch (err) {
        const msg = (err as Error).message;
        await supabase
          .from("user_integrations")
          .update({ last_error: msg })
          .eq("user_id", integration.user_id)
          .eq("provider", "weather");
        results.push({ user_id: integration.user_id, location: locationName, synced: 0, error: msg });
      }
    }

    return new Response(
      JSON.stringify({ synced: totalSynced, users: results.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("collect-weather error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
