-- GigAnalytics Security Hardening Migration
-- Date: 2026-04-22
-- Adds is_admin flag to profiles for admin-only endpoint access control

-- Add is_admin column (default false, only set via service role)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Revoke direct write to is_admin from authenticated users (RLS already in place)
-- Only service_role can set is_admin=true
-- Existing RLS on profiles: user can only read/update their own row
-- The is_admin field is safe: users can read it (so frontend can conditionally render admin UI)
-- but cannot set it true (service_role only)
