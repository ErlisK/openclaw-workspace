-- Migration: 005_rls_hardening.sql
-- Comprehensive RLS hardening:
--   1. Add vetting_status to templates + update public-read policy
--   2. Row ownership: generated_contracts, exports, license_pages
--   3. Protected writes: purchases, entitlements (service role only)
--   4. Enable + configure RLS on license_acceptances
--   5. Tighten all policies with explicit UPDATE/DELETE rules
--   6. Helper function: is_service_role()

-- =========================================================
-- 1. HELPER — is_service_role()
--    Returns TRUE when called from a server-side context
--    using the service_role JWT (no auth.uid()).
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS BOOLEAN AS $$
BEGIN
  -- auth.role() returns 'service_role' for service key, 'authenticated' for user JWTs
  RETURN current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role';
EXCEPTION
  WHEN others THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =========================================================
-- 2. TEMPLATES — add vetting_status, update public policy
-- =========================================================
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS vetting_status TEXT NOT NULL DEFAULT 'draft';
  -- 'draft' | 'under_review' | 'published' | 'deprecated' | 'rejected'

-- Add check constraint for valid values
ALTER TABLE public.templates
  DROP CONSTRAINT IF EXISTS templates_vetting_status_check;
ALTER TABLE public.templates
  ADD CONSTRAINT templates_vetting_status_check
  CHECK (vetting_status IN ('draft', 'under_review', 'published', 'deprecated', 'rejected'));

-- Backfill: existing active templates become 'published'
UPDATE public.templates
SET vetting_status = 'published'
WHERE is_active = TRUE AND vetting_status = 'draft';

-- Index for vetting_status filter
CREATE INDEX IF NOT EXISTS idx_templates_vetting_status ON public.templates (vetting_status);

-- Drop old broad template read policy and replace with vetting-gated one
DROP POLICY IF EXISTS "templates_public"     ON public.templates;
DROP POLICY IF EXISTS "templates_public_read" ON public.templates;

-- Anon/authenticated: only see published, active templates
CREATE POLICY "templates_published_read"
  ON public.templates FOR SELECT
  USING (vetting_status = 'published' AND is_active = TRUE);

-- Service role can see all (for admin + seed scripts)
CREATE POLICY "templates_service_all"
  ON public.templates FOR ALL
  USING (public.is_service_role());

-- =========================================================
-- 3. GENERATED_CONTRACTS — row ownership hardening
-- =========================================================

-- Drop existing loose policies
DROP POLICY IF EXISTS "contracts_owner_all"   ON public.generated_contracts;
DROP POLICY IF EXISTS "contracts_public_read" ON public.generated_contracts;

-- Owner: full CRUD on their own rows
CREATE POLICY "contracts_owner_select"
  ON public.generated_contracts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "contracts_owner_insert"
  ON public.generated_contracts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contracts_owner_update"
  ON public.generated_contracts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contracts_owner_delete"
  ON public.generated_contracts FOR DELETE
  USING (auth.uid() = user_id);

-- Public read: only when linked license_page is public + active
-- (buyer verifying a contract they received)
CREATE POLICY "contracts_public_read"
  ON public.generated_contracts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.license_pages lp
      WHERE lp.contract_id = id
        AND lp.is_public   = TRUE
        AND lp.is_active   = TRUE
    )
  );

-- Service role bypass (webhooks, migrations, admin)
CREATE POLICY "contracts_service_all"
  ON public.generated_contracts FOR ALL
  USING (public.is_service_role());

-- =========================================================
-- 4. EXPORTS — row ownership hardening
-- =========================================================

DROP POLICY IF EXISTS "exports_owner_all" ON public.exports;

CREATE POLICY "exports_owner_select"
  ON public.exports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "exports_owner_insert"
  ON public.exports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Exports are immutable once created — no UPDATE by end users
-- DELETE allowed (user purging export history)
CREATE POLICY "exports_owner_delete"
  ON public.exports FOR DELETE
  USING (auth.uid() = user_id);

-- Service role full access (background export jobs)
CREATE POLICY "exports_service_all"
  ON public.exports FOR ALL
  USING (public.is_service_role());

-- =========================================================
-- 5. LICENSE_PAGES — row ownership hardening
-- =========================================================

DROP POLICY IF EXISTS "license_pages_owner_all"   ON public.license_pages;
DROP POLICY IF EXISTS "license_pages_public_read" ON public.license_pages;

-- Owner: full CRUD
CREATE POLICY "license_pages_owner_select"
  ON public.license_pages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "license_pages_owner_insert"
  ON public.license_pages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "license_pages_owner_update"
  ON public.license_pages FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "license_pages_owner_delete"
  ON public.license_pages FOR DELETE
  USING (auth.uid() = user_id);

-- Public read: is_public = TRUE and is_active = TRUE
-- (buyers viewing the license page for a product they purchased)
CREATE POLICY "license_pages_public_read"
  ON public.license_pages FOR SELECT
  USING (is_public = TRUE AND is_active = TRUE);

-- Service role bypass
CREATE POLICY "license_pages_service_all"
  ON public.license_pages FOR ALL
  USING (public.is_service_role());

-- =========================================================
-- 6. PURCHASES — protected write (service role only)
--    Rationale: purchases are created by the Stripe webhook
--    handler (server-side, service key). Users MUST NOT be
--    able to self-insert purchase rows.
-- =========================================================

DROP POLICY IF EXISTS "purchases_user_insert" ON public.purchases;
DROP POLICY IF EXISTS "purchases_user_read"   ON public.purchases;

-- Users can only read their own purchases
CREATE POLICY "purchases_owner_select"
  ON public.purchases FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE: service role only (webhook handler)
CREATE POLICY "purchases_service_write"
  ON public.purchases FOR INSERT
  WITH CHECK (public.is_service_role());

CREATE POLICY "purchases_service_update"
  ON public.purchases FOR UPDATE
  USING  (public.is_service_role())
  WITH CHECK (public.is_service_role());

CREATE POLICY "purchases_service_delete"
  ON public.purchases FOR DELETE
  USING (public.is_service_role());

-- =========================================================
-- 7. ENTITLEMENTS — protected write (service role only)
--    Rationale: entitlements are granted by subscription
--    events and purchase webhooks. Users must not be able
--    to self-insert or modify their own entitlements.
-- =========================================================

DROP POLICY IF EXISTS "entitlements_owner_read" ON public.entitlements;

-- Users can only read their own entitlements
CREATE POLICY "entitlements_owner_select"
  ON public.entitlements FOR SELECT
  USING (auth.uid() = user_id);

-- Service role only for all writes
CREATE POLICY "entitlements_service_insert"
  ON public.entitlements FOR INSERT
  WITH CHECK (public.is_service_role());

CREATE POLICY "entitlements_service_update"
  ON public.entitlements FOR UPDATE
  USING  (public.is_service_role())
  WITH CHECK (public.is_service_role());

CREATE POLICY "entitlements_service_delete"
  ON public.entitlements FOR DELETE
  USING (public.is_service_role());

-- =========================================================
-- 8. SUBSCRIPTIONS — tighten write policies
--    Users should not be able to self-insert subscriptions
--    (they're created by the Stripe webhook handler).
-- =========================================================

DROP POLICY IF EXISTS "subscriptions_user_insert" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_user_read"   ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_user_update" ON public.subscriptions;

-- Owner read
CREATE POLICY "subscriptions_owner_select"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role writes only
CREATE POLICY "subscriptions_service_write"
  ON public.subscriptions FOR INSERT
  WITH CHECK (public.is_service_role());

CREATE POLICY "subscriptions_service_update"
  ON public.subscriptions FOR UPDATE
  USING  (public.is_service_role())
  WITH CHECK (public.is_service_role());

CREATE POLICY "subscriptions_service_delete"
  ON public.subscriptions FOR DELETE
  USING (public.is_service_role());

-- =========================================================
-- 9. LICENSE_ACCEPTANCES — enable RLS + define policies
--    (RLS was not enabled on this table in prior migrations)
-- =========================================================

ALTER TABLE public.license_acceptances ENABLE ROW LEVEL SECURITY;

-- Drop any accidental pre-existing policies
DROP POLICY IF EXISTS "la_insert" ON public.license_acceptances;
DROP POLICY IF EXISTS "la_read"   ON public.license_acceptances;

-- Buyers: INSERT their own acceptance (anonymous OK — they just need the token)
-- No auth.uid() required so a buyer without an account can accept
CREATE POLICY "acceptances_buyer_insert"
  ON public.license_acceptances FOR INSERT
  WITH CHECK (TRUE);

-- License owner: read all acceptances for their contracts
CREATE POLICY "acceptances_owner_select"
  ON public.license_acceptances FOR SELECT
  USING (
    -- User owns the generated_license that this acceptance is for
    EXISTS (
      SELECT 1 FROM public.generated_licenses gl
      WHERE gl.id = license_id
        AND gl.user_id = auth.uid()
    )
    OR
    -- User owns the generated_contract linked via generated_licenses
    EXISTS (
      SELECT 1 FROM public.generated_licenses gl
      JOIN public.generated_contracts gc ON gc.license_id = gl.id
      WHERE gl.id = license_id
        AND gc.user_id = auth.uid()
    )
  );

-- Service role full access
CREATE POLICY "acceptances_service_all"
  ON public.license_acceptances FOR ALL
  USING (public.is_service_role());

-- =========================================================
-- 10. CHECKOUTS — tighten (user can insert their own,
--     but only service role can update/delete)
-- =========================================================

DROP POLICY IF EXISTS "checkouts_user_insert" ON public.checkouts;
DROP POLICY IF EXISTS "checkouts_user_read"   ON public.checkouts;

CREATE POLICY "checkouts_owner_select"
  ON public.checkouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "checkouts_owner_insert"
  ON public.checkouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only service role (webhook) can update checkout status
CREATE POLICY "checkouts_service_update"
  ON public.checkouts FOR UPDATE
  USING  (public.is_service_role())
  WITH CHECK (public.is_service_role());

CREATE POLICY "checkouts_service_delete"
  ON public.checkouts FOR DELETE
  USING (public.is_service_role());

-- =========================================================
-- 11. AUDIT_LOGS — tighten
--     System inserts must carry the correct user_id.
--     Service role can read all (admin observability).
-- =========================================================

DROP POLICY IF EXISTS "audit_logs_system_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_owner_read"    ON public.audit_logs;

-- Users read only their own audit events
CREATE POLICY "audit_logs_owner_select"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: authenticated users (triggers run as SECURITY DEFINER so this is safe)
-- and service role (for system-level events with NULL user_id)
CREATE POLICY "audit_logs_insert"
  ON public.audit_logs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR user_id IS NULL
    OR public.is_service_role()
  );

-- Service role can read everything (admin queries)
CREATE POLICY "audit_logs_service_select"
  ON public.audit_logs FOR SELECT
  USING (public.is_service_role());

-- =========================================================
-- 12. GENERATED_LICENSES — tighten (add explicit UPDATE scope)
-- =========================================================

DROP POLICY IF EXISTS "licenses_user_update" ON public.generated_licenses;

-- Owners can update only metadata fields, not legal_text (enforced app-side)
-- and only their own rows
CREATE POLICY "licenses_owner_update"
  ON public.generated_licenses FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role full access
DROP POLICY IF EXISTS "licenses_service_all" ON public.generated_licenses;
CREATE POLICY "licenses_service_all"
  ON public.generated_licenses FOR ALL
  USING (public.is_service_role());

-- =========================================================
-- VERIFICATION QUERIES (run inline to confirm)
-- =========================================================

-- Confirm vetting_status backfill
DO $$
DECLARE
  v_published INTEGER;
  v_draft     INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_published FROM public.templates WHERE vetting_status = 'published';
  SELECT COUNT(*) INTO v_draft     FROM public.templates WHERE vetting_status = 'draft';
  RAISE NOTICE 'templates: published=%, draft=%', v_published, v_draft;
END $$;

-- Confirm license_acceptances RLS enabled
DO $$
DECLARE
  v_rls BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO v_rls
  FROM pg_class
  WHERE relnamespace = 'public'::regnamespace
    AND relname = 'license_acceptances';
  IF v_rls THEN
    RAISE NOTICE 'license_acceptances RLS: ENABLED ✓';
  ELSE
    RAISE EXCEPTION 'license_acceptances RLS is NOT enabled';
  END IF;
END $$;

-- =========================================================
-- 13. PROFILES — tighten public_read (was USING true → all rows)
--     Anon users must not be able to enumerate profiles.
--     Authenticated users can read any profile (bylines).
-- =========================================================
DROP POLICY IF EXISTS "profiles_public_read"     ON public.profiles;
DROP POLICY IF EXISTS "profiles_service_all"     ON public.profiles;

CREATE POLICY "profiles_authenticated_read"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "profiles_service_all"
  ON public.profiles FOR ALL
  USING (public.is_service_role());

-- =========================================================
-- 14. GENERATED_LICENSES — tighten public view
--     Old policy: is_public=TRUE AND is_active=TRUE (direct API scraping possible)
--     New policy: also requires a public license_page to exist
-- =========================================================
DROP POLICY IF EXISTS "licenses_public_view"     ON public.generated_licenses;
DROP POLICY IF EXISTS "licenses_public_read"     ON public.generated_licenses;

CREATE POLICY "licenses_public_via_page"
  ON public.generated_licenses FOR SELECT
  USING (
    is_public = TRUE
    AND is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM public.license_pages lp
      WHERE lp.license_id = id
        AND lp.is_public  = TRUE
        AND lp.is_active  = TRUE
    )
  );
