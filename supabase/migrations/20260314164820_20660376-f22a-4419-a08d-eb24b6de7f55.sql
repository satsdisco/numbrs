
-- 1. Drop FK constraints on relays that reference metrics
ALTER TABLE public.relays DROP CONSTRAINT IF EXISTS relays_latency_metric_id_fkey;
ALTER TABLE public.relays DROP CONSTRAINT IF EXISTS relays_uptime_metric_id_fkey;

-- 2. Drop unused columns from relays
ALTER TABLE public.relays DROP COLUMN IF EXISTS latency_metric_id;
ALTER TABLE public.relays DROP COLUMN IF EXISTS uptime_metric_id;

-- 3. Add region to relays
ALTER TABLE public.relays ADD COLUMN IF NOT EXISTS region text;

-- 4. Make metrics.user_id nullable (for system-level metric definitions)
ALTER TABLE public.metrics ALTER COLUMN user_id DROP NOT NULL;

-- 5. Add category to metrics
ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'custom';

-- 6. Add relay_id to datapoints (FK to relays, nullable for non-relay metrics)
ALTER TABLE public.datapoints ADD COLUMN IF NOT EXISTS relay_id uuid REFERENCES public.relays(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_datapoints_relay_id ON public.datapoints(relay_id);
CREATE INDEX IF NOT EXISTS idx_datapoints_metric_relay ON public.datapoints(metric_id, relay_id, created_at DESC);

-- 7. Add last_used_at to api_keys
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS last_used_at timestamptz;

-- 8. RLS: Users can read datapoints linked to their relays
CREATE POLICY "Users can view datapoints for own relays"
ON public.datapoints FOR SELECT
TO authenticated
USING (
  relay_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.relays
    WHERE relays.id = datapoints.relay_id
    AND relays.user_id = auth.uid()
  )
);

-- 9. RLS: Anyone can view system metrics (user_id IS NULL)
CREATE POLICY "Anyone can view system metrics"
ON public.metrics FOR SELECT
USING (user_id IS NULL);

-- 10. Relay summary aggregation function
CREATE OR REPLACE FUNCTION public.get_relay_summary(
  p_relay_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
RETURNS TABLE(
  metric_key text,
  avg_val double precision,
  min_val double precision,
  max_val double precision,
  p50_val double precision,
  p95_val double precision,
  latest_val double precision,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    m.key AS metric_key,
    AVG(d.value)::double precision AS avg_val,
    MIN(d.value)::double precision AS min_val,
    MAX(d.value)::double precision AS max_val,
    (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY d.value))::double precision AS p50_val,
    (PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY d.value))::double precision AS p95_val,
    (SELECT d2.value FROM public.datapoints d2
     WHERE d2.metric_id = m.id AND d2.relay_id = p_relay_id
     AND d2.created_at >= p_start AND d2.created_at <= p_end
     ORDER BY d2.created_at DESC LIMIT 1)::double precision AS latest_val,
    COUNT(*) AS total_count
  FROM public.datapoints d
  JOIN public.metrics m ON m.id = d.metric_id
  WHERE d.relay_id = p_relay_id
    AND d.created_at >= p_start
    AND d.created_at <= p_end
  GROUP BY m.id, m.key;
$$;

-- 11. Relay timeseries function
CREATE OR REPLACE FUNCTION public.get_relay_timeseries(
  p_relay_id uuid,
  p_metric_key text,
  p_start timestamptz,
  p_end timestamptz,
  p_interval_seconds integer
)
RETURNS TABLE(
  bucket timestamptz,
  avg_value double precision,
  min_value double precision,
  max_value double precision,
  count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    to_timestamp(floor(EXTRACT(EPOCH FROM d.created_at) / p_interval_seconds) * p_interval_seconds) AS bucket,
    AVG(d.value)::double precision AS avg_value,
    MIN(d.value)::double precision AS min_value,
    MAX(d.value)::double precision AS max_value,
    COUNT(*) AS count
  FROM public.datapoints d
  JOIN public.metrics m ON m.id = d.metric_id
  WHERE d.relay_id = p_relay_id
    AND m.key = p_metric_key
    AND d.created_at >= p_start
    AND d.created_at <= p_end
  GROUP BY bucket
  ORDER BY bucket;
$$;

-- 12. Enable pg_cron and pg_net for scheduled probing
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
