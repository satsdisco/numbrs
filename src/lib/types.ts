// Manual types that work with the refactored schema
// (auto-generated types.ts may lag behind migrations)

export interface RelayRow {
  id: string;
  name: string;
  url: string;
  region: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface MetricRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  unit: string | null;
  value_type: string;
  category: string;
  user_id: string | null;
  is_public: boolean;
  tags: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

export interface DatapointRow {
  id: string;
  metric_id: string;
  relay_id: string | null;
  value: number;
  dimensions: Record<string, string> | null;
  created_at: string;
}

export interface ApiKeyRow {
  id: string;
  name: string;
  key: string;
  user_id: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

export interface RelaySummaryRow {
  metric_key: string;
  avg_val: number;
  min_val: number;
  max_val: number;
  p50_val: number;
  p95_val: number;
  latest_val: number;
  total_count: number;
}

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

export const RELAY_METRIC_KEYS = {
  CONNECT_LATENCY: "relay_latency_connect_ms",
  FIRST_EVENT_LATENCY: "relay_latency_first_event_ms",
  UP: "relay_up",
} as const;
