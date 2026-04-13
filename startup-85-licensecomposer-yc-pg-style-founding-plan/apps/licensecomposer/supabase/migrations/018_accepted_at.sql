-- 018_accepted_at.sql
-- Add accepted_at column to generated_contracts for per-contract disclaimer tracking.
-- This timestamp is also logged via audit_logs (event='disclaimer_accepted').

ALTER TABLE public.generated_contracts
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

COMMENT ON COLUMN public.generated_contracts.accepted_at IS
  'Timestamp when user accepted the disclaimer for this contract. Also logged in audit_logs.';
