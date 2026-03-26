import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GitHubRepo {
  full_name: string;
  name: string;
  stargazers_count: number;
  open_issues_count: number;
  forks_count: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active GitHub integrations
    const { data: integrations } = await supabase
      .from("user_integrations")
      .select("user_id, config")
      .eq("provider", "github")
      .eq("is_active", true);

    let totalSynced = 0;
    const results: { user_id: string; repos: number; error?: string }[] = [];

    for (const integration of integrations || []) {
      const config = integration.config as {
        username?: string;
        token?: string;
        repos?: string[]; // optional: specific repos to track (e.g. ["owner/repo"])
      };

      const username = config.username;
      if (!username) {
        await supabase
          .from("user_integrations")
          .update({ last_error: "Missing GitHub username" })
          .eq("user_id", integration.user_id)
          .eq("provider", "github");
        results.push({ user_id: integration.user_id, repos: 0, error: "no username" });
        continue;
      }

      const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "numbrs-collector",
      };
      if (config.token) {
        headers.Authorization = `Bearer ${config.token}`;
      }

      try {
        // Fetch repos — either specific ones or all public repos for the user
        let repos: GitHubRepo[] = [];

        if (config.repos && config.repos.length > 0) {
          // Fetch specific repos
          const fetches = config.repos.map(async (repoFullName) => {
            const res = await fetch(`https://api.github.com/repos/${repoFullName}`, { headers });
            if (!res.ok) return null;
            return (await res.json()) as GitHubRepo;
          });
          const results = await Promise.all(fetches);
          repos = results.filter(Boolean) as GitHubRepo[];
        } else {
          // Fetch all public repos for the user
          const res = await fetch(
            `https://api.github.com/users/${username}/repos?type=public&per_page=100&sort=updated`,
            { headers }
          );
          if (!res.ok) throw new Error(`GitHub API: ${res.status}`);
          repos = (await res.json()) as GitHubRepo[];
        }

        let synced = 0;
        for (const repo of repos) {
          const slug = repo.full_name.replace("/", ".");
          const metrics = [
            { key: `github.${slug}.stars`, value: repo.stargazers_count, name: `${repo.name} Stars`, unit: "⭐" },
            { key: `github.${slug}.issues`, value: repo.open_issues_count, name: `${repo.name} Open Issues`, unit: "" },
            { key: `github.${slug}.forks`, value: repo.forks_count, name: `${repo.name} Forks`, unit: "" },
          ];

          for (const m of metrics) {
            // Find or create metric
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

            await supabase.from("datapoints").insert({
              metric_id: metricId,
              value: m.value,
            });
            synced++;
          }
        }

        totalSynced += synced;
        results.push({ user_id: integration.user_id, repos: repos.length });

        // Update sync status
        await supabase
          .from("user_integrations")
          .update({ last_synced_at: new Date().toISOString(), last_error: null })
          .eq("user_id", integration.user_id)
          .eq("provider", "github");
      } catch (err) {
        const msg = (err as Error).message;
        await supabase
          .from("user_integrations")
          .update({ last_error: msg })
          .eq("user_id", integration.user_id)
          .eq("provider", "github");
        results.push({ user_id: integration.user_id, repos: 0, error: msg });
      }
    }

    return new Response(
      JSON.stringify({ synced: totalSynced, users: results.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("collect-github error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
