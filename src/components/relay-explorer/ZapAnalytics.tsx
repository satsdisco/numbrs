import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import { Zap, TrendingUp, Clock, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useRelayActivity, ActivityRange } from "@/hooks/useRelayActivity";

function formatSats(sats: number): string {
  if (sats >= 1_000_000) return `${(sats / 1_000_000).toFixed(1)}M`;
  if (sats >= 1_000) return `${(sats / 1_000).toFixed(1)}k`;
  return String(sats);
}

function formatTime(time: string, range: ActivityRange): string {
  const d = new Date(time);
  if (range === "24h") return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (range === "7d") return d.toLocaleDateString([], { weekday: "short", hour: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

interface ZapAnalyticsProps {
  relayId: string | undefined;
}

export default function ZapAnalytics({ relayId }: ZapAnalyticsProps) {
  const [range, setRange] = useState<ActivityRange>("24h");
  const { zapData, isLoading, hasData } = useRelayActivity(relayId, range);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-sm">
            <Zap className="h-4 w-4 text-yellow-500" /> Zap Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      label: "Total Zaps",
      value: zapData.totalZaps.toLocaleString(),
      icon: Hash,
      color: "text-chart-1",
    },
    {
      label: "Volume",
      value: `${formatSats(zapData.totalSats)} sats`,
      icon: Zap,
      color: "text-yellow-500",
    },
    {
      label: "Avg Size",
      value: `${formatSats(zapData.avgZapSize)} sats`,
      icon: TrendingUp,
      color: "text-chart-3",
    },
    {
      label: "Peak Hour",
      value:
        zapData.peakHour !== null
          ? `${String(zapData.peakHour).padStart(2, "0")}:00 UTC`
          : "—",
      icon: Clock,
      color: "text-chart-4",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 font-mono text-sm">
            <Zap className="h-4 w-4 text-yellow-500" /> Zap Analytics
          </CardTitle>
          <Tabs value={range} onValueChange={(v) => setRange(v as ActivityRange)}>
            <TabsList className="h-7">
              <TabsTrigger value="24h" className="text-xs px-2 h-6">24h</TabsTrigger>
              <TabsTrigger value="7d" className="text-xs px-2 h-6">7d</TabsTrigger>
              <TabsTrigger value="30d" className="text-xs px-2 h-6">30d</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="space-y-5">
          {!hasData || zapData.totalZaps === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Zap className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No zaps recorded yet</p>
              <p className="text-xs mt-1">
                Zap data appears after the activity collector captures kind 9735 events.
              </p>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-border bg-card/50 p-3"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <stat.icon className={cn("h-3 w-3", stat.color)} />
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {stat.label}
                      </span>
                    </div>
                    <div className="font-mono text-lg font-semibold tabular-nums text-foreground">
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Zap volume bar chart */}
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Zap Volume Over Time
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={zapData.hourlyVolume}>
                    <defs>
                      <linearGradient id="zapGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="hour"
                      tickFormatter={(t) => formatTime(t, range)}
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                      width={40}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                      labelFormatter={(t) => formatTime(t as string, range)}
                      formatter={(value: number, name: string) => [
                        name === "sats" ? `${formatSats(value)} sats` : value,
                        name === "sats" ? "Volume" : "Zaps",
                      ]}
                    />
                    <Bar
                      dataKey="sats"
                      fill="url(#zapGradient)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
