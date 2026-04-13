-- Migration 013: Add minor edit / re-versioning columns to generated_contracts

BEGIN;

ALTER TABLE generated_contracts
  ADD COLUMN IF NOT EXISTS minor_edit_note text,
  ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS parent_document_id text;

CREATE INDEX IF NOT EXISTS idx_contracts_user_template
  ON generated_contracts(user_id, template_slug, created_at DESC);

COMMIT;
