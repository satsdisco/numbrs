// Dashboard builder types

export interface DashboardRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type PanelType = "line" | "area" | "stat" | "gauge";

export interface PanelConfig {
  metric_key?: string;
  relay_id?: string;
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
