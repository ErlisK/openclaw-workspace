-- Migration 007: Demo mode + privacy mode
-- Applied: 2025-04-05

-- 1. Privacy mode column on crr_orgs (enabled by default)
ALTER TABLE crr_orgs
  ADD COLUMN IF NOT EXISTS privacy_mode   boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_demo        boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_tenant_id text;

-- Enable privacy mode for all existing orgs by default
UPDATE crr_orgs SET privacy_mode = true WHERE privacy_mode IS NULL;

-- 2. Synthetic data flags on crr_org_alerts
ALTER TABLE crr_org_alerts
  ADD COLUMN IF NOT EXISTS privacy_redacted   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_synthetic       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS synthetic_scenario text;

-- 3. Demo session tracking (for analytics on demo engagement)
CREATE TABLE IF NOT EXISTS crr_demo_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   text NOT NULL,
  session_key text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at  timestamptz NOT NULL DEFAULT now(),
  last_seen   timestamptz NOT NULL DEFAULT now(),
  events      integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_demo_sessions_tenant ON crr_demo_sessions (tenant_id, created_at DESC);

ALTER TABLE crr_demo_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "demo_sessions_anon_all" ON crr_demo_sessions FOR ALL USING (true);

-- 4. View: privacy redaction coverage stats
CREATE OR REPLACE VIEW v_privacy_coverage AS
SELECT
  o.id AS org_id,
  o.name AS org_name,
  o.privacy_mode,
  COUNT(a.id) AS total_alerts,
  COUNT(a.id) FILTER (WHERE a.privacy_redacted = true) AS redacted_alerts,
  COUNT(a.id) FILTER (WHERE a.is_synthetic = true) AS synthetic_alerts
FROM crr_orgs o
LEFT JOIN crr_org_alerts a ON a.org_id = o.id
GROUP BY o.id, o.name, o.privacy_mode;

-- 5. Demo tenants index (for fast tenant lookup)
CREATE INDEX IF NOT EXISTS idx_orgs_is_demo ON crr_orgs (is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_orgs_demo_tenant ON crr_orgs (demo_tenant_id) WHERE demo_tenant_id IS NOT NULL;
