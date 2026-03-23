-- Uptime monitors table
CREATE TABLE public.uptime_monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  interval_seconds INTEGER NOT NULL DEFAULT 300,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  last_status TEXT CHECK (last_status IN ('up', 'down', 'unknown')),
  last_latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.uptime_monitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own monitors" ON public.uptime_monitors FOR ALL USING (auth.uid() = user_id);
CREATE TRIGGER update_uptime_monitors_updated_at BEFORE UPDATE ON public.uptime_monitors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Uptime events (ping results)
CREATE TABLE public.uptime_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID NOT NULL REFERENCES public.uptime_monitors(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('up', 'down')),
  latency_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.uptime_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own uptime events" ON public.uptime_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.uptime_monitors WHERE uptime_monitors.id = uptime_events.monitor_id AND uptime_monitors.user_id = auth.uid()));
CREATE INDEX idx_uptime_events_monitor ON public.uptime_events(monitor_id, checked_at DESC);

-- Uptime summary function
CREATE OR REPLACE FUNCTION public.get_uptime_summary(p_monitor_id uuid, p_hours integer DEFAULT 24)
RETURNS TABLE(uptime_pct double precision, avg_latency_ms double precision, total_checks bigint, failed_checks bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    ROUND((COUNT(*) FILTER (WHERE status = 'up')::numeric / NULLIF(COUNT(*), 0) * 100)::numeric, 2)::double precision,
    AVG(latency_ms)::double precision,
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'down')
  FROM public.uptime_events
  WHERE monitor_id = p_monitor_id
    AND checked_at >= now() - (p_hours || ' hours')::interval;
$$;
