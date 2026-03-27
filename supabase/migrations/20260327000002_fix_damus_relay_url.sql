-- Fix Damus relay URL typo: wss://realy.damus.io → wss://relay.damus.io
-- The URL was stored with a missing 'l' in 'relay'.
-- All frontend references already use the correct URL; this corrects any rows
-- that may have been seeded with the typo before the fix.

UPDATE public.relays
SET url        = 'wss://relay.damus.io',
    updated_at = now()
WHERE url = 'wss://realy.damus.io';
