import type { PanelType, PanelConfig, PanelLayout } from "./dashboard-types";

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  panels: {
    title: string;
    panel_type: PanelType;
    config: PanelConfig;
    layout: PanelLayout;
  }[];
}

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: "relay-overview",
    name: "Relay Overview",
    description: "Connect latency, event latency, and uptime for your relays",
    icon: "⚡",
    panels: [
      {
        title: "Connect Latency",
        panel_type: "line",
        config: { metric_key: "relay_latency_connect_ms", data_source: "relay" as const, unit: "ms" },
        layout: { x: 0, y: 0, w: 6, h: 4 },
      },
      {
        title: "Event Latency",
        panel_type: "line",
        config: { metric_key: "relay_latency_first_event_ms", data_source: "relay" as const, unit: "ms" },
        layout: { x: 6, y: 0, w: 6, h: 4 },
      },
      {
        title: "Uptime",
        panel_type: "gauge",
        config: { metric_key: "relay_up", data_source: "relay" as const, stat_field: "avg" as const, gauge_max: 1 },
        layout: { x: 0, y: 4, w: 4, h: 3 },
      },
      {
        title: "Avg Connect Time",
        panel_type: "stat",
        config: { metric_key: "relay_latency_connect_ms", data_source: "relay" as const, stat_field: "avg" as const, unit: "ms" },
        layout: { x: 4, y: 4, w: 4, h: 2 },
      },
      {
        title: "P95 Connect Time",
        panel_type: "stat",
        config: { metric_key: "relay_latency_connect_ms", data_source: "relay" as const, stat_field: "p95" as const, unit: "ms" },
        layout: { x: 8, y: 4, w: 4, h: 2 },
      },
    ],
  },
  {
    id: "network-health",
    name: "Network Health",
    description: "Network-wide throughput, active relays, and latency trends",
    icon: "🌐",
    panels: [
      {
        title: "Event Throughput",
        panel_type: "area",
        config: { metric_key: "network_event_throughput", data_source: "global" as const, unit: "events/s" },
        layout: { x: 0, y: 0, w: 8, h: 4 },
      },
      {
        title: "Active Relays",
        panel_type: "stat",
        config: { metric_key: "network_relay_count", data_source: "global" as const, stat_field: "latest" as const, unit: "relays" },
        layout: { x: 8, y: 0, w: 4, h: 2 },
      },
      {
        title: "Network Avg Latency",
        panel_type: "stat",
        config: { metric_key: "network_avg_latency", data_source: "global" as const, stat_field: "avg" as const, unit: "ms" },
        layout: { x: 8, y: 2, w: 4, h: 2 },
      },
      {
        title: "Network Latency Trend",
        panel_type: "line",
        config: { metric_key: "network_avg_latency", data_source: "global" as const, unit: "ms" },
        layout: { x: 0, y: 4, w: 12, h: 4 },
      },
    ],
  },
  {
    id: "zap-economy",
    name: "Zap Economy",
    description: "Lightning zap volumes, counts, and averages over time",
    icon: "💰",
    panels: [
      {
        title: "Zap Volume",
        panel_type: "area",
        config: { metric_key: "zap_volume_sats", data_source: "global" as const, unit: "sats" },
        layout: { x: 0, y: 0, w: 8, h: 4 },
      },
      {
        title: "Total Zaps",
        panel_type: "stat",
        config: { metric_key: "zap_count", data_source: "global" as const, stat_field: "latest" as const, unit: "zaps" },
        layout: { x: 8, y: 0, w: 4, h: 2 },
      },
      {
        title: "Avg Zap Size",
        panel_type: "stat",
        config: { metric_key: "zap_avg_size", data_source: "global" as const, stat_field: "avg" as const, unit: "sats" },
        layout: { x: 8, y: 2, w: 4, h: 2 },
      },
      {
        title: "Zap Count Over Time",
        panel_type: "line",
        config: { metric_key: "zap_count", data_source: "global" as const, unit: "zaps" },
        layout: { x: 0, y: 4, w: 6, h: 4 },
      },
      {
        title: "Median Zap Size",
        panel_type: "line",
        config: { metric_key: "zap_median_size", data_source: "global" as const, unit: "sats" },
        layout: { x: 6, y: 4, w: 6, h: 4 },
      },
    ],
  },
  {
    id: "protocol-stats",
    name: "Protocol Analytics",
    description: "Event kinds, propagation times, and NIP compatibility",
    icon: "📡",
    panels: [
      {
        title: "Text Notes (kind 1)",
        panel_type: "line",
        config: { metric_key: "event_kind_1_count", data_source: "global" as const, unit: "events" },
        layout: { x: 0, y: 0, w: 6, h: 4 },
      },
      {
        title: "Reactions (kind 7)",
        panel_type: "line",
        config: { metric_key: "event_kind_7_count", data_source: "global" as const, unit: "events" },
        layout: { x: 6, y: 0, w: 6, h: 4 },
      },
      {
        title: "Event Propagation",
        panel_type: "area",
        config: { metric_key: "event_propagation_ms", data_source: "global" as const, unit: "ms" },
        layout: { x: 0, y: 4, w: 8, h: 4 },
      },
      {
        title: "NIP Support Score",
        panel_type: "gauge",
        config: { metric_key: "nip_support_score", data_source: "global" as const, stat_field: "avg" as const, gauge_max: 100 },
        layout: { x: 8, y: 4, w: 4, h: 3 },
      },
    ],
  },
];
