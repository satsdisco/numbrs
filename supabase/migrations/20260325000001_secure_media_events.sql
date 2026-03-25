-- Secure plex_events and jellyfin_events with owner_id + RLS

-- 1. Add owner_id to plex_events
ALTER TABLE public.plex_events ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Add owner_id to jellyfin_events  
ALTER TABLE public.jellyfin_events ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Backfill existing data — all current events belong to satsdisco's account
UPDATE public.plex_events SET owner_id = '37f6ae06-b213-4b33-9eab-e5e83588cc21' WHERE owner_id IS NULL;
UPDATE public.jellyfin_events SET owner_id = '37f6ae06-b213-4b33-9eab-e5e83588cc21' WHERE owner_id IS NULL;

-- 4. Make owner_id NOT NULL going forward
ALTER TABLE public.plex_events ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.jellyfin_events ALTER COLUMN owner_id SET NOT NULL;

-- 5. Index for fast per-user queries
CREATE INDEX IF NOT EXISTS idx_plex_events_owner ON public.plex_events(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jellyfin_events_owner ON public.jellyfin_events(owner_id, date_played DESC);

-- 6. Enable RLS
ALTER TABLE public.plex_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jellyfin_events ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies — users can only see and insert their own events
CREATE POLICY "Users can view own plex events" ON public.plex_events 
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own plex events" ON public.plex_events 
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own plex events" ON public.plex_events 
  FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Users can view own jellyfin events" ON public.jellyfin_events 
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own jellyfin events" ON public.jellyfin_events 
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own jellyfin events" ON public.jellyfin_events 
  FOR DELETE USING (auth.uid() = owner_id);

-- 8. Service role bypass — the collector script uses service role key, 
-- which bypasses RLS by default. The ingest edge function also uses service role.
-- No additional policy needed for service role inserts.
