
-- Dashboards table
CREATE TABLE public.dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Untitled Dashboard',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dashboards" ON public.dashboards
  FOR ALL TO public USING (auth.uid() = user_id);

CREATE TRIGGER update_dashboards_updated_at
  BEFORE UPDATE ON public.dashboards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Panels table
CREATE TABLE public.panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id uuid NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Panel',
  panel_type text NOT NULL DEFAULT 'line',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  layout jsonb NOT NULL DEFAULT '{"x":0,"y":0,"w":6,"h":4}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.panels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage panels on own dashboards" ON public.panels
  FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM public.dashboards WHERE dashboards.id = panels.dashboard_id AND dashboards.user_id = auth.uid()));

CREATE TRIGGER update_panels_updated_at
  BEFORE UPDATE ON public.panels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for fast panel lookups
CREATE INDEX idx_panels_dashboard_id ON public.panels(dashboard_id);
