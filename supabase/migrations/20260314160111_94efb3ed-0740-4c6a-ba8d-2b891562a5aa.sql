
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- API Keys table
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL UNIQUE DEFAULT 'nmbr_' || replace(gen_random_uuid()::text, '-', ''),
  name TEXT NOT NULL DEFAULT 'Default',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own api_keys" ON public.api_keys FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_api_keys_key ON public.api_keys (key);

-- Metrics table
CREATE TABLE public.metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT,
  value_type TEXT NOT NULL DEFAULT 'float' CHECK (value_type IN ('int', 'float')),
  tags JSONB DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, key)
);
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own metrics" ON public.metrics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view public metrics" ON public.metrics FOR SELECT USING (is_public = true);

CREATE TRIGGER update_metrics_updated_at BEFORE UPDATE ON public.metrics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Datapoints table (timeseries-friendly)
CREATE TABLE public.datapoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id UUID NOT NULL REFERENCES public.metrics(id) ON DELETE CASCADE,
  value DOUBLE PRECISION NOT NULL,
  dimensions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.datapoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert datapoints for own metrics" ON public.datapoints
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.metrics WHERE id = metric_id AND user_id = auth.uid())
);
CREATE POLICY "Users can view datapoints for own metrics" ON public.datapoints
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.metrics WHERE id = metric_id AND user_id = auth.uid())
);
CREATE POLICY "Anyone can view datapoints for public metrics" ON public.datapoints
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.metrics WHERE id = metric_id AND is_public = true)
);

CREATE INDEX idx_datapoints_metric_created ON public.datapoints (metric_id, created_at DESC);
CREATE INDEX idx_datapoints_created_at ON public.datapoints (created_at);

-- Relays table
CREATE TABLE public.relays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  latency_metric_id UUID REFERENCES public.metrics(id) ON DELETE SET NULL,
  uptime_metric_id UUID REFERENCES public.metrics(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.relays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own relays" ON public.relays FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_relays_updated_at BEFORE UPDATE ON public.relays
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to look up user_id from API key (for edge function ingestion)
CREATE OR REPLACE FUNCTION public.get_user_id_from_api_key(api_key_value TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.api_keys WHERE key = api_key_value AND is_active = true LIMIT 1;
$$;

-- Aggregation helper for timeseries
CREATE OR REPLACE FUNCTION public.get_timeseries(
  p_metric_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ,
  p_interval_seconds INT
)
RETURNS TABLE(bucket TIMESTAMPTZ, avg_value DOUBLE PRECISION, min_value DOUBLE PRECISION, max_value DOUBLE PRECISION, count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    to_timestamp(floor(EXTRACT(EPOCH FROM created_at) / p_interval_seconds) * p_interval_seconds) AS bucket,
    AVG(value) AS avg_value,
    MIN(value) AS min_value,
    MAX(value) AS max_value,
    COUNT(*) AS count
  FROM public.datapoints
  WHERE metric_id = p_metric_id
    AND created_at >= p_start
    AND created_at <= p_end
  GROUP BY bucket
  ORDER BY bucket;
$$;

-- Stats helper
CREATE OR REPLACE FUNCTION public.get_metric_stats(
  p_metric_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS TABLE(min_val DOUBLE PRECISION, max_val DOUBLE PRECISION, avg_val DOUBLE PRECISION, p50_val DOUBLE PRECISION, p95_val DOUBLE PRECISION, total_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    MIN(value),
    MAX(value),
    AVG(value),
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value),
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value),
    COUNT(*)
  FROM public.datapoints
  WHERE metric_id = p_metric_id
    AND created_at >= p_start
    AND created_at <= p_end;
$$;
