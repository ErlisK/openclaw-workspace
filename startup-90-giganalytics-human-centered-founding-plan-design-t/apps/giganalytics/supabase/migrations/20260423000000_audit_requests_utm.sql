-- Migration: Add UTM attribution columns to audit_requests table
-- Enables tracking which ad campaigns drive free audit conversions

ALTER TABLE audit_requests
  ADD COLUMN IF NOT EXISTS utm_source   TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium   TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content  TEXT,
  ADD COLUMN IF NOT EXISTS utm_term     TEXT,
  ADD COLUMN IF NOT EXISTS referrer     TEXT;

-- Index for campaign-level funnel reporting
CREATE INDEX IF NOT EXISTS audit_requests_utm_source_idx
  ON audit_requests (utm_source, created_at)
  WHERE utm_source IS NOT NULL;
