import { Database } from "@/integrations/supabase/types";

export type Metric = Database["public"]["Tables"]["metrics"]["Row"];
export type MetricInsert = Database["public"]["Tables"]["metrics"]["Insert"];
export type Datapoint = Database["public"]["Tables"]["datapoints"]["Row"];
export type Relay = Database["public"]["Tables"]["relays"]["Row"];
export type RelayInsert = Database["public"]["Tables"]["relays"]["Insert"];
export type ApiKey = Database["public"]["Tables"]["api_keys"]["Row"];

export interface TimeseriesBucket {
  bucket: string;
  avg_value: number;
  min_value: number;
  max_value: number;
  count: number;
}

export interface MetricStats {
  min_val: number | null;
  max_val: number | null;
  avg_val: number | null;
  p50_val: number | null;
  p95_val: number | null;
  total_count: number;
}

export type TimeRange = "1h" | "24h" | "7d" | "30d";

export const TIME_RANGE_CONFIG: Record<TimeRange, { label: string; seconds: number; intervalSeconds: number }> = {
  "1h": { label: "1 Hour", seconds: 3600, intervalSeconds: 60 },
  "24h": { label: "24 Hours", seconds: 86400, intervalSeconds: 300 },
  "7d": { label: "7 Days", seconds: 604800, intervalSeconds: 3600 },
  "30d": { label: "30 Days", seconds: 2592000, intervalSeconds: 14400 },
};
