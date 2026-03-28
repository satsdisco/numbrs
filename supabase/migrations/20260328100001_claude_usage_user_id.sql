-- Add user_id to claude_usage for multi-user support
-- If user_id column already exists, this is a no-op

DO $$
BEGIN
  -- Add user_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claude_usage' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE claude_usage ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;

  -- Add unique constraint on user_id + session_id for upsert
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'claude_usage_user_session_unique'
  ) THEN
    -- First, try to add the constraint. If there are dupes, this will fail,
    -- so we handle it gracefully.
    BEGIN
      ALTER TABLE claude_usage
        ADD CONSTRAINT claude_usage_user_session_unique
        UNIQUE (user_id, session_id);
    EXCEPTION WHEN unique_violation THEN
      -- If dupes exist, we skip — admin can clean up manually
      RAISE NOTICE 'Duplicate user_id/session_id rows exist — constraint not added';
    END;
  END IF;

  -- Add index for user_id + date queries
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_claude_usage_user_date'
  ) THEN
    CREATE INDEX idx_claude_usage_user_date ON claude_usage(user_id, date DESC);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE claude_usage ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
DROP POLICY IF EXISTS "Users read own claude_usage" ON claude_usage;
CREATE POLICY "Users read own claude_usage" ON claude_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own data
DROP POLICY IF EXISTS "Users insert own claude_usage" ON claude_usage;
CREATE POLICY "Users insert own claude_usage" ON claude_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (for the API edge function)
DROP POLICY IF EXISTS "Service role full access claude_usage" ON claude_usage;
CREATE POLICY "Service role full access claude_usage" ON claude_usage
  FOR ALL USING (true) WITH CHECK (true);


-- Same for openclaw_usage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'openclaw_usage' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE openclaw_usage ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_openclaw_usage_user_date'
  ) THEN
    CREATE INDEX idx_openclaw_usage_user_date ON openclaw_usage(user_id, date DESC);
  END IF;
END $$;

ALTER TABLE openclaw_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own openclaw_usage" ON openclaw_usage;
CREATE POLICY "Users read own openclaw_usage" ON openclaw_usage
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access openclaw_usage" ON openclaw_usage;
CREATE POLICY "Service role full access openclaw_usage" ON openclaw_usage
  FOR ALL USING (true) WITH CHECK (true);
