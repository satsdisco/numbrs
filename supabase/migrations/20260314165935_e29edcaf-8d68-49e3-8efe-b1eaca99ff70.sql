
CREATE OR REPLACE FUNCTION public.get_relay_health(
  p_relay_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
RETURNS TABLE(
  connect_p50 double precision,
  connect_p95 double precision,
  connect_avg double precision,
  connect_stddev double precision,
  event_p50 double precision,
  event_p95 double precision,
  uptime_pct double precision,
  total_checks bigint,
  failed_probes bigint,
  failure_rate double precision,
  downtime_incidents bigint,
  longest_downtime_secs double precision,
  prev_connect_p50 double precision
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_connect_id uuid;
  v_event_id uuid;
  v_up_id uuid;
  v_window interval;
BEGIN
  SELECT id INTO v_connect_id FROM metrics WHERE key = 'relay_latency_connect_ms' LIMIT 1;
  SELECT id INTO v_event_id   FROM metrics WHERE key = 'relay_latency_first_event_ms' LIMIT 1;
  SELECT id INTO v_up_id      FROM metrics WHERE key = 'relay_up' LIMIT 1;
  v_window := p_end - p_start;

  RETURN QUERY
  WITH connect_stats AS (
    SELECT
      percentile_cont(0.5) WITHIN GROUP (ORDER BY d.value)  AS p50,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY d.value) AS p95,
      avg(d.value)    AS avg_val,
      stddev(d.value) AS stddev_val
    FROM datapoints d
    WHERE d.metric_id = v_connect_id
      AND d.relay_id = p_relay_id
      AND d.created_at >= p_start AND d.created_at <= p_end
  ),
  event_stats AS (
    SELECT
      percentile_cont(0.5) WITHIN GROUP (ORDER BY d.value)  AS p50,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY d.value) AS p95
    FROM datapoints d
    WHERE d.metric_id = v_event_id
      AND d.relay_id = p_relay_id
      AND d.created_at >= p_start AND d.created_at <= p_end
  ),
  up_stats AS (
    SELECT
      avg(d.value) AS uptime,
      count(*)     AS total,
      count(*) FILTER (WHERE d.value = 0) AS failed
    FROM datapoints d
    WHERE d.metric_id = v_up_id
      AND d.relay_id = p_relay_id
      AND d.created_at >= p_start AND d.created_at <= p_end
  ),
  -- Islands technique: detect contiguous groups of down (value=0) probes
  up_ordered AS (
    SELECT
      d.created_at,
      d.value,
      ROW_NUMBER() OVER (ORDER BY d.created_at) AS rn,
      ROW_NUMBER() OVER (PARTITION BY d.value::int ORDER BY d.created_at) AS rn_v
    FROM datapoints d
    WHERE d.metric_id = v_up_id
      AND d.relay_id = p_relay_id
      AND d.created_at >= p_start AND d.created_at <= p_end
  ),
  down_islands AS (
    SELECT
      (rn - rn_v) AS island_id,
      MIN(created_at) AS island_start,
      MAX(created_at) AS island_end,
      EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) AS duration_secs
    FROM up_ordered
    WHERE value = 0
    GROUP BY (rn - rn_v)
    HAVING EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) > 60
  ),
  incident_stats AS (
    SELECT
      COALESCE(count(*), 0) AS cnt,
      COALESCE(max(duration_secs), 0) AS max_dur
    FROM down_islands
  ),
  -- Previous window p50 for trend comparison
  prev_stats AS (
    SELECT
      percentile_cont(0.5) WITHIN GROUP (ORDER BY d.value) AS p50
    FROM datapoints d
    WHERE d.metric_id = v_connect_id
      AND d.relay_id = p_relay_id
      AND d.created_at >= (p_start - v_window)
      AND d.created_at < p_start
  )
  SELECT
    cs.p50::double precision,
    cs.p95::double precision,
    cs.avg_val::double precision,
    cs.stddev_val::double precision,
    es.p50::double precision,
    es.p95::double precision,
    (COALESCE(us.uptime, 0) * 100)::double precision,
    COALESCE(us.total, 0)::bigint,
    COALESCE(us.failed, 0)::bigint,
    CASE WHEN us.total > 0
      THEN (us.failed::double precision / us.total * 100)
      ELSE 0
    END::double precision,
    COALESCE(ist.cnt, 0)::bigint,
    COALESCE(ist.max_dur, 0)::double precision,
    ps.p50::double precision
  FROM connect_stats cs
  CROSS JOIN event_stats es
  CROSS JOIN up_stats us
  CROSS JOIN incident_stats ist
  CROSS JOIN prev_stats ps;
END;
$$;
