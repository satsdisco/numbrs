-- Relay activity tracking: hourly buckets of event counts per kind
CREATE TABLE public.relay_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relay_id UUID NOT NULL REFERENCES public.relays(id) ON DELETE CASCADE,
  bucket TIMESTAMPTZ NOT NULL,  -- truncated to hour
  kind INTEGER NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 0,
  total_sats BIGINT DEFAULT 0,  -- for kind 9735 (zaps), sum of bolt11 amounts
  unique_pubkeys INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.relay_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own relay activity" ON public.relay_activity FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.relays
    WHERE relays.id = relay_activity.relay_id
      AND relays.user_id = auth.uid()
  ));

CREATE POLICY "Service role can insert relay activity" ON public.relay_activity FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update relay activity" ON public.relay_activity FOR UPDATE
  USING (true);

-- Unique constraint for upserts (one row per relay + hour + kind)
CREATE UNIQUE INDEX idx_relay_activity_bucket ON public.relay_activity(relay_id, bucket, kind);

-- Query performance
CREATE INDEX idx_relay_activity_relay_time ON public.relay_activity(relay_id, bucket DESC);

-- Helper: get activity summary for a relay over a time range
CREATE OR REPLACE FUNCTION public.get_relay_activity_summary(
  p_relay_id UUID,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE(
  kind INTEGER,
  total_events BIGINT,
  total_sats BIGINT,
  total_unique_pubkeys BIGINT,
  buckets BIGINT
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    kind,
    SUM(event_count)::BIGINT AS total_events,
    SUM(total_sats)::BIGINT AS total_sats,
    SUM(unique_pubkeys)::BIGINT AS total_unique_pubkeys,
    COUNT(*)::BIGINT AS buckets
  FROM public.relay_activity
  WHERE relay_id = p_relay_id
    AND bucket >= now() - (p_hours || ' hours')::interval
  GROUP BY kind
  ORDER BY total_events DESC;
$$;
