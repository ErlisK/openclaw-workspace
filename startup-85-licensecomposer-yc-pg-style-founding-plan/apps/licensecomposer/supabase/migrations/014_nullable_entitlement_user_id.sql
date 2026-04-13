-- Migration 014: Make user_id nullable in entitlements and subscriptions
-- (needed for webhook-granted entitlements where user lookup may lag)

BEGIN;

ALTER TABLE entitlements ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE subscriptions ALTER COLUMN user_id DROP NOT NULL;

-- Index for fast entitlement lookups
CREATE INDEX IF NOT EXISTS idx_entitlements_user_type
  ON entitlements(user_id, entitlement_type, is_active);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user
  ON subscriptions(user_id, status);

COMMIT;
