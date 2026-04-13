-- Migration 009: Add AI assist columns to generated_contracts
-- ai_plain_text: AI-generated plain-English summary (cached)
-- ai_simplified_at: when the AI summary was generated
-- ai_disabled: user preference to disable AI features for this contract

BEGIN;

ALTER TABLE generated_contracts
  ADD COLUMN IF NOT EXISTS ai_plain_text text,
  ADD COLUMN IF NOT EXISTS ai_simplified_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS ai_disabled boolean NOT NULL DEFAULT false;

-- Index for looking up contracts where AI has already been run
CREATE INDEX IF NOT EXISTS idx_generated_contracts_ai_simplified
  ON generated_contracts(document_id) WHERE ai_plain_text IS NOT NULL;

COMMIT;
