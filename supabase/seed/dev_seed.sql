-- =============================================================================
-- Seed: Development test data
-- Run: supabase db seed  (dev only, never production)
-- =============================================================================

-- NOTE: In real usage, users are created via Supabase Auth.
-- This seed creates a test user directly in auth.users for local dev.

-- Test user (password: TestPassword123!)
-- INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, ...)
-- Skipped: use `supabase auth create-user` CLI command for local dev

-- Example tasks (replace user_id with actual UUID from `supabase auth list`)
-- INSERT INTO public.tasks (user_id, text, status, priority, created_at, completed_at)
-- VALUES
--   ('00000000-0000-0000-0000-000000000001', 'Set up Supabase project', 'completed', 'high',
--    NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour'),
--   ('00000000-0000-0000-0000-000000000001', 'Write ADR-002', 'active', 'high', NOW(), NULL),
--   ('00000000-0000-0000-0000-000000000001', 'Configure PostHog', 'active', 'medium', NOW(), NULL);

SELECT 'Seed file loaded — uncomment inserts for local dev' AS note;
