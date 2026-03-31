-- Uptime Kuma integration tables
-- kuma_monitors: current state per monitor (upserted every ~60s by kuma-sync.sh)
-- kuma_heartbeats: historical heartbeat log (inserted every ~60s, kept 30 days)

-- ─── kuma_monitors ────────────────────────────────────────────────────────────

CREATE TABLE public.kuma_monitors (
  name               TEXT        PRIMARY KEY,
  monitor_type       TEXT,
  url                TEXT,
  hostname           TEXT,
  port               TEXT,
  status             INT         NOT NULL DEFAULT 2,  -- 1=UP 0=DOWN 2=PENDING 3=MAINTENANCE
  response_time_ms   FLOAT,
  cert_days_remaining INT,
  cert_is_valid      BOOLEAN,
  last_updated       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kuma_monitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read kuma_monitors"
  ON public.kuma_monitors FOR SELECT USING (true);

-- service_role bypasses RLS by default; explicit policy for clarity
CREATE POLICY "Service write kuma_monitors"
  ON public.kuma_monitors FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── kuma_heartbeats ──────────────────────────────────────────────────────────

CREATE TABLE public.kuma_heartbeats (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_name     TEXT        NOT NULL,
  status           INT         NOT NULL,  -- 1=UP 0=DOWN 2=PENDING 3=MAINTENANCE
  response_time_ms FLOAT,
  checked_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kuma_heartbeats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read kuma_heartbeats"
  ON public.kuma_heartbeats FOR SELECT USING (true);

CREATE POLICY "Service write kuma_heartbeats"
  ON public.kuma_heartbeats FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_kuma_heartbeats_monitor_checked
  ON public.kuma_heartbeats(monitor_name, checked_at DESC);

CREATE INDEX idx_kuma_heartbeats_checked_at
  ON public.kuma_heartbeats(checked_at DESC);

-- ─── Retention (run via pg_cron or Supabase scheduled function) ───────────────
-- Keep 30 days of heartbeats. Suggested pg_cron entry:
--   SELECT cron.schedule(
--     'cleanup-kuma-heartbeats', '0 3 * * *',
--     $$DELETE FROM public.kuma_heartbeats WHERE checked_at < now() - interval '30 days'$$
--   );
