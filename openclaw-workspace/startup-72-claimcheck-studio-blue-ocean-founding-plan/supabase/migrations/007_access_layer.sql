-- Migration 007: Institutional Access Layer v1
-- Tables: cc_document_snapshots, cc_access_audit
-- Extended: cc_connectors, cc_connector_templates
-- Storage: cc-snapshots (private bucket, versioned objects)

-- ─── Extend cc_connector_templates ───────────────────────────────────────────
-- (Templates already seeded in production — recorded here for reproducibility)
-- Seeded connector types: unpaywall_email, proxy_ezproxy, bearer_token,
--   elsevier_tdm, springer_nature, wiley_tdm, semantic_scholar, ncbi_entrez

-- ─── Extend cc_connectors ────────────────────────────────────────────────────
ALTER TABLE cc_connectors
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS auth_type text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS credentials_encrypted jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS proxy_url text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'
    CHECK (status IN ('active','disabled','error')),
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS last_success_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata_only boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS license_type text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS allowed_storage boolean DEFAULT false;

-- ─── Document snapshots ──────────────────────────────────────────────────────
-- Stores metadata about content uploaded to cc-snapshots Supabase Storage bucket
-- Only CC-BY/CC0 and explicitly licensed OA content is permitted for storage.
-- Object versioning: each new upload increments storage_version; old versions preserved.

CREATE TABLE IF NOT EXISTS cc_document_snapshots (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            uuid,
  claim_id              uuid,
  source_doi            text,
  source_pmid           text,
  connector_id          uuid,    -- which connector retrieved it
  bucket                text NOT NULL DEFAULT 'cc-snapshots',
  storage_path          text NOT NULL,           -- e.g. sessions/{id}/snapshots/{doi}/v1.html
  storage_version       integer NOT NULL DEFAULT 1,   -- auto-incremented per DOI+session
  content_type          text,
  file_size_bytes       bigint,
  license_type          text NOT NULL DEFAULT 'unknown',
  license_permits_storage boolean NOT NULL DEFAULT false,
  license_source        text,    -- URL/source of the license determination
  is_oa                 boolean DEFAULT false,
  highlight_text        text,    -- excerpt that was used in the claim
  excerpt_start         integer, -- char offset in original document
  excerpt_end           integer,
  is_full_text          boolean DEFAULT false,
  created_at            timestamptz DEFAULT now(),
  expires_at            timestamptz,   -- for time-limited licenses
  deleted_at            timestamptz    -- soft-delete for license compliance
);

CREATE INDEX IF NOT EXISTS cc_snapshots_doi_idx ON cc_document_snapshots(source_doi);
CREATE INDEX IF NOT EXISTS cc_snapshots_session_idx ON cc_document_snapshots(session_id);
CREATE INDEX IF NOT EXISTS cc_snapshots_claim_idx ON cc_document_snapshots(claim_id);

-- ─── Access audit log ────────────────────────────────────────────────────────
-- Immutable log of every access attempt for compliance and billing

CREATE TABLE IF NOT EXISTS cc_access_audit (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id              uuid,
  claim_id                uuid,
  connector_id            uuid,
  doi                     text,
  pmid                    text,
  access_type             text NOT NULL
    CHECK (access_type IN ('metadata','abstract','fulltext','snapshot','pdf_page')),
  access_granted          boolean NOT NULL DEFAULT false,
  license_type            text,
  license_permits_fulltext boolean DEFAULT false,
  connector_type          text,
  http_status             integer,
  response_ms             integer,
  stored_snapshot_id      uuid,       -- FK to cc_document_snapshots
  ip_hash                 text,       -- SHA-256 of IP for audit without PII
  user_agent_hash         text,
  created_at              timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cc_access_audit_doi_idx ON cc_access_audit(doi);
CREATE INDEX IF NOT EXISTS cc_access_audit_session_idx ON cc_access_audit(session_id);
CREATE INDEX IF NOT EXISTS cc_access_audit_created_idx ON cc_access_audit(created_at DESC);

-- ─── Supabase Storage bucket: cc-snapshots (created via Management API) ───────
-- Private bucket — no public access
-- Max file size: 50MB
-- Allowed MIME types: application/pdf, text/html, text/plain, application/json
-- RLS: service role only

-- ─── RLS policies ────────────────────────────────────────────────────────────
ALTER TABLE cc_document_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_access_audit ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cc_document_snapshots' AND policyname='cc_snapshots_service') THEN
    CREATE POLICY cc_snapshots_service ON cc_document_snapshots FOR ALL USING (auth.role()='service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cc_access_audit' AND policyname='cc_access_audit_service') THEN
    CREATE POLICY cc_access_audit_service ON cc_access_audit FOR ALL USING (auth.role()='service_role');
  END IF;
END $$;

-- ─── Migration record ─────────────────────────────────────────────────────────
INSERT INTO cc_schema_migrations(version, description, applied_at)
VALUES ('007', 'access-layer v1 — connector templates, document_snapshots, access_audit', NOW())
ON CONFLICT (version) DO NOTHING;
