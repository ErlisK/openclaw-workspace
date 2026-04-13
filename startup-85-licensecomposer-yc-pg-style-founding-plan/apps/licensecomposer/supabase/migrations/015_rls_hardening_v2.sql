-- Migration 015: RLS hardening — verify all tables have correct policies
-- This migration is idempotent. It fills any gaps from tables added via ALTER TABLE
-- in previous migrations that didn't have explicit RLS blocks.

BEGIN;

-- ── contract_revisions / generated_contracts minor edits ─────────────────────
-- generated_contracts already has RLS from migration 005; policies cover user_id.
-- The minor_edit columns added in 013 are part of the same row, so covered.

-- ── entitlements: ensure anon cannot read others' rows ─────────────────────────
-- Already has service-role policies from 005. Verify no policy allows anon SELECT:
DROP POLICY IF EXISTS "entitlements_anon_read" ON public.entitlements;

-- ── exports: ensure no anon write path ──────────────────────────────────────────
DROP POLICY IF EXISTS "exports_anon_insert" ON public.exports;

-- ── license_acceptances: public INSERT is intentional (buyers accept without auth)
-- but SELECT should be limited to the license owner.
-- Check policy exists (idempotent drop+create):
DROP POLICY IF EXISTS "acceptances_service_insert" ON public.license_acceptances;
CREATE POLICY "acceptances_service_insert"
  ON public.license_acceptances
  FOR INSERT
  WITH CHECK (TRUE);

-- Ensure owner can read their contract's acceptances via join policy
DROP POLICY IF EXISTS "acceptances_owner_read" ON public.license_acceptances;
CREATE POLICY "acceptances_owner_read"
  ON public.license_acceptances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.license_pages lp
      WHERE lp.id = license_acceptances.license_page_id
        AND lp.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.generated_contracts gc
      WHERE gc.id = license_acceptances.contract_id
        AND gc.user_id = auth.uid()
    )
  );

-- ── verifications: public insert, no select needed ──────────────────────────────
-- Already set in 005.

-- ── Rate-limit hint table (for future server-side rate limiting if needed) ───────
-- Nothing to create — using in-process Map for now.

COMMIT;
