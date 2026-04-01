import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { motion } from "framer-motion";
import { Activity, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useRelayActivity, ActivityRange, HeatmapCell } from "@/hooks/useRelayActivity";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const INTENSITY_CLASSES = [
  "bg-muted/30",
  "bg-chart-1/20",
  "bg-chart-1/40",
  "bg-chart-1/60",
  "bg-chart-1/80",
  "bg-chart-1",
];

function getIntensityLevel(value: number, maxValue: number): number {
  if (value === 0 || maxValue === 0) return 0;
  const ratio = value / maxValue;
  if (ratio < 0.1) return 1;
  if (ratio < 0.25) return 2;
  if (ratio < 0.5) return 3;
  if (ratio < 0.75) return 4;
  return 5;
}

interface HeatmapProps {
  data: HeatmapCell[];
}

function Heatmap({ data }: HeatmapProps) {
  const maxValue = useMemo(
    () => Math.max(...data.map((c) => c.value), 1),
    [data]
  );

  return (
    <div className="space-y-2">
      {/* Hour labels */}
      <div className="flex gap-[2px] ml-10">
        {HOURS.filter((h) => h % 3 === 0).map((h) => (
          <span
            key={h}
            className="text-[9px] text-muted-foreground font-mono"
            style={{ width: `${(3 / 24) * 100}%` }}
          >
            {String(h).padStart(2, "0")}
          </span>
        ))}
      </div>
      {/* Grid rows */}
      {DAYS.map((day, dayIdx) => (
        <div key={day} className="flex items-center gap-[2px]">
          <span className="text-[10px] text-muted-foreground font-mono w-8 text-right shrink-0">
            {day}
          </span>
          <div className="flex gap-[2px] flex-1">
            {HOURS.map((hour) => {
              const cell = data.find((c) => c.day === dayIdx && c.hour === hour);
              const level = cell ? getIntensityLevel(cell.value, maxValue) : 0;
              return (
                <Tooltip key={hour}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "aspect-square flex-1 rounded-[2px] transition-colors cursor-default min-w-[6px]",
                        INTENSITY_CLASSES[level]
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="text-xs max-w-64 whitespace-pre-wrap"
                  >
                    {cell?.label ?? `${day} ${String(hour).padStart(2, "0")}:00 — no data`}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      ))}
      {/* Legend */}
      <div className="flex items-center gap-1 ml-10 mt-1">
        <span className="text-[9px] text-muted-foreground mr-1">Less</span>
        {INTENSITY_CLASSES.map((cls, i) => (
          <div key={i} className={cn("w-3 h-3 rounded-[2px]", cls)} />
        ))}
        <span className="text-[9px] text-muted-foreground ml-1">More</span>
      </div>
    </div>
  );
}

const CHART_COLORS: Record<string, string> = {
  notes: "hsl(var(--chart-1))",
  zaps: "hsl(var(--chart-2))",
  reactions: "hsl(var(--chart-3))",
  profiles: "hsl(var(--chart-4))",
  articles: "hsl(var(--chart-5))",
  other: "hsl(var(--muted-foreground))",
};

function formatTime(time: string, range: ActivityRange): string {
  const d = new Date(time);
  if (range === "24h") return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (range === "7d") return d.toLocaleDateString([], { weekday: "short", hour: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

interface ActivityTimelineProps {
  relayId: string | undefined;
}

export default function ActivityTimeline({ relayId }: ActivityTimelineProps) {
  const [range, setRange] = useState<ActivityRange>("24h");
  const { activityData, heatmapData, isLoading, hasData } = useRelayActivity(relayId, range);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-sm">
            <Activity className="h-4 w-4" /> Activity Timeline
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

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 font-mono text-sm">
            <Activity className="h-4 w-4" /> Activity Timeline
          </CardTitle>
          <Tabs value={range} onValueChange={(v) => setRange(v as ActivityRange)}>
            <TabsList className="h-7">
              <TabsTrigger value="24h" className="text-xs px-2 h-6">24h</TabsTrigger>
              <TabsTrigger value="7d" className="text-xs px-2 h-6">7d</TabsTrigger>
              <TabsTrigger value="30d" className="text-xs px-2 h-6">30d</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="space-y-6">
          {!hasData ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Flame className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No activity data yet</p>
              <p className="text-xs mt-1">
                The activity collector runs hourly — data will appear after the first collection.
              </p>
            </div>
          ) : (
            <>
              {/* Heatmap */}
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Activity Heatmap
                </h3>
                <Heatmap data={heatmapData} />
              </div>

              {/* Stacked area chart */}
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Event Volume
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="time"
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
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    {(["notes", "zaps", "reactions", "profiles", "articles", "other"] as const).map(
                      (key) => (
                        <Area
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stackId="1"
                          stroke={CHART_COLORS[key]}
                          fill={CHART_COLORS[key]}
                          fillOpacity={0.4}
                        />
                      )
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
