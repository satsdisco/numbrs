
-- Alert rules table
CREATE TABLE public.alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  relay_id uuid REFERENCES public.relays(id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  condition text NOT NULL DEFAULT 'gt',
  threshold double precision NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  name text NOT NULL DEFAULT 'Untitled Alert',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own alert_rules"
ON public.alert_rules
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Alert events (triggered alerts)
CREATE TABLE public.alert_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_rule_id uuid NOT NULL REFERENCES public.alert_rules(id) ON DELETE CASCADE,
  value double precision NOT NULL,
  relay_id uuid REFERENCES public.relays(id) ON DELETE SET NULL,
  metric_key text NOT NULL,
  threshold double precision NOT NULL,
  condition text NOT NULL,
  acknowledged boolean NOT NULL DEFAULT false,
  triggered_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.alert_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alert_events"
ON public.alert_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.alert_rules ar
    WHERE ar.id = alert_events.alert_rule_id
    AND ar.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own alert_events"
ON public.alert_events
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.alert_rules ar
    WHERE ar.id = alert_events.alert_rule_id
    AND ar.user_id = auth.uid()
  )
);

-- Index for fast lookups during probe
CREATE INDEX idx_alert_rules_active ON public.alert_rules (is_active) WHERE is_active = true;
CREATE INDEX idx_alert_events_rule ON public.alert_events (alert_rule_id, triggered_at DESC);
