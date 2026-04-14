-- Migration: Credits system + Stripe integration
-- Adds credit_transactions table, credit columns to profiles,
-- and RLS policies for credit operations.

-- ─── 1. Ensure profiles table has credit columns ───────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS credits_balance INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credits_held INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- ─── 2. credit_transactions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_transactions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount                  INTEGER NOT NULL,           -- positive = credit, negative = debit
  balance_after           INTEGER NOT NULL DEFAULT 0,
  kind                    TEXT NOT NULL CHECK (kind IN ('purchase','job_hold','job_spend','job_release','refund','bonus','adjustment')),
  description             TEXT,
  job_id                  UUID REFERENCES test_jobs(id) ON DELETE SET NULL,
  stripe_checkout_id      TEXT,
  stripe_payment_intent   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS credit_transactions_user_id_idx ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS credit_transactions_job_id_idx ON credit_transactions(job_id);
CREATE INDEX IF NOT EXISTS credit_transactions_created_at_idx ON credit_transactions(created_at DESC);

-- ─── 3. RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own transactions
CREATE POLICY "credit_transactions_select_own"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert (all mutations go through API with admin client)
CREATE POLICY "credit_transactions_insert_service"
  ON credit_transactions FOR INSERT
  WITH CHECK (FALSE); -- block direct anon/user inserts; service role bypasses RLS

-- ─── 4. Helper function: get_credit_balance ─────────────────────────────────
CREATE OR REPLACE FUNCTION get_credit_balance(p_user_id UUID)
RETURNS TABLE(balance INTEGER, held INTEGER, available INTEGER)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    COALESCE(credits_balance, 0) AS balance,
    COALESCE(credits_held, 0) AS held,
    COALESCE(credits_balance, 0) - COALESCE(credits_held, 0) AS available
  FROM profiles
  WHERE id = p_user_id;
$$;
