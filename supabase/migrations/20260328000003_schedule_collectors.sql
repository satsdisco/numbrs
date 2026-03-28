-- Schedule integration collectors via pg_cron + pg_net
-- pg_cron and pg_net were enabled in migration 20260314164820

-- Helper: project base URL for edge functions
-- JWT verification is disabled for all collect-* functions (see config.toml)

-- Remove any existing collector schedules (idempotent)
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname LIKE 'collect-%';

-- Bitcoin price + Moscow Time: every 5 minutes
SELECT cron.schedule(
  'collect-bitcoin',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://untlhymtrpkmiutwkpyh.supabase.co/functions/v1/collect-bitcoin',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Mempool fees, hashrate, block height, halving: every 5 minutes
SELECT cron.schedule(
  'collect-mempool',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://untlhymtrpkmiutwkpyh.supabase.co/functions/v1/collect-mempool',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- CoinGecko market stats: every 10 minutes
SELECT cron.schedule(
  'collect-coingecko',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://untlhymtrpkmiutwkpyh.supabase.co/functions/v1/collect-coingecko',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Fear & Greed Index: every 30 minutes (updates daily but check more often)
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

-- Lightning Network stats: every 10 minutes
SELECT cron.schedule(
  'collect-lightning',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://untlhymtrpkmiutwkpyh.supabase.co/functions/v1/collect-lightning',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Weather: every 15 minutes
SELECT cron.schedule(
  'collect-weather',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://untlhymtrpkmiutwkpyh.supabase.co/functions/v1/collect-weather',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- FRED macro data: every 6 hours (data updates weekly/monthly)
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

-- GitHub stats: every 30 minutes
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
