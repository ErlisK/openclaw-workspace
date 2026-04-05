-- Migration 011: RBAC (org member roles) + SSO (Google OAuth tracking) + data diagram metadata
-- ────────────────────────────────────────────────────────────────────────────

-- ── 1. crr_org_members ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crr_org_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES crr_orgs(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email           text NOT NULL,
  role            text NOT NULL DEFAULT 'viewer'
                    CHECK (role IN ('owner','admin','viewer')),
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','active','revoked')),
  invited_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at      timestamptz DEFAULT NOW(),
  accepted_at     timestamptz,
  last_active_at  timestamptz,
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_org_email
  ON crr_org_members(org_id, email);

CREATE INDEX IF NOT EXISTS idx_org_members_user
  ON crr_org_members(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_org_members_org_role
  ON crr_org_members(org_id, role);

-- ── 2. RLS on crr_org_members ─────────────────────────────────────────────────
ALTER TABLE crr_org_members ENABLE ROW LEVEL SECURITY;

-- Org owners and admins can see all members
CREATE POLICY "members_select_own_org"
  ON crr_org_members FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR org_id IN (
      SELECT id FROM crr_orgs WHERE user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- Only org owner can insert/update/delete members
CREATE POLICY "members_manage_owner"
  ON crr_org_members FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── 3. Seed existing alpha orgs with owner rows ───────────────────────────────
-- Alpha orgs have no Supabase user_id yet — seed with email only (status=active/owner)
INSERT INTO crr_org_members (org_id, email, role, status, accepted_at)
SELECT o.id, o.email, 'owner', 'active', o.created_at
FROM crr_orgs o
WHERE o.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM crr_org_members m WHERE m.org_id = o.id AND m.email = o.email
  )
ON CONFLICT (org_id, email) DO NOTHING;

-- ── 4. SSO tracking: add sso_provider + sso_sub columns to crr_orgs ──────────
ALTER TABLE crr_orgs
  ADD COLUMN IF NOT EXISTS sso_provider  text,   -- 'google', 'github', 'email', 'magic_link'
  ADD COLUMN IF NOT EXISTS sso_sub       text,   -- provider subject ID
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- ── 5. Permission log for RBAC audit ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crr_rbac_audit (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid REFERENCES crr_orgs(id) ON DELETE CASCADE,
  actor_id    uuid,        -- user performing the action
  actor_email text,
  action      text NOT NULL, -- 'invite', 'accept', 'role_change', 'revoke', 'access_check'
  target_email text,
  target_role text,
  result      text NOT NULL DEFAULT 'allowed',  -- 'allowed', 'denied'
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rbac_audit_org  ON crr_rbac_audit(org_id);
CREATE INDEX IF NOT EXISTS idx_rbac_audit_actor ON crr_rbac_audit(actor_id);

ALTER TABLE crr_rbac_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rbac_audit_service_all"
  ON crr_rbac_audit FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "rbac_audit_org_select"
  ON crr_rbac_audit FOR SELECT
  USING (org_id IN (SELECT id FROM crr_orgs WHERE user_id = auth.uid()));

-- ── 6. Helper views ───────────────────────────────────────────────────────────

-- v_org_team: join members with org info
CREATE OR REPLACE VIEW v_org_team AS
SELECT
  m.id,
  m.org_id,
  o.slug  AS org_slug,
  o.name  AS org_name,
  m.email,
  m.role,
  m.status,
  m.invited_at,
  m.accepted_at,
  m.last_active_at,
  u.email AS auth_email,
  o.user_id AS org_owner_id
FROM crr_org_members m
JOIN crr_orgs o ON o.id = m.org_id
LEFT JOIN auth.users u ON u.id = m.user_id;

-- v_sso_stats: SSO adoption summary
CREATE OR REPLACE VIEW v_sso_stats AS
SELECT
  COALESCE(sso_provider, 'none') AS provider,
  COUNT(*) AS org_count
FROM crr_orgs
GROUP BY sso_provider;
