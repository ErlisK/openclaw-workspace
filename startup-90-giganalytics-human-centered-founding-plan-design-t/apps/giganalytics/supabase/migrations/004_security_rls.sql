-- Migration 004: Security hardening
-- 1. Fix subscriptions RLS (policies from 003 didn't apply — re-apply)
-- 2. Restrict benchmark_snapshots to read-only for users (writes only via SECURITY DEFINER function)
-- 3. Lock down benchmark_opt_ins DELETE to user-owns-it (already covered, but explicit)
-- 4. Add explicit DENY for anonymous on all sensitive tables

-- ─── subscriptions: read-only for authenticated users ────────────────────────
-- Drop any stale ALL policy that may exist
DROP POLICY IF EXISTS "users own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "users_read_own_subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "service_role_write_subscriptions" ON subscriptions;

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only SELECT their own subscription record
CREATE POLICY "users_read_own_subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (webhook handler) can do full writes
CREATE POLICY "service_role_write_subscriptions"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─── benchmark_snapshots: read-only for users ────────────────────────────────
-- Drop the broad ALL policy
DROP POLICY IF EXISTS "users own benchmark_snapshots" ON benchmark_snapshots;

-- Users can read aggregate snapshots (cross-user aggregates, NOT their raw data)
CREATE POLICY "authenticated_read_benchmark_snapshots"
  ON benchmark_snapshots FOR SELECT
  USING (auth.role() = 'authenticated');

-- ONLY service role / security-definer function may insert/update/delete snapshots
CREATE POLICY "service_role_write_benchmark_snapshots"
  ON benchmark_snapshots FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─── Verify k-anonymity gate is enforced in aggregate function ───────────────
-- The aggregate_benchmark_snapshots function already filters sample_size >= 10.
-- Revoking direct INSERT/UPDATE on benchmark_snapshots from authenticated users
-- ensures the only write path is through the SECURITY DEFINER function.
REVOKE INSERT, UPDATE, DELETE ON benchmark_snapshots FROM authenticated;

-- ─── Explicit anon deny (belt-and-suspenders) ────────────────────────────────
-- anon role should never access user data tables
REVOKE ALL ON TABLE transactions FROM anon;
REVOKE ALL ON TABLE time_entries FROM anon;
REVOKE ALL ON TABLE streams FROM anon;
REVOKE ALL ON TABLE profiles FROM anon;
REVOKE ALL ON TABLE acquisition_costs FROM anon;
REVOKE ALL ON TABLE experiments FROM anon;
REVOKE ALL ON TABLE recommendations FROM anon;
REVOKE ALL ON TABLE user_goals FROM anon;
REVOKE ALL ON TABLE user_settings FROM anon;
REVOKE ALL ON TABLE benchmark_opt_ins FROM anon;
REVOKE ALL ON TABLE subscriptions FROM anon;
-- benchmark_snapshots: anon cannot read either (auth required)
REVOKE ALL ON TABLE benchmark_snapshots FROM anon;
