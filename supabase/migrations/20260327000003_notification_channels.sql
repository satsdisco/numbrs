-- Notification channels: stores delivery destinations for alert rules.
-- Initial support: Slack incoming webhook.

CREATE TABLE IF NOT EXISTS public.notification_channels (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL DEFAULT 'slack',
  name        TEXT        NOT NULL DEFAULT 'Slack',
  config      JSONB       NOT NULL DEFAULT '{}',
  -- config for slack: { "webhook_url": "https://hooks.slack.com/services/..." }
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own channels"
  ON public.notification_channels
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX notification_channels_user_id_idx ON public.notification_channels (user_id);
