import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { batchUpsertDatapoints } from "../_shared/batch-upsert.ts";

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
        repos?: string[];
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
        let repos: GitHubRepo[] = [];

        if (config.repos && config.repos.length > 0) {
          const fetches = config.repos.map(async (repoFullName) => {
            const res = await fetch(`https://api.github.com/repos/${repoFullName}`, { headers });
            if (!res.ok) return null;
            return (await res.json()) as GitHubRepo;
          });
          const raw = await Promise.all(fetches);
          repos = raw.filter(Boolean) as GitHubRepo[];
        } else {
          const res = await fetch(
            `https://api.github.com/users/${username}/repos?type=public&per_page=100&sort=updated`,
            { headers }
          );
          if (!res.ok) throw new Error(`GitHub API: ${res.status}`);
          repos = (await res.json()) as GitHubRepo[];
        }

        // Build all metrics for all repos, then batch-upsert once
        const metrics = repos.flatMap((repo) => {
          const slug = repo.full_name.replace("/", ".");
          return [
            { key: `github.${slug}.stars`, value: repo.stargazers_count, name: `${repo.name} Stars`, unit: "⭐" },
            { key: `github.${slug}.issues`, value: repo.open_issues_count, name: `${repo.name} Open Issues`, unit: "" },
            { key: `github.${slug}.forks`, value: repo.forks_count, name: `${repo.name} Forks`, unit: "" },
          ];
        });

        const { synced } = await batchUpsertDatapoints(supabase, "github", metrics, {
          userIds: [integration.user_id],
        });

        totalSynced += synced;
        results.push({ user_id: integration.user_id, repos: repos.length });
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
