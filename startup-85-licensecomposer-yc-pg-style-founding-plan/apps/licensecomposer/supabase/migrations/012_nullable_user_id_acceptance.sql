-- Migration 012: Make license_pages.user_id, license_acceptances.user_id, and license_acceptances.license_id nullable
-- Needed for anonymous contract access and flexible acceptance recording

BEGIN;

ALTER TABLE license_pages
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE license_acceptances
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN license_id DROP NOT NULL;

COMMIT;
