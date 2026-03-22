// Dashboard builder types

export interface DashboardRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  share_token: string | null;
  created_at: string;
  updated_at: string;
}

export type PanelType = "line" | "area" | "stat" | "gauge";

export type DataSourceMode = "relay" | "global";

export interface PanelConfig {
  metric_key?: string;
  /** For relay-scoped panels */
  relay_id?: string;
  /** For global (non-relay) panels — references metrics.id */
  metric_id?: string;
  /** "relay" = relay-scoped metric, "global" = standalone metric */
  data_source?: DataSourceMode;
  time_range?: string;
  unit?: string;
  /** For stat panels — which aggregate to show */
  stat_field?: "avg" | "p50" | "p95" | "min" | "max" | "latest" | "count";
  /** For gauge panels — max value for the gauge */
  gauge_max?: number;
}

export interface PanelLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PanelRow {
  id: string;
  dashboard_id: string;
  title: string;
  panel_type: PanelType;
  config: PanelConfig;
  layout: PanelLayout;
  created_at: string;
  updated_at: string;
}

export const PANEL_TYPE_OPTIONS: { value: PanelType; label: string; description: string }[] = [
  { value: "line", label: "Line Chart", description: "Time-series line chart" },
  { value: "area", label: "Area Chart", description: "Filled area chart" },
  { value: "stat", label: "Stat Number", description: "Single big number" },
  { value: "gauge", label: "Gauge", description: "Circular gauge meter" },
];

export const DEFAULT_PANEL_LAYOUTS: Record<PanelType, PanelLayout> = {
  line: { x: 0, y: 0, w: 6, h: 4 },
  area: { x: 0, y: 0, w: 6, h: 4 },
  stat: { x: 0, y: 0, w: 3, h: 2 },
  gauge: { x: 0, y: 0, w: 3, h: 3 },
};

// ─── Metric categories for the panel dialog ─────────────────────────────────

export interface MetricOption {
  key: string;
  label: string;
  unit: string;
  category: string;
  description: string;
  /** true if this metric requires a relay_id */
  relayScoped: boolean;
  defaultGaugeMax?: number;
}

export const METRIC_CATALOG: MetricOption[] = [
  // Relay metrics
  { key: "relay_latency_connect_ms", label: "Connect Latency", unit: "ms", category: "relay", description: "WebSocket connect time", relayScoped: true, defaultGaugeMax: 2000 },
  { key: "relay_latency_first_event_ms", label: "Event Latency", unit: "ms", category: "relay", description: "Time to first event after subscribe", relayScoped: true, defaultGaugeMax: 5000 },
  { key: "relay_up", label: "Uptime", unit: "", category: "relay", description: "Relay availability (0 or 1)", relayScoped: true, defaultGaugeMax: 1 },
  // Network
  { key: "network_event_throughput", label: "Event Throughput", unit: "events/s", category: "network", description: "Events per second across all relays", relayScoped: false, defaultGaugeMax: 10000 },
  { key: "network_relay_count", label: "Active Relays", unit: "relays", category: "network", description: "Currently online relays", relayScoped: false, defaultGaugeMax: 1000 },
  { key: "network_avg_latency", label: "Network Avg Latency", unit: "ms", category: "network", description: "Avg connect time across relays", relayScoped: false, defaultGaugeMax: 2000 },
  { key: "network_total_events", label: "Total Events", unit: "events", category: "network", description: "Cumulative event count", relayScoped: false },
  // Zaps / Lightning
  { key: "zap_volume_sats", label: "Zap Volume", unit: "sats", category: "zaps", description: "Total sats zapped", relayScoped: false },
  { key: "zap_count", label: "Zap Count", unit: "zaps", category: "zaps", description: "Number of zap events", relayScoped: false },
  { key: "zap_avg_size", label: "Avg Zap Size", unit: "sats", category: "zaps", description: "Average zap in sats", relayScoped: false },
  { key: "zap_median_size", label: "Median Zap Size", unit: "sats", category: "zaps", description: "Median zap in sats", relayScoped: false },
  // Protocol
  { key: "event_kind_1_count", label: "Text Notes (kind 1)", unit: "events", category: "protocol", description: "Short text note events", relayScoped: false },
  { key: "event_kind_7_count", label: "Reactions (kind 7)", unit: "events", category: "protocol", description: "Reaction events", relayScoped: false },
  { key: "event_kind_4_count", label: "Encrypted DMs (kind 4)", unit: "events", category: "protocol", description: "Encrypted direct messages", relayScoped: false },
  { key: "event_kind_6_count", label: "Reposts (kind 6)", unit: "events", category: "protocol", description: "Repost events", relayScoped: false },
  { key: "event_kind_9735_count", label: "Zap Receipts (kind 9735)", unit: "events", category: "protocol", description: "Zap receipt events", relayScoped: false },
  { key: "event_propagation_ms", label: "Event Propagation", unit: "ms", category: "protocol", description: "Cross-relay propagation time", relayScoped: false, defaultGaugeMax: 10000 },
  { key: "nip_support_score", label: "NIP Support Score", unit: "%", category: "protocol", description: "NIP compatibility percentage", relayScoped: false, defaultGaugeMax: 100 },
  // Social
  { key: "follower_count", label: "Follower Count", unit: "followers", category: "social", description: "Followers for tracked pubkey", relayScoped: false },
  { key: "engagement_rate", label: "Engagement Rate", unit: "ratio", category: "social", description: "Reactions + reposts per note", relayScoped: false },
  { key: "unique_authors", label: "Unique Authors", unit: "authors", category: "social", description: "Distinct pubkeys in period", relayScoped: false },
];

export const METRIC_CATEGORIES = [
  { id: "relay", label: "⚡ Relay", description: "Per-relay performance metrics" },
  { id: "network", label: "🌐 Network", description: "Network-wide aggregate stats" },
  { id: "zaps", label: "💰 Zaps & Lightning", description: "Zap economy metrics" },
  { id: "protocol", label: "📡 Protocol", description: "Event types & NIP stats" },
  { id: "social", label: "👥 Social", description: "Engagement & audience metrics" },
];

// ─── Panel presets / quick-add templates ──────────────────────────────────────

export interface PanelPreset {
  title: string;
  panel_type: PanelType;
  metricKey: string;
  stat_field?: PanelConfig["stat_field"];
  description: string;
  category: string;
}

export const PANEL_PRESETS: PanelPreset[] = [
  { title: "Relay Connect Latency", panel_type: "line", metricKey: "relay_latency_connect_ms", description: "Track WebSocket connection speed over time", category: "relay" },
  { title: "Relay Uptime Gauge", panel_type: "gauge", metricKey: "relay_up", stat_field: "avg", description: "Real-time uptime percentage", category: "relay" },
  { title: "Network Throughput", panel_type: "area", metricKey: "network_event_throughput", description: "Events/sec across all relays", category: "network" },
  { title: "Active Relay Count", panel_type: "stat", metricKey: "network_relay_count", stat_field: "latest", description: "Currently online relays", category: "network" },
  { title: "Zap Volume", panel_type: "area", metricKey: "zap_volume_sats", description: "Total sats zapped over time", category: "zaps" },
  { title: "Avg Zap Size", panel_type: "stat", metricKey: "zap_avg_size", stat_field: "avg", description: "Average zap amount", category: "zaps" },
  { title: "Text Notes Volume", panel_type: "line", metricKey: "event_kind_1_count", description: "Kind 1 events over time", category: "protocol" },
  { title: "Event Propagation", panel_type: "line", metricKey: "event_propagation_ms", description: "Cross-relay propagation latency", category: "protocol" },
  { title: "NIP Support Score", panel_type: "gauge", metricKey: "nip_support_score", stat_field: "avg", description: "NIP compatibility score", category: "protocol" },
  { title: "Unique Authors", panel_type: "stat", metricKey: "unique_authors", stat_field: "latest", description: "Distinct publishers in period", category: "social" },
  { title: "Engagement Rate", panel_type: "line", metricKey: "engagement_rate", description: "Reactions + reposts per note", category: "social" },
];
