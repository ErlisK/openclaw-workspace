-- ============================================================
-- 015_notification_endpoints_rls.sql
--
-- Adds org-member scoped RLS policies to notification_endpoints
-- and an updated_at trigger. Mirrors the pattern used on
-- crr_notification_channels and all other org-scoped tables:
--   org_id IN (SELECT id FROM crr_orgs WHERE user_id = auth.uid())
--   OR auth.role() = 'service_role'
-- ============================================================

-- ─── RLS policies (using DO block for idempotency) ──────────────────────────

DO $$ BEGIN

  -- SELECT: org members can read their org's endpoints
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notification_endpoints'
      AND policyname = 'notification_endpoints_select_own_org'
  ) THEN
    CREATE POLICY "notification_endpoints_select_own_org"
      ON notification_endpoints FOR SELECT
      USING (
        org_id IN (SELECT id FROM crr_orgs WHERE user_id = auth.uid())
        OR auth.role() = 'service_role'
      );
  END IF;

  -- INSERT: org members can insert endpoints for their org
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notification_endpoints'
      AND policyname = 'notification_endpoints_insert_own_org'
  ) THEN
    CREATE POLICY "notification_endpoints_insert_own_org"
      ON notification_endpoints FOR INSERT
      WITH CHECK (
        org_id IN (SELECT id FROM crr_orgs WHERE user_id = auth.uid())
        OR auth.role() = 'service_role'
      );
  END IF;

  -- UPDATE: org members can update their org's endpoints
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notification_endpoints'
      AND policyname = 'notification_endpoints_update_own_org'
  ) THEN
    CREATE POLICY "notification_endpoints_update_own_org"
      ON notification_endpoints FOR UPDATE
      USING (
        org_id IN (SELECT id FROM crr_orgs WHERE user_id = auth.uid())
        OR auth.role() = 'service_role'
      );
  END IF;

  -- DELETE: org members can delete their org's endpoints
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notification_endpoints'
      AND policyname = 'notification_endpoints_delete_own_org'
  ) THEN
    CREATE POLICY "notification_endpoints_delete_own_org"
      ON notification_endpoints FOR DELETE
      USING (
        org_id IN (SELECT id FROM crr_orgs WHERE user_id = auth.uid())
        OR auth.role() = 'service_role'
      );
  END IF;

END $$;

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
