-- ============================================================
-- 014_notification_test_tracking.sql
-- Adds test-send tracking columns to crr_notification_channels:
--   last_test_at         — timestamp of the most recent test send
--   last_test_status     — 'ok' | 'error' | null
-- These columns are set by POST /api/notification-endpoints/[id]/test-send
-- and returned (masked-safe, non-sensitive) via GET /api/notification-endpoints.
-- ============================================================

ALTER TABLE crr_notification_channels
  ADD COLUMN IF NOT EXISTS last_test_at     timestamptz,
  ADD COLUMN IF NOT EXISTS last_test_status text
    CHECK (last_test_status IN ('ok', 'error'));
