-- Migration 011: Add ip_address, contract_id, license_page_id to license_acceptances
-- Add document_id columns to license_pages for easy contract linking

BEGIN;

ALTER TABLE license_acceptances
  ADD COLUMN IF NOT EXISTS ip_address inet,
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES generated_contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS license_page_id uuid REFERENCES license_pages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_license_acceptances_contract ON license_acceptances(contract_id);
CREATE INDEX IF NOT EXISTS idx_license_acceptances_page ON license_acceptances(license_page_id);
CREATE INDEX IF NOT EXISTS idx_license_acceptances_email ON license_acceptances(accepter_email);

ALTER TABLE license_pages
  ADD COLUMN IF NOT EXISTS document_id text,
  ADD COLUMN IF NOT EXISTS contract_document_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_license_pages_slug
  ON license_pages(slug) WHERE is_active = true;

COMMIT;
