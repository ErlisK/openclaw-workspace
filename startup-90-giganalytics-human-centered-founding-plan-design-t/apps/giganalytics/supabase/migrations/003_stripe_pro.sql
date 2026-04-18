-- Migration 003: Stripe Pro subscription tracking
-- Adds subscriptions table + user_tier to profiles

-- 1. Add tier to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free'
    CHECK (tier IN ('free', 'pro'));

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- 2. Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id   TEXT NOT NULL,
  status               TEXT NOT NULL,   -- active, canceled, past_due, trialing, ...
  price_id             TEXT NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_sub_id_idx ON subscriptions(stripe_subscription_id);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscriptions
CREATE POLICY "users_read_own_subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can write (webhook updates)
CREATE POLICY "service_role_write_subscriptions"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- Grant to authenticated
GRANT SELECT ON subscriptions TO authenticated;

-- 3. Helper function: upsert subscription + sync tier on profiles
CREATE OR REPLACE FUNCTION upsert_subscription(
  p_user_id              UUID,
  p_sub_id               TEXT,
  p_customer_id          TEXT,
  p_status               TEXT,
  p_price_id             TEXT,
  p_period_start         TIMESTAMPTZ DEFAULT NULL,
  p_period_end           TIMESTAMPTZ DEFAULT NULL,
  p_cancel_at_period_end BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier TEXT;
BEGIN
  -- Upsert subscription row
  INSERT INTO subscriptions (
    user_id, stripe_subscription_id, stripe_customer_id,
    status, price_id, current_period_start, current_period_end,
    cancel_at_period_end, updated_at
  ) VALUES (
    p_user_id, p_sub_id, p_customer_id,
    p_status, p_price_id, p_period_start, p_period_end,
    p_cancel_at_period_end, now()
  )
  ON CONFLICT (stripe_subscription_id) DO UPDATE SET
    status               = EXCLUDED.status,
    price_id             = EXCLUDED.price_id,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end   = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    updated_at           = now();

  -- Derive tier from subscription status
  v_tier := CASE
    WHEN p_status IN ('active', 'trialing') THEN 'pro'
    ELSE 'free'
  END;

  -- Update profile tier + customer id
  UPDATE profiles
  SET
    tier               = v_tier,
    stripe_customer_id = p_customer_id,
    updated_at         = now()
  WHERE id = p_user_id;
END;
$$;
