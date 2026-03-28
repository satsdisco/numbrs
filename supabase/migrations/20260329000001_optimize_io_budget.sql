-- Optimize Supabase IO budget: reduce collector frequencies, add retention, add indexes
-- Related: Disk IO Budget alert from Supabase (2026-03-28)

-- ============================================================================
-- 1. Reschedule collectors with relaxed frequencies
-- ============================================================================

-- Remove existing schedules
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname LIKE 'collect-%';

-- Bitcoin: every 10 minutes (was 5)
SELECT cron.schedule(
  'collect-bitcoin',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://untlhymtrpkmiutwkpyh.supabase.co/functions/v1/collect-bitcoin',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Mempool: every 10 minutes (was 5)
SELECT cron.schedule(
  'collect-mempool',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://untlhymtrpkmiutwkpyh.supabase.co/functions/v1/collect-mempool',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- CoinGecko: every 30 minutes (was 10)
SELECT cron.schedule(
  'collect-coingecko',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://untlhymtrpkmiutwkpyh.supabase.co/functions/v1/collect-coingecko',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Fear & Greed: keep at 30 min (already reasonable)
SELECT cron.schedule(
  'collect-fng',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://untlhymtrpkmiutwkpyh.supabase.co/functions/v1/collect-fng',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Lightning: every 30 minutes (was 10)
SELECT cron.schedule(
  'collect-lightning',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://untlhymtrpkmiutwkpyh.supabase.co/functions/v1/collect-lightning',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Weather: every 30 minutes (was 15)
SELECT cron.schedule(
  'collect-weather',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://untlhymtrpkmiutwkpyh.supabase.co/functions/v1/collect-weather',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- FRED: keep at every 6 hours (already reasonable)
SELECT cron.schedule(
  'collect-fred',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://untlhymtrpkmiutwkpyh.supabase.co/functions/v1/collect-fred',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- GitHub: keep at every 30 minutes (already reasonable)
SELECT cron.schedule(
  'collect-github',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://untlhymtrpkmiutwkpyh.supabase.co/functions/v1/collect-github',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================================
-- 2. Data retention: auto-delete datapoints older than 90 days
-- ============================================================================

-- Remove if already scheduled
SELECT cron.unschedule('cleanup-old-datapoints')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-datapoints');

SELECT cron.schedule(
  'cleanup-old-datapoints',
  '0 3 * * *',
  $$
  DELETE FROM public.datapoints
  WHERE created_at < NOW() - INTERVAL '90 days';
  $$
);

-- ============================================================================
-- 3. Performance indexes
-- ============================================================================

-- Index for datapoint range queries (used by get_relay_summary percentile, charts, etc.)
CREATE INDEX IF NOT EXISTS idx_datapoints_metric_created_value
ON public.datapoints(metric_id, created_at DESC, value);

-- Index for collector user_integrations lookup (provider + active filter)
CREATE INDEX IF NOT EXISTS idx_user_integrations_provider_active
ON public.user_integrations(provider, is_active) WHERE is_active = true;

-- Index for metrics lookup by key + user (used by batch-upsert ON CONFLICT)
CREATE INDEX IF NOT EXISTS idx_metrics_key_user
ON public.metrics(key, user_id);
