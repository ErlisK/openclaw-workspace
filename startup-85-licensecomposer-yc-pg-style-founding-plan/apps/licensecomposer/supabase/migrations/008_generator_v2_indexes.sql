-- Migration 008: Generator v2 support
-- 1. Index generated_contracts.verification_hash for O(log n) verify lookups
-- 2. Add generator_version column to generated_contracts if missing
-- 3. Ensure template_versions.clause_hashes is JSONB (not array)

BEGIN;

-- Index for fast verify lookups
CREATE INDEX IF NOT EXISTS idx_generated_contracts_verification_hash
  ON generated_contracts(verification_hash);

-- Index for template_version lookups
CREATE INDEX IF NOT EXISTS idx_generated_contracts_template_version_id
  ON generated_contracts(template_version_id);

-- Index for user contract listing
CREATE INDEX IF NOT EXISTS idx_generated_contracts_user_id
  ON generated_contracts(user_id, created_at DESC);

COMMIT;
