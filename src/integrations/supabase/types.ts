export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      alert_events: {
        Row: {
          acknowledged: boolean
          alert_rule_id: string
          condition: string
          id: string
          metric_key: string
          relay_id: string | null
          threshold: number
          triggered_at: string
          value: number
        }
        Insert: {
          acknowledged?: boolean
          alert_rule_id: string
          condition: string
          id?: string
          metric_key: string
          relay_id?: string | null
          threshold: number
          triggered_at?: string
          value: number
        }
        Update: {
          acknowledged?: boolean
          alert_rule_id?: string
          condition?: string
          id?: string
          metric_key?: string
          relay_id?: string | null
          threshold?: number
          triggered_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "alert_events_alert_rule_id_fkey"
            columns: ["alert_rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_events_relay_id_fkey"
            columns: ["relay_id"]
            isOneToOne: false
            referencedRelation: "relays"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          condition: string
          cooldown_minutes: number | null
          created_at: string
          id: string
          is_active: boolean
          last_triggered_at: string | null
          metric_key: string
          name: string
          notification_type: string | null
          notification_url: string | null
          relay_id: string | null
          threshold: number
          updated_at: string
          user_id: string
        }
        Insert: {
          condition?: string
          cooldown_minutes?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          metric_key: string
          name?: string
          notification_type?: string | null
          notification_url?: string | null
          relay_id?: string | null
          threshold: number
          updated_at?: string
          user_id: string
        }
        Update: {
          condition?: string
          cooldown_minutes?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          metric_key?: string
          name?: string
          notification_type?: string | null
          notification_url?: string | null
          relay_id?: string | null
          threshold?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_rules_relay_id_fkey"
            columns: ["relay_id"]
            isOneToOne: false
            referencedRelation: "relays"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key: string
          last_used_at: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          last_used_at?: string | null
          name?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          last_used_at?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      claude_usage: {
        Row: {
          cache_read_tokens: number | null
          cache_write_tokens: number | null
          created_at: string | null
          date: string
          id: string
          input_tokens: number | null
          messages: number | null
          model: string | null
          output_tokens: number | null
          owner_id: string
          project: string
          project_path: string | null
          session_id: string
          tool_calls: number | null
          user_id: string | null
        }
        Insert: {
          cache_read_tokens?: number | null
          cache_write_tokens?: number | null
          created_at?: string | null
          date: string
          id?: string
          input_tokens?: number | null
          messages?: number | null
          model?: string | null
          output_tokens?: number | null
          owner_id: string
          project: string
          project_path?: string | null
          session_id: string
          tool_calls?: number | null
          user_id?: string | null
        }
        Update: {
          cache_read_tokens?: number | null
          cache_write_tokens?: number | null
          created_at?: string | null
          date?: string
          id?: string
          input_tokens?: number | null
          messages?: number | null
          model?: string | null
          output_tokens?: number | null
          owner_id?: string
          project?: string
          project_path?: string | null
          session_id?: string
          tool_calls?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      dashboards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          share_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          share_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          share_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      datapoints: {
        Row: {
          created_at: string
          dimensions: Json | null
          id: string
          metric_id: string
          relay_id: string | null
          value: number
        }
        Insert: {
          created_at?: string
          dimensions?: Json | null
          id?: string
          metric_id: string
          relay_id?: string | null
          value: number
        }
        Update: {
          created_at?: string
          dimensions?: Json | null
          id?: string
          metric_id?: string
          relay_id?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "datapoints_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datapoints_relay_id_fkey"
            columns: ["relay_id"]
            isOneToOne: false
            referencedRelation: "relays"
            referencedColumns: ["id"]
          },
        ]
      }
      jellyfin_events: {
        Row: {
          content: string | null
          created_at: string | null
          date_played: string | null
          event_type: string | null
          id: string
          jellyfin_item_id: string | null
          media_type: string | null
          owner_id: string
          parsed_artist: string | null
          parsed_title: string | null
          user_id_jellyfin: string | null
          username: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          date_played?: string | null
          event_type?: string | null
          id?: string
          jellyfin_item_id?: string | null
          media_type?: string | null
          owner_id: string
          parsed_artist?: string | null
          parsed_title?: string | null
          user_id_jellyfin?: string | null
          username?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          date_played?: string | null
          event_type?: string | null
          id?: string
          jellyfin_item_id?: string | null
          media_type?: string | null
          owner_id?: string
          parsed_artist?: string | null
          parsed_title?: string | null
          user_id_jellyfin?: string | null
          username?: string | null
        }
        Relationships: []
      }
      kuma_heartbeats: {
        Row: {
          checked_at: string
          id: string
          monitor_name: string
          response_time_ms: number | null
          status: number
        }
        Insert: {
          checked_at?: string
          id?: string
          monitor_name: string
          response_time_ms?: number | null
          status: number
        }
        Update: {
          checked_at?: string
          id?: string
          monitor_name?: string
          response_time_ms?: number | null
          status?: number
        }
        Relationships: []
      }
      kuma_monitors: {
        Row: {
          cert_days_remaining: number | null
          cert_is_valid: boolean | null
          hostname: string | null
          last_updated: string
          monitor_type: string | null
          name: string
          port: string | null
          response_time_ms: number | null
          status: number
          url: string | null
        }
        Insert: {
          cert_days_remaining?: number | null
          cert_is_valid?: boolean | null
          hostname?: string | null
          last_updated?: string
          monitor_type?: string | null
          name: string
          port?: string | null
          response_time_ms?: number | null
          status?: number
          url?: string | null
        }
        Update: {
          cert_days_remaining?: number | null
          cert_is_valid?: boolean | null
          hostname?: string | null
          last_updated?: string
          monitor_type?: string | null
          name?: string
          port?: string | null
          response_time_ms?: number | null
          status?: number
          url?: string | null
        }
        Relationships: []
      }
      metrics: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          key: string
          name: string
          tags: Json | null
          unit: string | null
          updated_at: string
          user_id: string | null
          value_type: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          key: string
          name: string
          tags?: Json | null
          unit?: string | null
          updated_at?: string
          user_id?: string | null
          value_type?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          key?: string
          name?: string
          tags?: Json | null
          unit?: string | null
          updated_at?: string
          user_id?: string | null
          value_type?: string
        }
        Relationships: []
      }
      notification_channels: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      openclaw_usage: {
        Row: {
          cache_read_tokens: number | null
          cache_write_tokens: number | null
          channel: string | null
          cost_usd: number | null
          created_at: string | null
          date: string
          id: string
          input_tokens: number | null
          messages: number | null
          model: string | null
          output_tokens: number | null
          owner_id: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          cache_read_tokens?: number | null
          cache_write_tokens?: number | null
          channel?: string | null
          cost_usd?: number | null
          created_at?: string | null
          date: string
          id?: string
          input_tokens?: number | null
          messages?: number | null
          model?: string | null
          output_tokens?: number | null
          owner_id: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          cache_read_tokens?: number | null
          cache_write_tokens?: number | null
          channel?: string | null
          cost_usd?: number | null
          created_at?: string | null
          date?: string
          id?: string
          input_tokens?: number | null
          messages?: number | null
          model?: string | null
          output_tokens?: number | null
          owner_id?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      panels: {
        Row: {
          config: Json
          created_at: string
          dashboard_id: string
          id: string
          layout: Json
          panel_type: string
          title: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          dashboard_id: string
          id?: string
          layout?: Json
          panel_type?: string
          title?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          dashboard_id?: string
          id?: string
          layout?: Json
          panel_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "panels_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      plex_events: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          event: string
          grandparent_title: string | null
          id: string
          local: boolean | null
          media_type: string | null
          owner_id: string
          parent_title: string | null
          player_platform: string | null
          player_title: string | null
          rating_key: string | null
          title: string | null
          user_id_plex: number | null
          username: string | null
          view_offset_ms: number | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          event: string
          grandparent_title?: string | null
          id?: string
          local?: boolean | null
          media_type?: string | null
          owner_id: string
          parent_title?: string | null
          player_platform?: string | null
          player_title?: string | null
          rating_key?: string | null
          title?: string | null
          user_id_plex?: number | null
          username?: string | null
          view_offset_ms?: number | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          event?: string
          grandparent_title?: string | null
          id?: string
          local?: boolean | null
          media_type?: string | null
          owner_id?: string
          parent_title?: string | null
          player_platform?: string | null
          player_title?: string | null
          rating_key?: string | null
          title?: string | null
          user_id_plex?: number | null
          username?: string | null
          view_offset_ms?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          nostr_name: string | null
          nostr_picture: string | null
          pubkey: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          nostr_name?: string | null
          nostr_picture?: string | null
          pubkey?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          nostr_name?: string | null
          nostr_picture?: string | null
          pubkey?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      relays: {
        Row: {
          created_at: string
          id: string
          is_public: boolean
          name: string
          region: string | null
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_public?: boolean
          name: string
          region?: string | null
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_public?: boolean
          name?: string
          region?: string | null
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      uptime_events: {
        Row: {
          checked_at: string
          error_message: string | null
          id: string
          latency_ms: number | null
          monitor_id: string
          status: string
          status_code: number | null
        }
        Insert: {
          checked_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          monitor_id: string
          status: string
          status_code?: number | null
        }
        Update: {
          checked_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          monitor_id?: string
          status?: string
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "uptime_events_monitor_id_fkey"
            columns: ["monitor_id"]
            isOneToOne: false
            referencedRelation: "uptime_monitors"
            referencedColumns: ["id"]
          },
        ]
      }
      uptime_monitors: {
        Row: {
          created_at: string
          id: string
          interval_seconds: number
          is_active: boolean
          last_checked_at: string | null
          last_latency_ms: number | null
          last_notified_at: string | null
          last_status: string | null
          name: string
          notification_url: string | null
          previous_status: string | null
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interval_seconds?: number
          is_active?: boolean
          last_checked_at?: string | null
          last_latency_ms?: number | null
          last_notified_at?: string | null
          last_status?: string | null
          name: string
          notification_url?: string | null
          previous_status?: string | null
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interval_seconds?: number
          is_active?: boolean
          last_checked_at?: string | null
          last_latency_ms?: number | null
          last_notified_at?: string | null
          last_status?: string | null
          name?: string
          notification_url?: string | null
          previous_status?: string | null
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      user_integrations: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          last_error: string | null
          last_synced_at: string | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_synced_at?: string | null
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_synced_at?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          custom_accent: string | null
          id: string
          theme_preset: string
          updated_at: string
          user_id: string
        }
        Insert: {
          custom_accent?: string | null
          id?: string
          theme_preset?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          custom_accent?: string | null
          id?: string
          theme_preset?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_metric_stats: {
        Args: { p_end: string; p_metric_id: string; p_start: string }
        Returns: {
          avg_val: number
          max_val: number
          min_val: number
          p50_val: number
          p95_val: number
          total_count: number
        }[]
      }
      get_public_relay_directory: {
        Args: { p_end: string; p_start: string }
        Returns: {
          connect_p50: number
          connect_p95: number
          event_p50: number
          event_p95: number
          failed_probes: number
          health_score: number
          relay_id: string
          relay_name: string
          relay_region: string
          relay_url: string
          total_checks: number
          uptime_pct: number
        }[]
      }
      get_relay_health: {
        Args: { p_end: string; p_relay_id: string; p_start: string }
        Returns: {
          connect_avg: number
          connect_p50: number
          connect_p95: number
          connect_stddev: number
          downtime_incidents: number
          event_p50: number
          event_p95: number
          failed_probes: number
          failure_rate: number
          longest_downtime_secs: number
          prev_connect_p50: number
          total_checks: number
          uptime_pct: number
        }[]
      }
      get_relay_incidents: {
        Args: { p_end: string; p_relay_id: string; p_start: string }
        Returns: {
          duration_secs: number
          failed_checks: number
          incident_end: string
          incident_start: string
        }[]
      }
      get_relay_summary: {
        Args: { p_end: string; p_relay_id: string; p_start: string }
        Returns: {
          avg_val: number
          latest_val: number
          max_val: number
          metric_key: string
          min_val: number
          p50_val: number
          p95_val: number
          total_count: number
        }[]
      }
      get_relay_timeseries: {
        Args: {
          p_end: string
          p_interval_seconds: number
          p_metric_key: string
          p_relay_id: string
          p_start: string
        }
        Returns: {
          avg_value: number
          bucket: string
          count: number
          max_value: number
          min_value: number
        }[]
      }
      get_timeseries: {
        Args: {
          p_end: string
          p_interval_seconds: number
          p_metric_id: string
          p_start: string
        }
        Returns: {
          avg_value: number
          bucket: string
          count: number
          max_value: number
          min_value: number
        }[]
      }
      get_uptime_summary: {
        Args: { p_hours?: number; p_monitor_id: string }
        Returns: {
          avg_latency_ms: number
          failed_checks: number
          total_checks: number
          uptime_pct: number
        }[]
      }
      get_user_id_from_api_key: {
        Args: { api_key_value: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
A new version of Supabase CLI is available: v2.84.2 (currently installed v2.75.0)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
