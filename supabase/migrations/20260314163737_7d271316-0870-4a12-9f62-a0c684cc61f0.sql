
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pubkey text UNIQUE;

-- Allow looking up profiles by pubkey (for the edge function)
CREATE INDEX IF NOT EXISTS idx_profiles_pubkey ON public.profiles(pubkey) WHERE pubkey IS NOT NULL;
