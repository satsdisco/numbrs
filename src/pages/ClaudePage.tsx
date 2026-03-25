import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bot } from "lucide-react";
import { format, subDays } from "date-fns";
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

type Range = "7d" | "30d" | "90d" | "all";
const RANGES: Range[] = ["7d", "30d", "90d", "all"];

function RangeSelector({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-background p-0.5">
      {RANGES.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={cn(
            "rounded-sm px-3 py-1 font-mono text-xs font-medium transition-all",
            value === r
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function shortModel(model: string): string {
  return model.replace(/^claude-/, "").replace(/-\d{8}$/, "");
}

const PURPLE = "#7c3aed";

const PROJECT_COLORS: Record<string, string> = {
  numbrs: "#7c3aed",
  samizdat: "#2563eb",
  meshngr: "#16a34a",
  workspace: "#d97706",
  hacek: "#db2777",
  jellyamp: "#0891b2",
};

function projectColor(project: string): string {
  return PROJECT_COLORS[project] ?? "#6b7280";
}

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "hsl(240, 10%, 6%)",
    border: "1px solid hsl(240, 3.7%, 15.9%)",
    borderRadius: "4px",
    fontFamily: "JetBrains Mono, monospace",
    fontSize: "11px",
  },
  labelStyle: { color: "hsl(240, 5%, 64.9%)" },
};

const axisStyle = {
  tick: { fill: "hsl(240, 5%, 64.9%)", fontSize: 9, fontFamily: "JetBrains Mono, monospace" },
  axisLine: false as const,
  tickLine: false as const,
};

export default function ClaudePage() {
  const [range, setRange] = useState<Range>("30d");

  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : null;
  const since = days ? subDays(new Date(), days).toISOString() : null;

  // All-time data for top stats
  const { data: allData = [], isLoading: allLoading } = useQuery({
    queryKey: ["claude_usage_all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("claude_usage")
        .select("*")
        .order("date", { ascending: false });
      return data || [];
    },
  });

  // Range-filtered data for chart and range-specific stats
  const { data: rangeData = [], isLoading: rangeLoading } = useQuery({
    queryKey: ["claude_usage_range", range],
    queryFn: async () => {
      let q = supabase.from("claude_usage").select("*").order("date", { ascending: true });
      if (since) q = q.gte("date", since.slice(0, 10));
      const { data } = await q;
      return data || [];
    },
  });

  const isLoading = allLoading || rangeLoading;

  const stats = useMemo(() => {
    const totalSessions = allData.length;
    const totalMessages = allData.reduce((s: number, r: any) => s + (r.messages || 0), 0);
    const totalOutputTokens = allData.reduce((s: number, r: any) => s + (r.output_tokens || 0), 0);

    // Avg messages/day over last 30 days
    const cutoff = subDays(new Date(), 30).toISOString().slice(0, 10);
    const last30 = allData.filter((r: any) => r.date >= cutoff);
    const msgLast30 = last30.reduce((s: number, r: any) => s + (r.messages || 0), 0);
    const avgMsgPerDay = last30.length > 0 ? Math.round(msgLast30 / 30) : 0;

    return { totalSessions, totalMessages, totalOutputTokens, avgMsgPerDay };
  }, [allData]);

  // Activity chart: messages per day for range
  const activityData = useMemo(() => {
    const dayCounts: Record<string, { messages: number; tool_calls: number }> = {};
    for (const r of rangeData as any[]) {
      const d = r.date as string;
      if (!dayCounts[d]) dayCounts[d] = { messages: 0, tool_calls: 0 };
      dayCounts[d].messages += r.messages || 0;
      dayCounts[d].tool_calls += r.tool_calls || 0;
    }
    return Object.entries(dayCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        date: format(new Date(date + "T12:00:00"), "MMM d"),
        messages: vals.messages,
        tool_calls: vals.tool_calls,
      }));
  }, [rangeData]);

  // By project (all time)
  const byProject = useMemo(() => {
    const counts: Record<string, { messages: number; output_tokens: number }> = {};
    for (const r of allData as any[]) {
      const p = r.project || "unknown";
      if (!counts[p]) counts[p] = { messages: 0, output_tokens: 0 };
      counts[p].messages += r.messages || 0;
      counts[p].output_tokens += r.output_tokens || 0;
    }
    const sorted = Object.entries(counts)
      .sort(([, a], [, b]) => b.messages - a.messages);
    const max = sorted[0]?.[1].messages || 1;
    return sorted.map(([project, vals]) => ({
      project,
      messages: vals.messages,
      output_tokens: vals.output_tokens,
      pct: (vals.messages / max) * 100,
    }));
  }, [allData]);

  // Recent sessions (last 20)
  const recentSessions = useMemo(() => {
    return [...(allData as any[])]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20);
  }, [allData]);

  const tickInterval = Math.max(1, Math.floor(activityData.length / 7));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Claude Usage</h1>
            <p className="text-xs text-muted-foreground">
              Session analytics — messages, tokens, and project activity
            </p>
          </div>
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">
            Total Sessions
          </p>
          <p className="text-2xl font-bold font-mono text-foreground">
            {isLoading ? "—" : formatNum(stats.totalSessions)}
          </p>
          <p className="text-[9px] text-muted-foreground font-mono mt-0.5">all time</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">
            Total Messages
          </p>
          <p className="text-2xl font-bold font-mono text-foreground">
            {isLoading ? "—" : formatNum(stats.totalMessages)}
          </p>
          <p className="text-[9px] text-muted-foreground font-mono mt-0.5">all time</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">
            Output Tokens
          </p>
          <p className="text-2xl font-bold font-mono text-foreground">
            {isLoading ? "—" : formatNum(stats.totalOutputTokens)}
          </p>
          <p className="text-[9px] text-muted-foreground font-mono mt-0.5">all time</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">
            Avg Msgs / Day
          </p>
          <p className="text-2xl font-bold font-mono text-foreground">
            {isLoading ? "—" : formatNum(stats.avgMsgPerDay)}
          </p>
          <p className="text-[9px] text-muted-foreground font-mono mt-0.5">last 30 days</p>
        </div>
      </div>

      {/* Activity chart */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground mb-4">Messages per Day</p>
        <div className="h-52">
          {activityData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No data for this range
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 3.7%, 20%)" vertical={false} />
                <XAxis dataKey="date" {...axisStyle} interval={tickInterval} />
                <YAxis {...axisStyle} width={32} />
                <Tooltip
                  {...tooltipStyle}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div
                        style={{
                          backgroundColor: "hsl(240, 10%, 6%)",
                          border: "1px solid hsl(240, 3.7%, 15.9%)",
                          borderRadius: "4px",
                          padding: "6px 10px",
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: "11px",
                        }}
                      >
                        <p style={{ color: "hsl(240, 5%, 64.9%)", marginBottom: 4 }}>{label}</p>
                        <p style={{ color: "#e5e7eb" }}>messages: {d?.messages}</p>
                        <p style={{ color: "hsl(240, 5%, 64.9%)" }}>tool calls: {d?.tool_calls}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="messages" fill={PURPLE} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Two-column: by project + recent sessions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* By Project */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground mb-3">By Project</p>
          <div className="space-y-3">
            {byProject.length === 0 ? (
              <p className="text-xs text-muted-foreground">No data</p>
            ) : (
              byProject.map(({ project, messages, output_tokens, pct }) => (
                <div key={project}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground capitalize">{project}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-foreground">{formatNum(messages)} msgs</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{formatNum(output_tokens)} tok</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: projectColor(project) }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground mb-3">Recent Sessions</p>
          <div className="space-y-1">
            {recentSessions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No data</p>
            ) : (
              recentSessions.map((s: any) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 rounded-md border border-border/50 bg-background/30 px-3 py-2"
                >
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0 w-16">
                    {s.date}
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium shrink-0 capitalize"
                    style={{
                      backgroundColor: `${projectColor(s.project || "unknown")}22`,
                      color: projectColor(s.project || "unknown"),
                    }}
                  >
                    {s.project || "—"}
                  </span>
                  <span className="text-[10px] font-mono text-foreground shrink-0">
                    {s.messages}m
                  </span>
                  <span className="flex-1 text-right text-[10px] font-mono text-muted-foreground truncate">
                    {formatNum(s.output_tokens || 0)} tok
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0 truncate max-w-[80px]">
                    {s.model ? shortModel(s.model) : "—"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
