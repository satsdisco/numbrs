-- Return individual incident windows for a relay within a time range.
-- Uses the same islands technique as get_relay_health but returns each incident row.
CREATE OR REPLACE FUNCTION public.get_relay_incidents(
  p_relay_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
RETURNS TABLE(
  incident_start timestamptz,
  incident_end timestamptz,
  duration_secs double precision,
  failed_checks bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_up_id uuid;
BEGIN
  SELECT id INTO v_up_id FROM metrics WHERE key = 'relay_up' LIMIT 1;

  RETURN QUERY
  WITH up_ordered AS (
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
      EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) AS dur_secs,
      COUNT(*) AS checks
    FROM up_ordered
    WHERE value = 0
    GROUP BY (rn - rn_v)
    HAVING EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) > 60
  )
  SELECT
    di.island_start AS incident_start,
    di.island_end AS incident_end,
    di.dur_secs AS duration_secs,
    di.checks AS failed_checks
  FROM down_islands di
  ORDER BY di.island_start DESC;
END;
$$;
