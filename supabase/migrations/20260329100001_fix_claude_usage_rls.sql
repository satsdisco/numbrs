-- Fix RLS policies for claude_usage and openclaw_usage
--
-- The previous migration created a "Service role full access" policy with USING(true).
-- In Supabase, service_role already bypasses RLS entirely, so that policy was redundant.
-- Worse, a PERMISSIVE policy with USING(true) is OR'd with all other policies, making
-- the per-user SELECT policy effectively useless — every authenticated user could read
-- all rows. This migration drops those overly-permissive policies.

-- ── claude_usage ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Service role full access claude_usage" ON claude_usage;

-- Re-create per-user SELECT policy (no-op if it already exists correctly)
DROP POLICY IF EXISTS "Users read own claude_usage" ON claude_usage;
CREATE POLICY "Users read own claude_usage" ON claude_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Re-create per-user INSERT policy
DROP POLICY IF EXISTS "Users insert own claude_usage" ON claude_usage;
CREATE POLICY "Users insert own claude_usage" ON claude_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy so users can update their own rows
DROP POLICY IF EXISTS "Users update own claude_usage" ON claude_usage;
CREATE POLICY "Users update own claude_usage" ON claude_usage
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ── openclaw_usage ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Service role full access openclaw_usage" ON openclaw_usage;

-- Re-create per-user SELECT policy
DROP POLICY IF EXISTS "Users read own openclaw_usage" ON openclaw_usage;
CREATE POLICY "Users read own openclaw_usage" ON openclaw_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Add INSERT policy (defense in depth, service role handles writes via edge functions)
DROP POLICY IF EXISTS "Users insert own openclaw_usage" ON openclaw_usage;
CREATE POLICY "Users insert own openclaw_usage" ON openclaw_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy so users can update their own rows
DROP POLICY IF EXISTS "Users update own openclaw_usage" ON openclaw_usage;
CREATE POLICY "Users update own openclaw_usage" ON openclaw_usage
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
