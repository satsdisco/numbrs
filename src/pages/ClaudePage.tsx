import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bot } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Range = "day" | "week" | "month" | "3months";
type TabKey = "openclaw" | "code";

interface UsageRow {
  id?: number;
  date: string;
  project: string;
  messages: number;
  tool_calls: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  model: string;
  session_id: string;
  created_at: string;
}

interface OpenClawRow {
  date: string;
  session_id: string;
  channel: string;
  model: string;
  messages: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  cost_usd: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RANGES: { key: Range; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "3months", label: "3 Months" },
];

const PROJECT_COLORS: Record<string, string> = {
  numbrs: "#7c3aed",
  samizdat: "#2563eb",
  meshngr: "#16a34a",
  workspace: "#d97706",
  hacek: "#db2777",
  jellyamp: "#0891b2",
  other: "#6b7280",
};

const MODEL_COLORS: Record<string, string> = {
  opus: "#7c3aed",
  sonnet: "#2563eb",
  haiku: "#16a34a",
  other: "#6b7280",
};

const COLOR_PALETTE = [
  "#7c3aed",
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#db2777",
  "#0891b2",
  "#6b7280",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCost(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function projectColor(project: string, index: number): string {
  return PROJECT_COLORS[project] ?? COLOR_PALETTE[index % COLOR_PALETTE.length];
}

function modelFamily(model: string): string {
  if (model.includes("opus")) return "opus";
  if (model.includes("sonnet")) return "sonnet";
  if (model.includes("haiku")) return "haiku";
  return "other";
}

function modelColor(model: string): string {
  return MODEL_COLORS[modelFamily(model)] ?? MODEL_COLORS.other;
}

function shortModelName(model: string): string {
  // "claude-opus-4-6" → "opus-4-6", "claude-sonnet-4-6" → "sonnet-4-6"
  return model.replace(/^claude-/, "");
}

function cleanChannelName(channel: string): string {
  if (channel === "main") return "Direct Chat";
  if (channel.startsWith("slack:")) return "Slack";
  if (channel.startsWith("discord:")) return "Discord";
  if (channel.startsWith("telegram:")) return "Telegram";
  if (channel.startsWith("whatsapp:")) return "WhatsApp";
  return channel;
}

function sinceDate(range: Range): string {
  switch (range) {
    case "day":
      return format(startOfDay(new Date()), "yyyy-MM-dd");
    case "week":
      return format(subDays(new Date(), 7), "yyyy-MM-dd");
    case "month":
      return format(subDays(new Date(), 30), "yyyy-MM-dd");
    case "3months":
      return format(subDays(new Date(), 90), "yyyy-MM-dd");
  }
}

// ─── Styled tooltip ───────────────────────────────────────────────────────────

const tooltipContentStyle = {
  backgroundColor: "hsl(240, 10%, 6%)",
  border: "1px solid hsl(240, 3.7%, 15.9%)",
  borderRadius: "4px",
  fontFamily: "JetBrains Mono, monospace",
  fontSize: "11px",
};

const tooltipLabelStyle = { color: "hsl(240, 5%, 64.9%)" };

const axisStyle = {
  tick: { fill: "hsl(240, 5%, 64.9%)", fontSize: 9, fontFamily: "JetBrains Mono, monospace" },
  axisLine: false as const,
  tickLine: false as const,
};

const legendStyle = {
  wrapperStyle: {
    fontSize: "10px",
    fontFamily: "JetBrains Mono, monospace",
    color: "hsl(240, 5%, 64.9%)",
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function RangeSelector({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-background p-0.5">
      {RANGES.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={cn(
            "rounded-sm px-3 py-1 font-mono text-xs font-medium transition-all",
            value === key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold font-mono text-foreground">{loading ? "—" : value}</p>
      {sub && <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── OpenClaw Tab ─────────────────────────────────────────────────────────────

function OpenClawTab({ range }: { range: Range }) {
  const since = sinceDate(range);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["openclaw_usage", range],
    queryFn: async (): Promise<OpenClawRow[]> => {
      const { data } = await supabase
        .from("openclaw_usage")
        .select(
          "date, session_id, channel, model, messages, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd"
        )
        .gte("date", since)
        .order("date", { ascending: true });
      return (data as OpenClawRow[]) || [];
    },
  });

  // ── Stats ────────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const outputTokens = rows.reduce((s, r) => s + (r.output_tokens || 0), 0);
    const totalCost = rows.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);
    const sessions = new Set(rows.map((r) => r.session_id).filter(Boolean)).size;

    // Top model by output tokens
    const modelTokens: Record<string, number> = {};
    for (const r of rows) {
      const m = r.model || "unknown";
      modelTokens[m] = (modelTokens[m] || 0) + (r.output_tokens || 0);
    }
    const topModelFull =
      Object.entries(modelTokens).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "—";
    const topModel = topModelFull !== "—" ? shortModelName(topModelFull) : "—";

    return { outputTokens, totalCost, sessions, topModel };
  }, [rows]);

  // ── Unique models for stacked chart ─────────────────────────────────────────

  const uniqueModels = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const r of rows) {
      const m = r.model || "other";
      totals[m] = (totals[m] || 0) + (r.output_tokens || 0);
    }
    return Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .map(([m]) => m);
  }, [rows]);

  // ── Stacked bar by model ─────────────────────────────────────────────────────

  const stackedData = useMemo(() => {
    const dateMap: Record<string, Record<string, number>> = {};
    for (const r of rows) {
      const d = r.date;
      if (!dateMap[d]) dateMap[d] = {};
      const m = r.model || "other";
      dateMap[d][m] = (dateMap[d][m] || 0) + (r.output_tokens || 0);
    }
    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => {
        let label: string;
        try {
          label = format(new Date(date + "T12:00:00"), range === "day" ? "HH:mm" : "MMM d");
        } catch {
          label = date;
        }
        return { date: label, rawDate: date, ...vals };
      });
  }, [rows, range]);

  const allModelKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const d of stackedData) {
      for (const k of Object.keys(d)) {
        if (k !== "date" && k !== "rawDate") keys.add(k);
      }
    }
    return [...uniqueModels.filter((m) => keys.has(m)), ...[...keys].filter((k) => !uniqueModels.includes(k))];
  }, [stackedData, uniqueModels]);

  // ── By model breakdown ───────────────────────────────────────────────────────

  const byModel = useMemo(() => {
    const agg: Record<string, { output_tokens: number; cost_usd: number }> = {};
    for (const r of rows) {
      const m = r.model || "unknown";
      if (!agg[m]) agg[m] = { output_tokens: 0, cost_usd: 0 };
      agg[m].output_tokens += r.output_tokens || 0;
      agg[m].cost_usd += Number(r.cost_usd) || 0;
    }
    const sorted = Object.entries(agg).sort(([, a], [, b]) => b.output_tokens - a.output_tokens);
    const totalOut = sorted.reduce((s, [, v]) => s + v.output_tokens, 0) || 1;
    return sorted.map(([model, vals]) => ({
      model,
      shortName: shortModelName(model),
      output_tokens: vals.output_tokens,
      cost_usd: vals.cost_usd,
      pct: (vals.output_tokens / totalOut) * 100,
      color: modelColor(model),
    }));
  }, [rows]);

  // ── Channel breakdown ────────────────────────────────────────────────────────

  const byChannel = useMemo(() => {
    const agg: Record<string, number> = {};
    for (const r of rows) {
      const cleanName = cleanChannelName(r.channel || "unknown");
      agg[cleanName] = (agg[cleanName] || 0) + (r.messages || 0);
    }
    const total = Object.values(agg).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(agg)
      .sort(([, a], [, b]) => b - a)
      .map(([channel, messages]) => ({
        channel,
        messages,
        pct: (messages / total) * 100,
      }));
  }, [rows]);

  const tickInterval = Math.max(1, Math.floor(stackedData.length / 8));
  const rangeLabel = RANGES.find((r) => r.key === range)?.label ?? range;

  function StackedTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
    return (
      <div style={{ ...tooltipContentStyle, padding: "8px 12px", minWidth: "160px" }}>
        <p style={{ ...tooltipLabelStyle, marginBottom: 6 }}>{label}</p>
        <p style={{ color: "#e5e7eb", marginBottom: 4, fontSize: "12px" }}>
          total: {formatTokens(total)}
        </p>
        {[...payload].reverse().map((p: any) => (
          <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 2 }}>
            <span style={{ color: p.fill }}>{shortModelName(p.dataKey)}</span>
            <span style={{ color: "#e5e7eb" }}>{formatTokens(p.value)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Output Tokens"
          value={formatTokens(stats.outputTokens)}
          sub={`${rangeLabel} total`}
          loading={isLoading}
        />
        <StatCard
          label="API Equiv Cost"
          value={formatCost(stats.totalCost)}
          sub={`${rangeLabel} total`}
          loading={isLoading}
        />
        <StatCard
          label="Sessions"
          value={stats.sessions.toLocaleString()}
          sub={`${rangeLabel} total`}
          loading={isLoading}
        />
        <StatCard
          label="Top Model"
          value={stats.topModel}
          sub="by output tokens"
          loading={isLoading}
        />
      </div>

      {/* Stacked bar chart by model */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground mb-4">Token Usage by Model</p>
        <div className="h-64">
          {stackedData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {isLoading ? "Loading…" : "No data for this range"}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stackedData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 3.7%, 20%)" vertical={false} />
                <XAxis dataKey="date" {...axisStyle} interval={tickInterval} />
                <YAxis {...axisStyle} width={40} tickFormatter={(v: number) => formatTokens(v)} />
                <Tooltip content={<StackedTooltip />} />
                <Legend
                  {...legendStyle}
                  formatter={(value: string) => shortModelName(value)}
                />
                {allModelKeys.map((model, i) => (
                  <Bar
                    key={model}
                    dataKey={model}
                    stackId="a"
                    fill={modelColor(model)}
                    radius={i === allModelKeys.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Two-column row: By Model + Channel Breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* By Model */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground mb-3">By Model</p>
          <div className="space-y-3">
            {byModel.length === 0 ? (
              <p className="text-xs text-muted-foreground">{isLoading ? "Loading…" : "No data"}</p>
            ) : (
              byModel.map(({ model, shortName, output_tokens, cost_usd, pct, color }) => (
                <div key={model}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-foreground">{shortName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {formatCost(cost_usd)}
                      </span>
                      <span className="text-xs font-mono text-foreground">
                        {formatTokens(output_tokens)}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground w-9 text-right">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Channel Breakdown */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground mb-3">By Channel</p>
          <div className="space-y-3">
            {byChannel.length === 0 ? (
              <p className="text-xs text-muted-foreground">{isLoading ? "Loading…" : "No data"}</p>
            ) : (
              byChannel.map(({ channel, messages, pct }, i) => (
                <div key={channel}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-foreground">{channel}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-foreground">
                        {messages.toLocaleString()} msgs
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground w-9 text-right">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: COLOR_PALETTE[i % COLOR_PALETTE.length] }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Claude Code Tab ──────────────────────────────────────────────────────────

function ClaudeCodeTab({ range }: { range: Range }) {
  const since = sinceDate(range);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["claude_usage_v2", range],
    queryFn: async (): Promise<UsageRow[]> => {
      const { data } = await supabase
        .from("claude_usage")
        .select(
          "date, project, messages, tool_calls, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, model, session_id, created_at"
        )
        .gte("date", since)
        .order("date", { ascending: true });
      return (data as UsageRow[]) || [];
    },
  });

  // ── Aggregate stats ──────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const outputTokens = rows.reduce((s, r) => s + (r.output_tokens || 0), 0);
    const inputTokens = rows.reduce((s, r) => s + (r.input_tokens || 0), 0);
    const sessions = rows.length;

    const projectTokens: Record<string, number> = {};
    for (const r of rows) {
      const p = r.project || "unknown";
      projectTokens[p] = (projectTokens[p] || 0) + (r.output_tokens || 0);
    }
    const topProject =
      Object.entries(projectTokens).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "—";

    return { outputTokens, inputTokens, sessions, topProject };
  }, [rows]);

  // ── Top 6 projects for stacked chart ────────────────────────────────────────

  const topProjects = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const r of rows) {
      const p = r.project || "other";
      totals[p] = (totals[p] || 0) + (r.output_tokens || 0);
    }
    return Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name]) => name);
  }, [rows]);

  // ── Stacked bar data ─────────────────────────────────────────────────────────

  const stackedData = useMemo(() => {
    const dateMap: Record<string, Record<string, number>> = {};
    for (const r of rows) {
      const d = r.date;
      if (!dateMap[d]) dateMap[d] = {};
      const p = topProjects.includes(r.project || "other") ? (r.project || "other") : "other";
      dateMap[d][p] = (dateMap[d][p] || 0) + (r.output_tokens || 0);
    }
    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => {
        let label: string;
        try {
          label = format(new Date(date + "T12:00:00"), range === "day" ? "HH:mm" : "MMM d");
        } catch {
          label = date;
        }
        return { date: label, rawDate: date, ...vals };
      });
  }, [rows, topProjects, range]);

  // ── By Project breakdown ─────────────────────────────────────────────────────

  const byProject = useMemo(() => {
    const agg: Record<string, { output_tokens: number; input_tokens: number }> = {};
    for (const r of rows) {
      const p = r.project || "unknown";
      if (!agg[p]) agg[p] = { output_tokens: 0, input_tokens: 0 };
      agg[p].output_tokens += r.output_tokens || 0;
      agg[p].input_tokens += r.input_tokens || 0;
    }
    const sorted = Object.entries(agg).sort(([, a], [, b]) => b.output_tokens - a.output_tokens);
    const totalOut = sorted.reduce((s, [, v]) => s + v.output_tokens, 0) || 1;
    return sorted.map(([project, vals], i) => ({
      project,
      output_tokens: vals.output_tokens,
      input_tokens: vals.input_tokens,
      pct: (vals.output_tokens / totalOut) * 100,
      color: projectColor(project, i),
    }));
  }, [rows]);

  // ── Token trend by day ───────────────────────────────────────────────────────

  const trendData = useMemo(() => {
    const dayCounts: Record<string, number> = {};
    for (const r of rows) {
      const d = r.date;
      dayCounts[d] = (dayCounts[d] || 0) + (r.output_tokens || 0);
    }
    return Object.entries(dayCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, tokens]) => {
        let label: string;
        try {
          label = format(new Date(date + "T12:00:00"), "MMM d");
        } catch {
          label = date;
        }
        return { date: label, tokens };
      });
  }, [rows]);

  const allStackKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const d of stackedData) {
      for (const k of Object.keys(d)) {
        if (k !== "date" && k !== "rawDate") keys.add(k);
      }
    }
    return [
      ...topProjects.filter((p) => keys.has(p)),
      ...[...keys].filter((k) => !topProjects.includes(k)),
    ];
  }, [stackedData, topProjects]);

  const tickInterval = Math.max(1, Math.floor(stackedData.length / 8));
  const trendTickInterval = Math.max(1, Math.floor(trendData.length / 8));
  const rangeLabel = RANGES.find((r) => r.key === range)?.label ?? range;

  function StackedTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
    return (
      <div style={{ ...tooltipContentStyle, padding: "8px 12px", minWidth: "160px" }}>
        <p style={{ ...tooltipLabelStyle, marginBottom: 6 }}>{label}</p>
        <p style={{ color: "#e5e7eb", marginBottom: 4, fontSize: "12px" }}>
          total: {formatTokens(total)}
        </p>
        {[...payload].reverse().map((p: any) => (
          <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 2 }}>
            <span style={{ color: p.fill }}>{p.dataKey}</span>
            <span style={{ color: "#e5e7eb" }}>{formatTokens(p.value)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Output Tokens"
          value={formatTokens(stats.outputTokens)}
          sub={`${rangeLabel} total`}
          loading={isLoading}
        />
        <StatCard
          label="Input Tokens"
          value={formatTokens(stats.inputTokens)}
          sub={`${rangeLabel} total`}
          loading={isLoading}
        />
        <StatCard
          label="Sessions"
          value={stats.sessions.toLocaleString()}
          sub={`${rangeLabel} total`}
          loading={isLoading}
        />
        <StatCard
          label="Top Project"
          value={stats.topProject}
          sub="by output tokens"
          loading={isLoading}
        />
      </div>

      {/* Main stacked bar chart */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground mb-4">Token Usage Over Time</p>
        <div className="h-64">
          {stackedData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {isLoading ? "Loading…" : "No data for this range"}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stackedData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 3.7%, 20%)" vertical={false} />
                <XAxis dataKey="date" {...axisStyle} interval={tickInterval} />
                <YAxis {...axisStyle} width={40} tickFormatter={(v: number) => formatTokens(v)} />
                <Tooltip content={<StackedTooltip />} />
                <Legend {...legendStyle} />
                {allStackKeys.map((project, i) => (
                  <Bar
                    key={project}
                    dataKey={project}
                    stackId="a"
                    fill={projectColor(project, i)}
                    radius={i === allStackKeys.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Two-column row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* By Project */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground mb-3">By Project</p>
          <div className="space-y-3">
            {byProject.length === 0 ? (
              <p className="text-xs text-muted-foreground">{isLoading ? "Loading…" : "No data"}</p>
            ) : (
              byProject.map(({ project, output_tokens, input_tokens, pct, color }) => (
                <div key={project}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-foreground capitalize">
                      {project}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-foreground">
                        {formatTokens(output_tokens)}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground w-9 text-right">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    in: {formatTokens(input_tokens)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Token Trend by Day */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground mb-4">Token Trend by Day</p>
          <div className="h-52">
            {trendData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                {isLoading ? "Loading…" : "No data"}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 3.7%, 20%)" vertical={false} />
                  <XAxis dataKey="date" {...axisStyle} interval={trendTickInterval} />
                  <YAxis {...axisStyle} width={40} tickFormatter={(v: number) => formatTokens(v)} />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    labelStyle={tooltipLabelStyle}
                    formatter={(v: number) => [formatTokens(v), "output tokens"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="tokens"
                    stroke="#7c3aed"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: "#7c3aed" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── API Saved Banner ─────────────────────────────────────────────────────────

function ApiSavedBanner({ range }: { range: Range }) {
  const since = sinceDate(range);

  const { data: openclawRows = [] } = useQuery({
    queryKey: ["openclaw_usage_banner", range],
    queryFn: async (): Promise<{ cost_usd: number }[]> => {
      const { data } = await supabase
        .from("openclaw_usage")
        .select("cost_usd")
        .gte("date", since);
      return (data as { cost_usd: number }[]) || [];
    },
  });

  // Claude Code doesn't have cost_usd, so we only sum OpenClaw for now
  // If/when claude_usage gets cost data this can be extended
  const totalCost = openclawRows.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);

  if (totalCost === 0) return null;

  return (
    <div className="rounded-md border border-purple-500/30 bg-purple-500/10 px-4 py-2.5 flex items-center gap-2">
      <span className="text-base">💜</span>
      <p className="text-xs font-mono text-purple-300">
        Total API equivalent value:{" "}
        <span className="font-bold text-purple-100">{formatCost(totalCost)}</span>
        {" "}— saved vs pay-per-token pricing
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ClaudePage() {
  const [tab, setTab] = useState<TabKey>("openclaw");
  const [range, setRange] = useState<Range>("month");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Claude Usage</h1>
            <p className="text-xs text-muted-foreground">Token consumption by source</p>
          </div>
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-md border border-border bg-background p-0.5 w-fit">
        {([
          { key: "openclaw" as TabKey, label: "OpenClaw" },
          { key: "code" as TabKey, label: "Claude Code" },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "rounded-sm px-4 py-1.5 font-mono text-xs font-medium transition-all",
              tab === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* API Saved Banner */}
      <ApiSavedBanner range={range} />

      {/* Tab content */}
      {tab === "openclaw" ? (
        <OpenClawTab range={range} />
      ) : (
        <ClaudeCodeTab range={range} />
      )}
    </div>
  );
}
