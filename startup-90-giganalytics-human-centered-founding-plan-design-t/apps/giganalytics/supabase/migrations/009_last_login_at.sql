-- Migration 009: Add last_login_at for churn tracking
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Index for efficient churn queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_login_at ON profiles(last_login_at);
