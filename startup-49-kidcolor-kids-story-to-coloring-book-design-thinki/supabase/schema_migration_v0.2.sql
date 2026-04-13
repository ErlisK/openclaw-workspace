-- ============================================================
-- KidColoring — Schema Migration v0.2
-- Guardrails: deletion flows, COPPA audit columns, RLS policies
-- ============================================================

-- ── Deletion columns ────────────────────────────────────────
ALTER TABLE profiles  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE children  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE books     ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Index for nightly cron query
CREATE INDEX IF NOT EXISTS profiles_deleted_at_idx ON profiles(deleted_at)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS children_deleted_at_idx ON children(deleted_at)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS books_deleted_at_idx ON books(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ── COPPA audit columns ──────────────────────────────────────
-- coppa_agreed + coppa_agreed_at already on profiles from v0.
-- Add ip_country for geo-gating (GDPR/COPPA jurisdiction)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ip_country text DEFAULT NULL;

-- ── Story text retention ─────────────────────────────────────
-- raw_text should be set to NULL 90d post-delivery.
-- Cron marks it with a sentinel string for audit visibility.
-- No schema change needed — existing column is already nullable.

-- ── RLS Policies ─────────────────────────────────────────────
-- Principle: each parent can only read/write their own rows.
-- Service role bypasses RLS for analytics and admin writes.

-- profiles: users can only read+update their own profile
DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- children: parents can CRUD only their own children
DROP POLICY IF EXISTS children_parent_all ON children;
CREATE POLICY children_parent_all ON children
  FOR ALL USING (
    parent_id = auth.uid()
    AND deleted_at IS NULL
  );

-- stories: users can read only their own stories
DROP POLICY IF EXISTS stories_owner_select ON stories;
CREATE POLICY stories_owner_select ON stories
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS stories_owner_insert ON stories;
CREATE POLICY stories_owner_insert ON stories
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- books: users can read only their own books
DROP POLICY IF EXISTS books_owner_select ON books;
CREATE POLICY books_owner_select ON books
  FOR SELECT USING (
    user_id = auth.uid()
    AND deleted_at IS NULL
  );

-- pages: users access pages through their own books
DROP POLICY IF EXISTS pages_owner_select ON pages;
CREATE POLICY pages_owner_select ON pages
  FOR SELECT USING (
    book_id IN (
      SELECT id FROM books WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- events: no direct client read/write (service_role only)
-- RLS is enabled but no client policy = client cannot read events
DROP POLICY IF EXISTS events_no_client_access ON events;
-- (intentionally empty — service_role bypasses RLS)

-- satisfaction_ratings: users can insert and read their own
DROP POLICY IF EXISTS ratings_owner_all ON satisfaction_ratings;
CREATE POLICY ratings_owner_all ON satisfaction_ratings
  FOR ALL USING (user_id = auth.uid());

-- referrals: users can read their own referral codes
DROP POLICY IF EXISTS referrals_owner_select ON referrals;
CREATE POLICY referrals_owner_select ON referrals
  FOR SELECT USING (referrer_id = auth.uid());

-- experiments: read-only for authenticated users (variant assignment)
DROP POLICY IF EXISTS experiments_read ON experiments;
CREATE POLICY experiments_read ON experiments
  FOR SELECT USING (auth.role() = 'authenticated');

-- ── Deletion helper function ─────────────────────────────────
-- Called by API route when parent requests account deletion.
-- Soft-deletes the account; nightly cron hard-deletes after 30d.

CREATE OR REPLACE FUNCTION soft_delete_account(account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- runs as service_role, not caller
AS $$
BEGIN
  -- Mark all children as deleted
  UPDATE children
  SET deleted_at = now()
  WHERE parent_id = account_id AND deleted_at IS NULL;

  -- Mark all books as deleted
  UPDATE books
  SET deleted_at = now()
  WHERE user_id = account_id AND deleted_at IS NULL;

  -- Mark profile as deleted
  UPDATE profiles
  SET deleted_at = now()
  WHERE id = account_id AND deleted_at IS NULL;
END;
$$;

-- ── Hard-delete function (called by nightly cron) ────────────
CREATE OR REPLACE FUNCTION hard_delete_expired_accounts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer := 0;
  account_record RECORD;
BEGIN
  FOR account_record IN
    SELECT id FROM profiles
    WHERE deleted_at IS NOT NULL
      AND deleted_at < now() - interval '30 days'
  LOOP
    -- Delete pages → books → stories → children → profile cascade
    DELETE FROM pages
    WHERE book_id IN (
      SELECT id FROM books WHERE user_id = account_record.id
    );

    DELETE FROM satisfaction_ratings
    WHERE user_id = account_record.id;

    -- Purge story text before deleting stories
    UPDATE stories
    SET raw_text = '[deleted]'
    WHERE user_id = account_record.id;

    DELETE FROM books
    WHERE user_id = account_record.id;

    DELETE FROM stories
    WHERE user_id = account_record.id;

    DELETE FROM children
    WHERE parent_id = account_record.id;

    DELETE FROM referrals
    WHERE referrer_id = account_record.id;

    DELETE FROM profiles
    WHERE id = account_record.id;

    deleted_count := deleted_count + 1;
  END LOOP;

  RETURN deleted_count;
END;
$$;

-- ── Story text purge function (90-day retention) ─────────────
CREATE OR REPLACE FUNCTION purge_expired_story_text()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  purged_count integer := 0;
BEGIN
  UPDATE stories s
  SET raw_text = '[deleted]'
  FROM books b
  WHERE s.id = b.story_id
    AND b.delivered_at IS NOT NULL
    AND b.delivered_at < now() - interval '90 days'
    AND s.raw_text != '[deleted]';

  GET DIAGNOSTICS purged_count = ROW_COUNT;
  RETURN purged_count;
END;
$$;

-- ── Schema migration record ───────────────────────────────────
INSERT INTO schema_migrations (version, description)
VALUES (
  'v0.2.0',
  'Guardrails: deleted_at columns, RLS policies, soft_delete_account(), hard_delete_expired_accounts(), purge_expired_story_text()'
)
ON CONFLICT (version) DO NOTHING;
