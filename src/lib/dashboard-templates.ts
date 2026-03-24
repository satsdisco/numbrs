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
  {
    id: "vercel-site",
    name: "Vercel Site",
    description: "Deploy counts, build durations, and error rates for your Vercel projects",
    icon: "▲",
    panels: [
      { title: "Deploys", panel_type: "area", config: { metric_key: "deploy.count", data_source: "custom" as const, unit: "deploys" }, layout: { x: 0, y: 0, w: 8, h: 4 } },
      { title: "Total Deploys", panel_type: "stat", config: { metric_key: "deploy.count", data_source: "custom" as const, stat_field: "sum" as const, unit: "deploys" }, layout: { x: 8, y: 0, w: 4, h: 2 } },
      { title: "Avg Build Time", panel_type: "stat", config: { metric_key: "build.duration_ms", data_source: "custom" as const, stat_field: "avg" as const, unit: "ms" }, layout: { x: 8, y: 2, w: 4, h: 2 } },
      { title: "Build Duration Trend", panel_type: "line", config: { metric_key: "build.duration_ms", data_source: "custom" as const, unit: "ms" }, layout: { x: 0, y: 4, w: 6, h: 4 } },
      { title: "Error Rate", panel_type: "line", config: { metric_key: "error.count", data_source: "custom" as const, unit: "errors" }, layout: { x: 6, y: 4, w: 6, h: 4 } },
    ],
  },
  {
    id: "github-project",
    name: "GitHub Project",
    description: "Stars, forks, open issues, and PR velocity for your repositories",
    icon: "🐙",
    panels: [
      { title: "Stars", panel_type: "area", config: { metric_key: "github.stars", data_source: "custom" as const, unit: "stars" }, layout: { x: 0, y: 0, w: 8, h: 4 } },
      { title: "Total Stars", panel_type: "stat", config: { metric_key: "github.stars", data_source: "custom" as const, stat_field: "latest" as const, unit: "stars" }, layout: { x: 8, y: 0, w: 4, h: 2 } },
      { title: "Open Issues", panel_type: "stat", config: { metric_key: "github.open_issues", data_source: "custom" as const, stat_field: "latest" as const, unit: "issues" }, layout: { x: 8, y: 2, w: 4, h: 2 } },
      { title: "Forks", panel_type: "line", config: { metric_key: "github.forks", data_source: "custom" as const, unit: "forks" }, layout: { x: 0, y: 4, w: 6, h: 4 } },
      { title: "PRs Merged", panel_type: "area", config: { metric_key: "github.prs_merged", data_source: "custom" as const, unit: "PRs" }, layout: { x: 6, y: 4, w: 6, h: 4 } },
    ],
  },
  {
    id: "uptime-overview",
    name: "Uptime Overview",
    description: "Uptime percentage, latency trends, and incident counts",
    icon: "🟢",
    panels: [
      { title: "Uptime %", panel_type: "gauge", config: { metric_key: "uptime.pct", data_source: "custom" as const, stat_field: "avg" as const, gauge_max: 100 }, layout: { x: 0, y: 0, w: 4, h: 3 } },
      { title: "Avg Latency", panel_type: "stat", config: { metric_key: "uptime.latency_ms", data_source: "custom" as const, stat_field: "avg" as const, unit: "ms" }, layout: { x: 4, y: 0, w: 4, h: 2 } },
      { title: "Incidents", panel_type: "stat", config: { metric_key: "uptime.incidents", data_source: "custom" as const, stat_field: "sum" as const, unit: "incidents" }, layout: { x: 8, y: 0, w: 4, h: 2 } },
      { title: "Latency Over Time", panel_type: "line", config: { metric_key: "uptime.latency_ms", data_source: "custom" as const, unit: "ms" }, layout: { x: 0, y: 3, w: 12, h: 4 } },
    ],
  },
  {
    id: "my-relays",
    name: "My Relays",
    description: "DB size, pubkey counts, and health for your self-hosted Haven relays",
    icon: "⚡",
    panels: [
      { title: "nakabender.lol DB Size", panel_type: "area", config: { metric_key: "relay.nakabender.db_size_mb", data_source: "custom" as const, unit: "MB" }, layout: { x: 0, y: 0, w: 6, h: 4 } },
      { title: "satsdisco relay DB Size", panel_type: "area", config: { metric_key: "relay.satsdisco.db_size_mb", data_source: "custom" as const, unit: "MB" }, layout: { x: 6, y: 0, w: 6, h: 4 } },
      { title: "nakabender DB", panel_type: "stat", config: { metric_key: "relay.nakabender.db_size_mb", data_source: "custom" as const, stat_field: "latest" as const, unit: "MB" }, layout: { x: 0, y: 4, w: 3, h: 2 } },
      { title: "satsdisco DB", panel_type: "stat", config: { metric_key: "relay.satsdisco.db_size_mb", data_source: "custom" as const, stat_field: "latest" as const, unit: "MB" }, layout: { x: 3, y: 4, w: 3, h: 2 } },
      { title: "nakabender Pubkeys", panel_type: "stat", config: { metric_key: "relay.nakabender.pubkeys", data_source: "custom" as const, stat_field: "latest" as const, unit: "" }, layout: { x: 6, y: 4, w: 3, h: 2 } },
      { title: "samizdat relay DB", panel_type: "stat", config: { metric_key: "relay.samizdat.db_size_mb", data_source: "custom" as const, stat_field: "latest" as const, unit: "MB" }, layout: { x: 9, y: 4, w: 3, h: 2 } },
    ],
  },
  {
    id: "projects",
    name: "Projects",
    description: "GitHub stars, issues, and forks across your active repos",
    icon: "🚀",
    panels: [
      { title: "numbrs Stars", panel_type: "area", config: { metric_key: "github.satsdisco.numbrs.stars", data_source: "custom" as const, unit: "⭐" }, layout: { x: 0, y: 0, w: 4, h: 4 } },
      { title: "samizdat Stars", panel_type: "area", config: { metric_key: "github.satsdisco.samizdat.stars", data_source: "custom" as const, unit: "⭐" }, layout: { x: 4, y: 0, w: 4, h: 4 } },
      { title: "videorelay Stars", panel_type: "area", config: { metric_key: "github.satsdisco.videorelay.stars", data_source: "custom" as const, unit: "⭐" }, layout: { x: 8, y: 0, w: 4, h: 4 } },
      { title: "numbrs Issues", panel_type: "stat", config: { metric_key: "github.satsdisco.numbrs.issues", data_source: "custom" as const, stat_field: "latest" as const, unit: "" }, layout: { x: 0, y: 4, w: 4, h: 2 } },
      { title: "samizdat Issues", panel_type: "stat", config: { metric_key: "github.satsdisco.samizdat.issues", data_source: "custom" as const, stat_field: "latest" as const, unit: "" }, layout: { x: 4, y: 4, w: 4, h: 2 } },
      { title: "videorelay Issues", panel_type: "stat", config: { metric_key: "github.satsdisco.videorelay.issues", data_source: "custom" as const, stat_field: "latest" as const, unit: "" }, layout: { x: 8, y: 4, w: 4, h: 2 } },
    ],
  },
  {
    id: "mac-mini-health",
    name: "Mac Mini Health",
    description: "CPU, RAM, disk usage and Jellyfin stats for your home server",
    icon: "🖥️",
    panels: [
      { title: "CPU Usage", panel_type: "area", config: { metric_key: "system.cpu_pct", data_source: "custom" as const, unit: "%" }, layout: { x: 0, y: 0, w: 6, h: 4 } },
      { title: "RAM Usage", panel_type: "area", config: { metric_key: "system.ram_pct", data_source: "custom" as const, unit: "%" }, layout: { x: 6, y: 0, w: 6, h: 4 } },
      { title: "CPU %", panel_type: "stat", config: { metric_key: "system.cpu_pct", data_source: "custom" as const, stat_field: "latest" as const, unit: "%" }, layout: { x: 0, y: 4, w: 3, h: 2 } },
      { title: "RAM %", panel_type: "stat", config: { metric_key: "system.ram_pct", data_source: "custom" as const, stat_field: "latest" as const, unit: "%" }, layout: { x: 3, y: 4, w: 3, h: 2 } },
      { title: "External Disk", panel_type: "gauge", config: { metric_key: "system.disk_external_pct", data_source: "custom" as const, stat_field: "latest" as const, gauge_max: 100, unit: "%" }, layout: { x: 6, y: 4, w: 3, h: 2 } },
      { title: "Disk Free (GB)", panel_type: "stat", config: { metric_key: "system.disk_external_free_gb", data_source: "custom" as const, stat_field: "latest" as const, unit: "GB" }, layout: { x: 9, y: 4, w: 3, h: 2 } },
      { title: "Jellyfin Streams", panel_type: "area", config: { metric_key: "jellyfin.active_streams", data_source: "custom" as const, unit: "streams" }, layout: { x: 0, y: 6, w: 6, h: 4 } },
      { title: "Active Streams", panel_type: "stat", config: { metric_key: "jellyfin.active_streams", data_source: "custom" as const, stat_field: "latest" as const, unit: "" }, layout: { x: 6, y: 6, w: 3, h: 2 } },
      { title: "Songs in Library", panel_type: "stat", config: { metric_key: "jellyfin.song_count", data_source: "custom" as const, stat_field: "latest" as const, unit: "" }, layout: { x: 9, y: 6, w: 3, h: 2 } },
    ],
  },
  {
    id: "personal-stats",
    name: "Personal Stats",
    description: "Track anything about yourself — commits, workouts, sleep, habits",
    icon: "📊",
    panels: [
      { title: "Daily Commits", panel_type: "area", config: { metric_key: "dev.commits", data_source: "custom" as const, unit: "commits" }, layout: { x: 0, y: 0, w: 8, h: 4 } },
      { title: "Streak", panel_type: "stat", config: { metric_key: "dev.streak_days", data_source: "custom" as const, stat_field: "latest" as const, unit: "days" }, layout: { x: 8, y: 0, w: 4, h: 2 } },
      { title: "Habit Score", panel_type: "gauge", config: { metric_key: "habit.score", data_source: "custom" as const, stat_field: "avg" as const, gauge_max: 100 }, layout: { x: 8, y: 2, w: 4, h: 3 } },
      { title: "Custom Metric 1", panel_type: "line", config: { metric_key: "custom.metric_1", data_source: "custom" as const, unit: "" }, layout: { x: 0, y: 4, w: 6, h: 4 } },
      { title: "Custom Metric 2", panel_type: "line", config: { metric_key: "custom.metric_2", data_source: "custom" as const, unit: "" }, layout: { x: 6, y: 4, w: 6, h: 4 } },
    ],
  },
];
