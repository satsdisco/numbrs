-- User integrations table — stores per-user config for server-side data collection
CREATE TABLE public.user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,  -- 'github', 'vercel', 'bitcoin', etc.
  config JSONB NOT NULL DEFAULT '{}',  -- provider-specific config (username, token, repos, etc.)
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One integration per provider per user
CREATE UNIQUE INDEX idx_user_integrations_provider ON public.user_integrations(user_id, provider);

-- Index for scheduled polling
CREATE INDEX idx_user_integrations_active ON public.user_integrations(provider, is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own integrations" ON public.user_integrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integrations" ON public.user_integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations" ON public.user_integrations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations" ON public.user_integrations
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_user_integrations
  BEFORE UPDATE ON public.user_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
