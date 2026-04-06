-- ============================================================
-- 016_notification_endpoints_table.sql
--
-- Idempotent creation and hardening of the notification_endpoints
-- table used by /settings/notifications and /api/notifications/*.
--
-- This migration is safe to run on both fresh and existing databases:
--   - Uses CREATE TABLE IF NOT EXISTS
--   - Uses ADD COLUMN IF NOT EXISTS for each additional column
--   - Converts org_id to nullable to support user-scoped endpoints
--     when an org context is not available (user_id / created_by path)
--   - Adds missing indexes
--   - Enables RLS (idempotent)
-- ============================================================

-- ─── Core table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_endpoints (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid        NULL,          -- nullable: org-scoped or user-scoped
  created_by   uuid        NULL,          -- user_id fallback when no org
  type         text        NOT NULL DEFAULT 'slack_webhook',
  kind         text        NOT NULL DEFAULT 'slack_webhook',
  name         text        NULL,          -- display label
  label        text        NULL,          -- alias for name
  url          text        NULL,          -- primary URL storage (never echoed)
  webhook_url  text        NULL,          -- legacy alias for url
  config       jsonb       NOT NULL DEFAULT '{}',
  is_active    boolean     NOT NULL DEFAULT true,
  last_used_at timestamptz NULL,
  last_test_at timestamptz NULL,
  last_test_status text    NULL CHECK (last_test_status IN ('ok', 'error')),
  last_error   text        NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ─── Ensure columns exist on pre-existing tables ──────────────────────────

-- org_id: make nullable if it was created NOT NULL
DO $$ BEGIN
  -- Make org_id nullable (safe even if already nullable)
  ALTER TABLE notification_endpoints ALTER COLUMN org_id DROP NOT NULL;
EXCEPTION WHEN others THEN NULL; END $$;

ALTER TABLE notification_endpoints ADD COLUMN IF NOT EXISTS created_by   uuid NULL;
ALTER TABLE notification_endpoints ADD COLUMN IF NOT EXISTS kind         text NOT NULL DEFAULT 'slack_webhook';
ALTER TABLE notification_endpoints ADD COLUMN IF NOT EXISTS label        text NULL;
ALTER TABLE notification_endpoints ADD COLUMN IF NOT EXISTS webhook_url  text NULL;
ALTER TABLE notification_endpoints ADD COLUMN IF NOT EXISTS last_used_at timestamptz NULL;
ALTER TABLE notification_endpoints ADD COLUMN IF NOT EXISTS last_test_at timestamptz NULL;
ALTER TABLE notification_endpoints ADD COLUMN IF NOT EXISTS last_test_status text NULL;
ALTER TABLE notification_endpoints ADD COLUMN IF NOT EXISTS last_error   text NULL;
ALTER TABLE notification_endpoints ADD COLUMN IF NOT EXISTS updated_at   timestamptz NOT NULL DEFAULT now();

-- Add CHECK constraint on last_test_status if not present
DO $$ BEGIN
  ALTER TABLE notification_endpoints
    ADD CONSTRAINT chk_ne_last_test_status
      CHECK (last_test_status IN ('ok', 'error'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ne_org_id      ON notification_endpoints (org_id)     WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ne_created_by  ON notification_endpoints (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ne_type        ON notification_endpoints (type);
CREATE INDEX IF NOT EXISTS idx_ne_kind        ON notification_endpoints (kind);
CREATE INDEX IF NOT EXISTS idx_ne_is_active   ON notification_endpoints (is_active);

-- ─── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE notification_endpoints ENABLE ROW LEVEL SECURITY;

-- Service-role bypass (mirrors other crr_ tables)
DO $$ BEGIN
  CREATE POLICY "ne_service_role_all"
    ON notification_endpoints
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Org-member SELECT
DO $$ BEGIN
  CREATE POLICY "notification_endpoints_select_own_org"
    ON notification_endpoints FOR SELECT
    USING (
      org_id IN (SELECT id FROM crr_orgs WHERE user_id = auth.uid())
      OR created_by = auth.uid()
      OR auth.role() = 'service_role'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Org-member INSERT
DO $$ BEGIN
  CREATE POLICY "notification_endpoints_insert_own_org"
    ON notification_endpoints FOR INSERT
    WITH CHECK (
      org_id IN (SELECT id FROM crr_orgs WHERE user_id = auth.uid())
      OR created_by = auth.uid()
      OR auth.role() = 'service_role'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Org-member UPDATE
DO $$ BEGIN
  CREATE POLICY "notification_endpoints_update_own_org"
    ON notification_endpoints FOR UPDATE
    USING (
      org_id IN (SELECT id FROM crr_orgs WHERE user_id = auth.uid())
      OR created_by = auth.uid()
      OR auth.role() = 'service_role'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Org-member DELETE
DO $$ BEGIN
  CREATE POLICY "notification_endpoints_delete_own_org"
    ON notification_endpoints FOR DELETE
    USING (
      org_id IN (SELECT id FROM crr_orgs WHERE user_id = auth.uid())
      OR created_by = auth.uid()
      OR auth.role() = 'service_role'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── updated_at trigger ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_notification_endpoints_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notification_endpoints_updated_at ON notification_endpoints;
CREATE TRIGGER trg_notification_endpoints_updated_at
  BEFORE UPDATE ON notification_endpoints
  FOR EACH ROW EXECUTE FUNCTION set_notification_endpoints_updated_at();
