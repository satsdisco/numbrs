import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMetrics } from "@/lib/api";
import MetricCard from "@/components/MetricCard";
import { Input } from "@/components/ui/input";
import { Search, Activity } from "lucide-react";

export default function DashboardPage() {
  const [search, setSearch] = useState("");
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["metrics"],
    queryFn: fetchMetrics,
  });

  const filtered = metrics?.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.key.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-metric-lg text-foreground text-balance">Metrics Dashboard</h1>
          <p className="text-metric-sm text-muted-foreground">
            {metrics?.length ?? 0} metric{metrics?.length !== 1 ? "s" : ""} defined
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search metrics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-background pl-8 text-metric-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg border border-border bg-card" />
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-16">
          <Activity className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-metric-base text-muted-foreground">
            {search ? "No metrics match your search" : "No metrics defined yet"}
          </p>
          <p className="mt-1 text-metric-sm text-muted-foreground">
            {!search && "Create your first metric to start tracking data."}
          </p>
        </div>
      )}
    </div>
  );
}
