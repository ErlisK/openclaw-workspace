-- Migration: Add is_test_account column to users table
-- Used by /api/scide/metrics to exclude test/automated accounts from user counts

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN DEFAULT FALSE;

-- Back-fill existing test accounts based on email patterns
UPDATE public.users
SET is_test_account = TRUE
WHERE
  email ILIKE 'test-%'
  OR email ILIKE 'e2e-%'
  OR email ILIKE 'playwright-%'
  OR email ILIKE 'cypress-%'
  OR email ILIKE 'bot-%'
  OR email ILIKE 'qa-%'
  OR email ILIKE '%+test@%'
  OR email ILIKE '%+e2e@%'
  OR email ILIKE '%+bot@%'
  OR email ILIKE '%+qa@%'
  OR email ILIKE '%@example.com'
  OR email ILIKE '%@test.com'
  OR email ILIKE '%@mailinator.com'
  OR email ILIKE '%@guerrillamail.com'
  OR email ILIKE '%@tempmail.com';

-- Index for fast filtering in metrics queries
CREATE INDEX IF NOT EXISTS idx_users_is_test_account ON public.users(is_test_account)
  WHERE is_test_account = TRUE;

-- Comment for documentation
COMMENT ON COLUMN public.users.is_test_account IS
  'TRUE for automated/test accounts created by agents, E2E runners, or QA tooling. Excluded from all real user metrics.';
