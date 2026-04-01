-- Schedule relay activity collector: every hour at minute 15
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname = 'collect-relay-activity';

SELECT cron.schedule(
  'collect-relay-activity',
  '15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://untlhymtrpkmiutwkpyh.supabase.co/functions/v1/relay-activity-collector',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
