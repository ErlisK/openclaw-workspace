-- ═══════════════════════════════════════════════════════════════════
-- Migration: 003_scheduling_and_pii
-- Description: Scheduling support (availability, email_log columns),
--              PII hashing (hashed_email columns + triggers),
--              designer consent gate (designer_profiles)
-- ═══════════════════════════════════════════════════════════════════

-- ── Email log enhancements ────────────────────────────────────────────
ALTER TABLE email_log ADD COLUMN IF NOT EXISTS hashed_email text;

-- ── Signup tracking columns ───────────────────────────────────────────
ALTER TABLE session_signups ADD COLUMN IF NOT EXISTS hashed_email text;
ALTER TABLE session_signups ADD COLUMN IF NOT EXISTS calendar_link_sent boolean DEFAULT false;
ALTER TABLE session_signups ADD COLUMN IF NOT EXISTS last_confirmation_sent_at timestamptz;
ALTER TABLE session_signups ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;
ALTER TABLE session_signups ADD COLUMN IF NOT EXISTS last_post_session_sent_at timestamptz;

-- ── Tester availability ───────────────────────────────────────────────
ALTER TABLE tester_availability ADD COLUMN IF NOT EXISTS hashed_email text;
CREATE INDEX IF NOT EXISTS idx_session_signups_hashed_email ON session_signups(hashed_email);
CREATE INDEX IF NOT EXISTS idx_tester_availability_hashed_email ON tester_availability(hashed_email);

-- ── PII hash function ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION hash_pii_email(email text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT 'ptf_' || encode(digest(lower(trim(email)) || 'ptf-pii-salt-2025', 'sha256'), 'hex')
$$;

-- ── Auto-hash triggers ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_hash_signup_email() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tester_email IS NOT NULL THEN NEW.hashed_email := hash_pii_email(NEW.tester_email); END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS hash_signup_email ON session_signups;
CREATE TRIGGER hash_signup_email
BEFORE INSERT OR UPDATE OF tester_email ON session_signups
FOR EACH ROW EXECUTE FUNCTION trg_hash_signup_email();

CREATE OR REPLACE FUNCTION trg_hash_emaillog_email() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tester_email IS NOT NULL THEN NEW.hashed_email := hash_pii_email(NEW.tester_email); END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS hash_emaillog_email ON email_log;
CREATE TRIGGER hash_emaillog_email
BEFORE INSERT OR UPDATE OF tester_email ON email_log
FOR EACH ROW EXECUTE FUNCTION trg_hash_emaillog_email();

-- ── Backfill existing rows ────────────────────────────────────────────
UPDATE session_signups SET hashed_email = hash_pii_email(tester_email) WHERE tester_email IS NOT NULL AND hashed_email IS NULL;
UPDATE email_log SET hashed_email = hash_pii_email(tester_email) WHERE tester_email IS NOT NULL AND hashed_email IS NULL;
UPDATE tester_availability SET hashed_email = hash_pii_email(tester_email) WHERE tester_email IS NOT NULL AND hashed_email IS NULL;

-- ── Designer profiles (TOS/PII consent) ──────────────────────────────
CREATE TABLE IF NOT EXISTS designer_profiles (
  id                      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tos_accepted_at         timestamptz,
  tos_version             text DEFAULT '1.0',
  pii_consent_accepted_at timestamptz,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);
ALTER TABLE designer_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS designer_own_profile ON designer_profiles
  FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());
