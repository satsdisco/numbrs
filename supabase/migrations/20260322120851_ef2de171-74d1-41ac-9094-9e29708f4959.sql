
-- Add sharing columns to dashboards
ALTER TABLE public.dashboards
  ADD COLUMN is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN share_token text UNIQUE DEFAULT NULL;

-- Create unique index on share_token for fast lookups
CREATE INDEX idx_dashboards_share_token ON public.dashboards (share_token) WHERE share_token IS NOT NULL;

-- Allow anyone to view public dashboards
CREATE POLICY "Anyone can view public dashboards"
ON public.dashboards
FOR SELECT
TO anon, authenticated
USING (is_public = true);

-- Allow anyone to view panels on public dashboards
CREATE POLICY "Anyone can view panels on public dashboards"
ON public.panels
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.dashboards d
    WHERE d.id = panels.dashboard_id AND d.is_public = true
  )
);
