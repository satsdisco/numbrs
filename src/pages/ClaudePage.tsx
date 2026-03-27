import { useState, useMemo, useRef, useEffect } from "react";
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
type TabKey = "overview" | "openclaw" | "code";

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
  created_at?: string;
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

const MONTHLY_PLAN_COST_KEY = "numbrs_claude_monthly_cost";
function getMonthlyPlanCost(): number {
  const stored = localStorage.getItem(MONTHLY_PLAN_COST_KEY);
  const parsed = stored ? parseFloat(stored) : NaN;
  return isNaN(parsed) ? 200 : parsed;
}

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

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ range }: { range: Range }) {
  const since = sinceDate(range);
  const rangeLabel = RANGES.find((r) => r.key === range)?.label ?? range;
  const [monthlyPlanCost, setMonthlyPlanCost] = useState<number>(getMonthlyPlanCost);
  const [editingCost, setEditingCost] = useState(false);
  const [costInput, setCostInput] = useState<string>("");
  const costInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingCost && costInputRef.current) {
      costInputRef.current.focus();
      costInputRef.current.select();
    }
  }, [editingCost]);

  const { data: openclawRows = [], isLoading: ocLoading } = useQuery({
    queryKey: ["overview_openclaw", range],
    queryFn: async (): Promise<{ date: string; session_id: string; output_tokens: number; input_tokens: number; cost_usd: number }[]> => {
      const { data } = await supabase
        .from("openclaw_usage")
        .select("date, session_id, output_tokens, input_tokens, cost_usd")
        .gte("date", since)
        .order("date", { ascending: true });
      return (data as any[]) || [];
    },
  });

  const { data: codeRows = [], isLoading: codeLoading } = useQuery({
    queryKey: ["overview_code", range],
    queryFn: async (): Promise<{ date: string; session_id: string; output_tokens: number; input_tokens: number }[]> => {
      const { data } = await supabase
        .from("claude_usage")
        .select("date, session_id, output_tokens, input_tokens")
        .gte("date", since)
        .order("date", { ascending: true });
      return (data as any[]) || [];
    },
  });

  const isLoading = ocLoading || codeLoading;

  // ── Stats ────────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const ocOutputTokens = openclawRows.reduce((s, r) => s + (r.output_tokens || 0), 0);
    const codeOutputTokens = codeRows.reduce((s, r) => s + (r.output_tokens || 0), 0);
    const codeInputTokens = codeRows.reduce((s, r) => s + (r.input_tokens || 0), 0);
    const totalOutputTokens = ocOutputTokens + codeOutputTokens;

    const ocCost = openclawRows.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);
    const codeCost = (codeOutputTokens * 15) / 1_000_000 + (codeInputTokens * 3) / 1_000_000;
    const totalApiValue = ocCost + codeCost;

    const ocSessions = new Set(openclawRows.map((r) => r.session_id).filter(Boolean)).size;
    const codeSessions = new Set(codeRows.map((r) => r.session_id).filter(Boolean)).size;
    const totalSessions = ocSessions + codeSessions;

    // Most active day
    const dayTotals: Record<string, number> = {};
    for (const r of openclawRows) {
      dayTotals[r.date] = (dayTotals[r.date] || 0) + (r.output_tokens || 0);
    }
    for (const r of codeRows) {
      dayTotals[r.date] = (dayTotals[r.date] || 0) + (r.output_tokens || 0);
    }
    const mostActiveDay =
      Object.entries(dayTotals).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
    const mostActiveDayLabel = mostActiveDay
      ? (() => {
          try {
            return format(new Date(mostActiveDay + "T12:00:00"), "MMM d");
          } catch {
            return mostActiveDay;
          }
        })()
      : "—";

    return {
      totalOutputTokens,
      totalApiValue,
      totalSessions,
      mostActiveDayLabel,
      ocCost,
      codeCost,
    };
  }, [openclawRows, codeRows]);

  // ── Combined daily bar chart ──────────────────────────────────────────────────

  const combinedChartData = useMemo(() => {
    const dateMap: Record<string, { openclaw: number; code: number }> = {};

    for (const r of openclawRows) {
      if (!dateMap[r.date]) dateMap[r.date] = { openclaw: 0, code: 0 };
      dateMap[r.date].openclaw += r.output_tokens || 0;
    }
    for (const r of codeRows) {
      if (!dateMap[r.date]) dateMap[r.date] = { openclaw: 0, code: 0 };
      dateMap[r.date].code += r.output_tokens || 0;
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
  }, [openclawRows, codeRows, range]);

  const tickInterval = Math.max(1, Math.floor(combinedChartData.length / 8));
  const combinedTotal = stats.ocCost + stats.codeCost;
  const roiMultiplier = combinedTotal > 0 ? combinedTotal / monthlyPlanCost : 0;

  // For ROI bar: scale so the longer bar fills 100%
  const maxVal = Math.max(combinedTotal, monthlyPlanCost, 0.01);
  const planBarWidth = (monthlyPlanCost / maxVal) * 100;
  const valueBarWidth = (combinedTotal / maxVal) * 100;

  function CombinedTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
    return (
      <div style={{ ...tooltipContentStyle, padding: "8px 12px", minWidth: "160px" }}>
        <p style={{ ...tooltipLabelStyle, marginBottom: 6 }}>{label}</p>
        <p style={{ color: "#e5e7eb", marginBottom: 4, fontSize: "12px" }}>
          total: {formatTokens(total)}
        </p>
        {[...payload].reverse().map((p: any) => (
          <div
            key={p.dataKey}
            style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 2 }}
          >
            <span style={{ color: p.fill }}>
              {p.dataKey === "openclaw" ? "OpenClaw" : "Claude Code"}
            </span>
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
          value={formatTokens(stats.totalOutputTokens)}
          sub={`${rangeLabel} — both sources`}
          loading={isLoading}
        />
        <StatCard
          label="API Equiv Value"
          value={formatCost(stats.totalApiValue)}
          sub={`${rangeLabel} — vs pay-per-token`}
          loading={isLoading}
        />
        <StatCard
          label="Total Sessions"
          value={stats.totalSessions.toLocaleString()}
          sub={`${rangeLabel} — both sources`}
          loading={isLoading}
        />
        <StatCard
          label="Most Active Day"
          value={stats.mostActiveDayLabel}
          sub="peak output tokens"
          loading={isLoading}
        />
      </div>

      {/* Combined daily bar chart */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground mb-4">Combined Output Tokens by Day</p>
        <div className="h-64">
          {combinedChartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {isLoading ? "Loading…" : "No data for this range"}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={combinedChartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
                <Tooltip content={<CombinedTooltip />} />
                <Legend
                  {...legendStyle}
                  formatter={(value: string) =>
                    value === "openclaw" ? "OpenClaw" : "Claude Code"
                  }
                />
                <Bar dataKey="openclaw" stackId="a" fill="#a855f7" radius={[0, 0, 0, 0]} />
                <Bar dataKey="code" stackId="a" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Value of Max breakdown */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-5">
          <p className="text-sm font-medium text-foreground">Value of Max — </p>
          {editingCost ? (
            <input
              ref={costInputRef}
              type="number"
              value={costInput}
              onChange={(e) => setCostInput(e.target.value)}
              onBlur={() => {
                const val = parseFloat(costInput);
                if (!isNaN(val) && val > 0) {
                  setMonthlyPlanCost(val);
                  localStorage.setItem(MONTHLY_PLAN_COST_KEY, String(val));
                }
                setEditingCost(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setEditingCost(false);
              }}
              className="w-20 rounded border border-primary bg-background px-1.5 py-0.5 font-mono text-sm text-foreground focus:outline-none"
            />
          ) : (
            <button
              onClick={() => { setCostInput(String(monthlyPlanCost)); setEditingCost(true); }}
              className="font-mono text-sm text-muted-foreground hover:text-foreground underline decoration-dashed underline-offset-2 transition-colors"
              title="Click to edit monthly plan cost"
            >
              {formatCost(monthlyPlanCost)}/mo
            </button>
          )}
          <p className="text-sm font-medium text-foreground">Plan ROI</p>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: line items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">OpenClaw API equiv</span>
              <span className="text-sm font-bold font-mono text-purple-400">
                {isLoading ? "—" : formatCost(stats.ocCost)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">Claude Code API equiv</span>
              <span className="text-sm font-bold font-mono text-blue-400">
                {isLoading ? "—" : formatCost(stats.codeCost)}
              </span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground font-mono">Combined total</span>
              <span className="text-sm font-bold font-mono text-foreground">
                {isLoading ? "—" : formatCost(combinedTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">Monthly plan cost</span>
              <span className="text-sm font-mono text-muted-foreground">
                {formatCost(monthlyPlanCost)}
              </span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground font-mono">ROI multiplier</span>
              <span className="text-xl font-bold font-mono text-green-400">
                {isLoading ? "—" : `${roiMultiplier.toFixed(1)}x`}
              </span>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground">
              return on investment vs API pricing
            </p>
          </div>

          {/* Right: visual comparison */}
          <div className="flex flex-col justify-center gap-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              Plan vs Value
            </p>

            {/* Plan cost bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                <span>Plan Cost</span>
                <span>{formatCost(monthlyPlanCost)}</span>
              </div>
              <div className="h-5 rounded-sm bg-muted overflow-hidden">
                <div
                  className="h-full bg-muted-foreground/40 rounded-sm transition-all duration-700"
                  style={{ width: `${planBarWidth}%` }}
                />
              </div>
            </div>

            {/* API value bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-muted-foreground">API Value</span>
                <span className="text-green-400">{isLoading ? "—" : formatCost(combinedTotal)}</span>
              </div>
              <div className="h-5 rounded-sm bg-muted overflow-hidden">
                <div
                  className="h-full rounded-sm transition-all duration-700"
                  style={{
                    width: `${valueBarWidth}%`,
                    background: "linear-gradient(90deg, #a855f7 0%, #3b82f6 100%)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
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

  // Separate query for heatmap — 90d, uses created_at
  const { data: heatmapRows = [] } = useQuery({
    queryKey: ["openclaw_heatmap"],
    queryFn: async (): Promise<{ output_tokens: number; created_at: string; session_started_at: string | null }[]> => {
      const since90 = format(subDays(new Date(), 90), "yyyy-MM-dd");
      const { data } = await supabase
        .from("openclaw_usage")
        .select("output_tokens, created_at, session_started_at")
        .gte("date", since90);
      return (data as any[]) || [];
    },
  });

  // Separate query for monthly trend — last 6 months
  const { data: monthlyRows = [] } = useQuery({
    queryKey: ["openclaw_monthly"],
    queryFn: async (): Promise<{ date: string; output_tokens: number }[]> => {
      const since6m = format(subDays(new Date(), 180), "yyyy-MM-dd");
      const { data } = await supabase
        .from("openclaw_usage")
        .select("date, output_tokens")
        .gte("date", since6m);
      return (data as any[]) || [];
    },
  });

  // ── Stats ────────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const outputTokens = rows.reduce((s, r) => s + (r.output_tokens || 0), 0);
    const totalCost = rows.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);
    const sessions = new Set(rows.map((r) => r.session_id).filter(Boolean)).size;

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
    return [
      ...uniqueModels.filter((m) => keys.has(m)),
      ...[...keys].filter((k) => !uniqueModels.includes(k)),
    ];
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
    const sorted = Object.entries(agg)
      .filter(([, v]) => v.output_tokens > 0 || v.cost_usd > 0)
      .sort(([, a], [, b]) => b.output_tokens - a.output_tokens);
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

  // ── Heatmap: day-of-week × hour ──────────────────────────────────────────────

  const heatmapData = useMemo(() => {
    // 7 rows (0=Sun … 6=Sat), 24 cols (0–23h)
    const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
    for (const r of heatmapRows) {
      // prefer session_started_at (actual session time), fall back to created_at (sync time)
      const ts = r.session_started_at || r.created_at;
      if (!ts) continue;
      try {
        const d = new Date(ts);
        const dow = d.getDay(); // 0=Sun
        const hour = d.getHours();
        grid[dow][hour] += r.output_tokens || 0;
      } catch {
        // skip bad timestamps
      }
    }
    const max = Math.max(...grid.flat(), 1);
    return { grid, max };
  }, [heatmapRows]);

  // ── Monthly trend data ────────────────────────────────────────────────────────

  const monthlyData = useMemo(() => {
    const agg: Record<string, number> = {};
    for (const r of monthlyRows) {
      const month = r.date.substring(0, 7); // "YYYY-MM"
      agg[month] = (agg[month] || 0) + (r.output_tokens || 0);
    }
    return Object.entries(agg)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, tokens]) => {
        let label: string;
        try {
          label = format(new Date(month + "-15"), "MMM yy");
        } catch {
          label = month;
        }
        return { month: label, tokens };
      });
  }, [monthlyRows]);

  const tickInterval = Math.max(1, Math.floor(stackedData.length / 8));
  const rangeLabel = RANGES.find((r) => r.key === range)?.label ?? range;

  const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
          <div
            key={p.dataKey}
            style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 2 }}
          >
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
              <p className="text-xs text-muted-foreground">
                {isLoading ? "Loading…" : "No data"}
              </p>
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
              <p className="text-xs text-muted-foreground">
                {isLoading ? "Loading…" : "No data"}
              </p>
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
                      style={{
                        width: `${pct}%`,
                        backgroundColor: COLOR_PALETTE[i % COLOR_PALETTE.length],
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Peak Hours Heatmap */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground mb-1">Peak Hours — Last 90 Days</p>
        <p className="text-[10px] text-muted-foreground font-mono mb-4">
          Output token intensity by day of week × hour
        </p>

        {heatmapRows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No heatmap data yet — check back after 7+ days of usage.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[520px]">
              {/* Hour labels */}
              <div className="flex items-center mb-1 ml-8">
                {Array.from({ length: 24 }, (_, h) => (
                  <div
                    key={h}
                    className="flex-1 text-center"
                    style={{ minWidth: 0 }}
                  >
                    {h % 4 === 0 ? (
                      <span className="text-[8px] font-mono text-muted-foreground">{h}</span>
                    ) : null}
                  </div>
                ))}
              </div>

              {/* Grid rows */}
              <div className="space-y-0.5">
                {DAYS_SHORT.map((day, dow) => (
                  <div key={dow} className="flex items-center gap-1">
                    <span className="text-[9px] font-mono text-muted-foreground w-7 shrink-0 text-right">
                      {day}
                    </span>
                    <div className="flex flex-1 gap-0.5">
                      {Array.from({ length: 24 }, (_, hour) => {
                        const val = heatmapData.grid[dow][hour];
                        const intensity = val / heatmapData.max;
                        return (
                          <div
                            key={hour}
                            title={`${day} ${hour}:00 — ${formatTokens(val)}`}
                            className="flex-1 h-4 rounded-[2px] transition-all duration-300"
                            style={{
                              backgroundColor:
                                val === 0
                                  ? "hsl(240, 3.7%, 15.9%)"
                                  : `rgba(168, 85, 247, ${0.15 + intensity * 0.85})`,
                              minWidth: 0,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-2 mt-3 ml-8">
                <span className="text-[9px] font-mono text-muted-foreground">less</span>
                {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
                  <div
                    key={v}
                    className="w-3 h-3 rounded-[2px]"
                    style={{ backgroundColor: `rgba(168, 85, 247, ${0.15 + v * 0.85})` }}
                  />
                ))}
                <span className="text-[9px] font-mono text-muted-foreground">more</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Trend */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground mb-1">Monthly Output Token Trend</p>
        <p className="text-[10px] text-muted-foreground font-mono mb-4">Last 6 months</p>
        <div className="h-52">
          {monthlyData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(240, 3.7%, 20%)"
                  vertical={false}
                />
                <XAxis dataKey="month" {...axisStyle} />
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
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={{ fill: "#a855f7", r: 3 }}
                  activeDot={{ r: 5, fill: "#a855f7" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
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

  // Top sessions query
  const { data: topSessionRows = [], isLoading: topSessionsLoading } = useQuery({
    queryKey: ["claude_top_sessions", range],
    queryFn: async (): Promise<{ date: string; project: string; output_tokens: number; tool_calls: number; model: string; session_id: string }[]> => {
      const { data } = await supabase
        .from("claude_usage")
        .select("date, project, output_tokens, tool_calls, model, session_id")
        .gte("date", since)
        .order("output_tokens", { ascending: false })
        .limit(10);
      return (data as any[]) || [];
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
      const p = topProjects.includes(r.project || "other") ? r.project || "other" : "other";
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

  // ── By Project breakdown with last active ────────────────────────────────────

  const byProject = useMemo(() => {
    const agg: Record<string, { output_tokens: number; input_tokens: number; lastActive: string }> = {};
    for (const r of rows) {
      const p = r.project || "unknown";
      if (!agg[p]) agg[p] = { output_tokens: 0, input_tokens: 0, lastActive: r.date };
      agg[p].output_tokens += r.output_tokens || 0;
      agg[p].input_tokens += r.input_tokens || 0;
      if (r.date > agg[p].lastActive) agg[p].lastActive = r.date;
    }
    const sorted = Object.entries(agg).sort(([, a], [, b]) => b.output_tokens - a.output_tokens);
    const totalOut = sorted.reduce((s, [, v]) => s + v.output_tokens, 0) || 1;
    return sorted.map(([project, vals], i) => ({
      project,
      output_tokens: vals.output_tokens,
      input_tokens: vals.input_tokens,
      lastActive: vals.lastActive,
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
          <div
            key={p.dataKey}
            style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 2 }}
          >
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
        {/* By Project with last active */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground mb-3">By Project</p>
          <div className="space-y-3">
            {byProject.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {isLoading ? "Loading…" : "No data"}
              </p>
            ) : (
              byProject.map(({ project, output_tokens, input_tokens, pct, color, lastActive }) => {
                let lastActiveLabel: string;
                try {
                  lastActiveLabel = format(new Date(lastActive + "T12:00:00"), "MMM d");
                } catch {
                  lastActiveLabel = lastActive;
                }
                return (
                  <div key={project}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-foreground capitalize">
                        {project}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-muted-foreground">
                          {lastActiveLabel}
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
                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                      in: {formatTokens(input_tokens)}
                    </p>
                  </div>
                );
              })
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
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: "#3b82f6" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Top Sessions table */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground mb-3">Top 10 Sessions by Output Tokens</p>
        {topSessionRows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {topSessionsLoading ? "Loading…" : "No data for this range"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground pb-2 pr-3">
                    Date
                  </th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground pb-2 pr-3">
                    Project
                  </th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-muted-foreground pb-2 pr-3">
                    Output
                  </th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-muted-foreground pb-2 pr-3">
                    Tools
                  </th>
                  <th className="text-left text-[10px] uppercase tracking-wider text-muted-foreground pb-2">
                    Model
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topSessionRows.map((row, i) => {
                  let dateLabel: string;
                  try {
                    dateLabel = format(new Date(row.date + "T12:00:00"), "MMM d");
                  } catch {
                    dateLabel = row.date;
                  }
                  return (
                    <tr key={row.session_id || i} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 pr-3 text-muted-foreground">{dateLabel}</td>
                      <td className="py-2 pr-3">
                        <span
                          className="capitalize"
                          style={{ color: projectColor(row.project || "other", i) }}
                        >
                          {row.project || "—"}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right text-foreground">
                        {formatTokens(row.output_tokens || 0)}
                      </td>
                      <td className="py-2 pr-3 text-right text-muted-foreground">
                        {(row.tool_calls || 0).toLocaleString()}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {row.model ? shortModelName(row.model) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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

  const totalCost = openclawRows.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);

  if (totalCost === 0) return null;

  return (
    <div className="rounded-md border border-purple-500/30 bg-purple-500/10 px-4 py-2.5 flex items-center gap-2">
      <span className="text-base">💜</span>
      <p className="text-xs font-mono text-purple-300">
        OpenClaw API equivalent:{" "}
        <span className="font-bold text-purple-100">{formatCost(totalCost)}</span>
        {" "}— saved vs pay-per-token pricing
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ClaudePage() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [range, setRange] = useState<Range>("month");

  const TABS: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "openclaw", label: "OpenClaw" },
    { key: "code", label: "Claude Code" },
  ];

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
      <div className="sticky top-0 z-10 -mx-6 px-6 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/50">
      <div className="flex items-center gap-1 rounded-md border border-border bg-background p-0.5 w-fit">
        {TABS.map(({ key, label }) => (
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

      </div>

      {/* API Saved Banner — only on non-overview tabs */}
      {tab !== "overview" && <ApiSavedBanner range={range} />}

      {/* Tab content */}
      {tab === "overview" && <OverviewTab range={range} />}
      {tab === "openclaw" && <OpenClawTab range={range} />}
      {tab === "code" && <ClaudeCodeTab range={range} />}
    </div>
  );
}
