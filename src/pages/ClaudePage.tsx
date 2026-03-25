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

function projectColor(project: string, index: number): string {
  return PROJECT_COLORS[project] ?? COLOR_PALETTE[index % COLOR_PALETTE.length];
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ClaudePage() {
  const [range, setRange] = useState<Range>("month");

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

    // Top project by output tokens
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
    const sorted = Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name]) => name);
    return sorted;
  }, [rows]);

  // ── Stacked bar data: { date, project1: tokens, project2: tokens, ... }[] ───

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
        // Format date for display
        let label: string;
        try {
          label = format(new Date(date + "T12:00:00"), range === "day" ? "HH:mm" : "MMM d");
        } catch {
          label = date;
        }
        return { date: label, rawDate: date, ...vals };
      });
  }, [rows, topProjects, range]);

  // ── All projects breakdown for the "By Project" panel ────────────────────────

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

  // ── Token trend by day (simple line) ────────────────────────────────────────

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

  // ── All projects (including "other") for stacking ───────────────────────────
  const allStackKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const d of stackedData) {
      for (const k of Object.keys(d)) {
        if (k !== "date" && k !== "rawDate") keys.add(k);
      }
    }
    // Sort: topProjects first, then others
    return [
      ...topProjects.filter((p) => keys.has(p)),
      ...[...keys].filter((k) => !topProjects.includes(k)),
    ];
  }, [stackedData, topProjects]);

  const tickInterval = Math.max(1, Math.floor(stackedData.length / 8));
  const trendTickInterval = Math.max(1, Math.floor(trendData.length / 8));

  // ── Custom stacked bar tooltip ────────────────────────────────────────────────

  function StackedTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
    return (
      <div
        style={{
          ...tooltipContentStyle,
          padding: "8px 12px",
          minWidth: "160px",
        }}
      >
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
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Claude Usage</h1>
            <p className="text-xs text-muted-foreground">Token consumption by project and time</p>
          </div>
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Output Tokens"
          value={formatTokens(stats.outputTokens)}
          sub={`${RANGES.find((r) => r.key === range)?.label ?? range} total`}
          loading={isLoading}
        />
        <StatCard
          label="Input Tokens"
          value={formatTokens(stats.inputTokens)}
          sub={`${RANGES.find((r) => r.key === range)?.label ?? range} total`}
          loading={isLoading}
        />
        <StatCard
          label="Sessions"
          value={stats.sessions.toLocaleString()}
          sub={`${RANGES.find((r) => r.key === range)?.label ?? range} total`}
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
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(240, 3.7%, 20%)"
                  vertical={false}
                />
                <XAxis dataKey="date" {...axisStyle} interval={tickInterval} />
                <YAxis
                  {...axisStyle}
                  width={40}
                  tickFormatter={(v: number) => formatTokens(v)}
                />
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
              <p className="text-xs text-muted-foreground">
                {isLoading ? "Loading…" : "No data"}
              </p>
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
                <LineChart
                  data={trendData}
                  margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(240, 3.7%, 20%)"
                    vertical={false}
                  />
                  <XAxis dataKey="date" {...axisStyle} interval={trendTickInterval} />
                  <YAxis
                    {...axisStyle}
                    width={40}
                    tickFormatter={(v: number) => formatTokens(v)}
                  />
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
