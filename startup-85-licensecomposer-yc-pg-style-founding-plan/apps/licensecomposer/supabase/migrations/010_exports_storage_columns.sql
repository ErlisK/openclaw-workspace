-- Migration 010: Add storage_path column to exports
-- Also ensure contract_id is indexed for fast per-contract export listing

BEGIN;

ALTER TABLE exports
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS storage_bucket text DEFAULT 'exports',
  ADD COLUMN IF NOT EXISTS signed_url text,
  ADD COLUMN IF NOT EXISTS signed_url_expires_at timestamp with time zone;

-- Index for contract-scoped export listing
CREATE INDEX IF NOT EXISTS idx_exports_contract_id
  ON exports(contract_id, generated_at DESC);

-- Index for user export listing
CREATE INDEX IF NOT EXISTS idx_exports_user_id
  ON exports(user_id, generated_at DESC);

COMMIT;
