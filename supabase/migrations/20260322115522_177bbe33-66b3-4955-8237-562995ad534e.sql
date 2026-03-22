
-- Allow anyone to view all relays (public directory)
CREATE POLICY "Anyone can view all relays"
ON public.relays
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow public access to datapoints for relay metrics (for public directory)
CREATE POLICY "Anyone can view relay datapoints"
ON public.datapoints
FOR SELECT
TO anon
USING (relay_id IS NOT NULL);

-- Function to get public relay directory with health stats
CREATE OR REPLACE FUNCTION public.get_public_relay_directory(
  p_start timestamp with time zone,
  p_end timestamp with time zone
)
RETURNS TABLE(
  relay_id uuid,
  relay_name text,
  relay_url text,
  relay_region text,
  connect_p50 double precision,
  connect_p95 double precision,
  event_p50 double precision,
  event_p95 double precision,
  uptime_pct double precision,
  total_checks bigint,
  failed_probes bigint,
  health_score integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_connect_id uuid;
  v_event_id uuid;
  v_up_id uuid;
BEGIN
  SELECT id INTO v_connect_id FROM metrics WHERE key = 'relay_latency_connect_ms' LIMIT 1;
  SELECT id INTO v_event_id FROM metrics WHERE key = 'relay_latency_first_event_ms' LIMIT 1;
  SELECT id INTO v_up_id FROM metrics WHERE key = 'relay_up' LIMIT 1;

  RETURN QUERY
  SELECT
    r.id AS relay_id,
    r.name AS relay_name,
    r.url AS relay_url,
    r.region AS relay_region,
    (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY d.value)
     FROM datapoints d WHERE d.metric_id = v_connect_id AND d.relay_id = r.id
     AND d.created_at >= p_start AND d.created_at <= p_end)::double precision AS connect_p50,
    (SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY d.value)
     FROM datapoints d WHERE d.metric_id = v_connect_id AND d.relay_id = r.id
     AND d.created_at >= p_start AND d.created_at <= p_end)::double precision AS connect_p95,
    (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY d.value)
     FROM datapoints d WHERE d.metric_id = v_event_id AND d.relay_id = r.id
     AND d.created_at >= p_start AND d.created_at <= p_end)::double precision AS event_p50,
    (SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY d.value)
     FROM datapoints d WHERE d.metric_id = v_event_id AND d.relay_id = r.id
     AND d.created_at >= p_start AND d.created_at <= p_end)::double precision AS event_p95,
    (SELECT COALESCE(avg(d.value), 0) * 100
     FROM datapoints d WHERE d.metric_id = v_up_id AND d.relay_id = r.id
     AND d.created_at >= p_start AND d.created_at <= p_end)::double precision AS uptime_pct,
    (SELECT count(*)
     FROM datapoints d WHERE d.metric_id = v_up_id AND d.relay_id = r.id
     AND d.created_at >= p_start AND d.created_at <= p_end)::bigint AS total_checks,
    (SELECT count(*) FILTER (WHERE d.value = 0)
     FROM datapoints d WHERE d.metric_id = v_up_id AND d.relay_id = r.id
     AND d.created_at >= p_start AND d.created_at <= p_end)::bigint AS failed_probes,
    -- health score inline
    GREATEST(0, LEAST(100, ROUND(
      100
      - (100 - COALESCE((SELECT avg(d.value) * 100 FROM datapoints d WHERE d.metric_id = v_up_id AND d.relay_id = r.id AND d.created_at >= p_start AND d.created_at <= p_end), 0)) * 0.4
      - LEAST(COALESCE((SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY d.value) FROM datapoints d WHERE d.metric_id = v_connect_id AND d.relay_id = r.id AND d.created_at >= p_start AND d.created_at <= p_end), 0) / 2000.0, 1) * 100 * 0.3
      - CASE WHEN (SELECT count(*) FROM datapoints d WHERE d.metric_id = v_up_id AND d.relay_id = r.id AND d.created_at >= p_start AND d.created_at <= p_end) > 0
        THEN (SELECT count(*) FILTER (WHERE d.value = 0) FROM datapoints d WHERE d.metric_id = v_up_id AND d.relay_id = r.id AND d.created_at >= p_start AND d.created_at <= p_end)::double precision
             / (SELECT count(*) FROM datapoints d WHERE d.metric_id = v_up_id AND d.relay_id = r.id AND d.created_at >= p_start AND d.created_at <= p_end) * 100 * 0.3
        ELSE 0 END
    )))::integer AS health_score
  FROM relays r
  ORDER BY health_score DESC NULLS LAST;
END;
$$;
