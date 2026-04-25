-- Add optional webhook_url to test_jobs for agent callback notifications
ALTER TABLE public.test_jobs
  ADD COLUMN IF NOT EXISTS webhook_url TEXT DEFAULT NULL;

COMMENT ON COLUMN public.test_jobs.webhook_url IS
  'Optional HTTPS URL to POST a JSON payload when the job status changes to complete or expired.';
