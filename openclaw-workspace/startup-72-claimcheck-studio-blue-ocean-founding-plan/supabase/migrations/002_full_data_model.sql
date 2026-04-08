-- ============================================================
-- ClaimCheck Studio — Full Data Model Migration v2
-- Supabase project: lpxhxmpzqjygsaawkrva
-- ============================================================

-- ── pgvector extension ───────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- fuzzy text search

-- ============================================================
-- ORGANIZATIONS & MULTI-TENANCY
-- ============================================================

CREATE TABLE IF NOT EXISTS cc_orgs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,         -- url-safe name, e.g. "mayo-clinic"
  name            TEXT NOT NULL,
  plan            TEXT NOT NULL DEFAULT 'free', -- free | researcher | professional | agency | enterprise
  plan_seats      INT  NOT NULL DEFAULT 1,
  trial_ends_at   TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_sub_id   TEXT,
  settings        JSONB NOT NULL DEFAULT '{}',  -- feature flags, connector configs
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cc_orgs_plan_idx ON cc_orgs(plan);

-- ── Org roles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cc_org_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES cc_orgs(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'writer',   -- writer | reviewer | admin | owner
  invited_by  UUID REFERENCES auth.users(id),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS cc_org_members_user_idx ON cc_org_members(user_id);
CREATE INDEX IF NOT EXISTS cc_org_members_org_idx  ON cc_org_members(org_id);

-- ── User profiles (extends auth.users) ───────────────────────
CREATE TABLE IF NOT EXISTS cc_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT,
  email           TEXT,
  avatar_url      TEXT,
  orcid_id        TEXT,                         -- for reviewer credentialing
  institution     TEXT,
  specialty       TEXT,                         -- e.g. "cardiology", "oncology"
  reviewer_score  NUMERIC(5,2) DEFAULT 0,       -- reputation score 0–100
  reviewer_badges TEXT[] DEFAULT '{}',
  total_reviews   INT  NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DOCUMENTS (extends cc_sessions, same concept, more fields)
-- ============================================================

-- Add missing columns to cc_sessions (our "documents" table)
ALTER TABLE cc_sessions
  ADD COLUMN IF NOT EXISTS org_id        UUID REFERENCES cc_orgs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_type   TEXT DEFAULT 'paste',  -- paste | pdf | docx | url | transcript
  ADD COLUMN IF NOT EXISTS source_url    TEXT,
  ADD COLUMN IF NOT EXISTS language      TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS territory     TEXT DEFAULT 'general', -- fda_us | ema_eu | general
  ADD COLUMN IF NOT EXISTS risk_score    NUMERIC(5,3),            -- 0.0–1.0 overall doc risk
  ADD COLUMN IF NOT EXISTS processing_ms INT,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at    TIMESTAMPTZ;            -- soft delete

CREATE INDEX IF NOT EXISTS cc_sessions_org_idx     ON cc_sessions(org_id);
CREATE INDEX IF NOT EXISTS cc_sessions_created_by  ON cc_sessions(created_by);
CREATE INDEX IF NOT EXISTS cc_sessions_status_idx  ON cc_sessions(status);

-- ============================================================
-- CLAIMS (add embedding + risk columns)
-- ============================================================

ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS org_id            UUID REFERENCES cc_orgs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS claim_type        TEXT DEFAULT 'quantitative',
  ADD COLUMN IF NOT EXISTS extraction_method TEXT DEFAULT 'rule_v3', -- rule_v3 | llm_claude | llm_gpt4
  ADD COLUMN IF NOT EXISTS risk_flag         TEXT,    -- NULL | unsupported | contested | retracted | regulatory
  ADD COLUMN IF NOT EXISTS risk_detail       JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS embedding         vector(1536),  -- text-embedding-3-small dim
  ADD COLUMN IF NOT EXISTS human_verified    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at        TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS claims_session_idx   ON claims(session_id);
CREATE INDEX IF NOT EXISTS claims_risk_flag_idx ON claims(risk_flag) WHERE risk_flag IS NOT NULL;
CREATE INDEX IF NOT EXISTS claims_embedding_idx ON claims USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);   -- approximate nearest-neighbor index (build after 10k rows)

-- ============================================================
-- EVIDENCE SOURCES (add embedding + full-text columns)
-- ============================================================

ALTER TABLE evidence_sources
  ADD COLUMN IF NOT EXISTS org_id         UUID REFERENCES cc_orgs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS abstract_text  TEXT,
  ADD COLUMN IF NOT EXISTS full_text_url  TEXT,               -- Unpaywall OA URL
  ADD COLUMN IF NOT EXISTS pdf_cached_url TEXT,               -- our S3 snapshot
  ADD COLUMN IF NOT EXISTS mesh_terms     TEXT[],
  ADD COLUMN IF NOT EXISTS study_type     TEXT,               -- rct | meta_analysis | cohort | case_control | review
  ADD COLUMN IF NOT EXISTS impact_factor  NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS scite_support  INT  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scite_contrast INT  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scite_mention  INT  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS embedding      vector(1536),
  ADD COLUMN IF NOT EXISTS relevance_score NUMERIC(5,4),     -- cosine sim to claim
  ADD COLUMN IF NOT EXISTS deleted_at    TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS evidence_sources_claim_idx     ON evidence_sources(claim_id);
CREATE INDEX IF NOT EXISTS evidence_sources_doi_idx       ON evidence_sources(doi) WHERE doi IS NOT NULL;
CREATE INDEX IF NOT EXISTS evidence_sources_embedding_idx ON evidence_sources
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- CITATIONS (canonical deduplicated reference list per org)
-- ============================================================

CREATE TABLE IF NOT EXISTS cc_citations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES cc_orgs(id) ON DELETE SET NULL,
  doi             TEXT,
  pmid            TEXT,
  pmcid           TEXT,
  arxiv_id        TEXT,
  title           TEXT NOT NULL,
  authors         TEXT[] NOT NULL DEFAULT '{}',
  journal         TEXT,
  year            INT,
  volume          TEXT,
  issue           TEXT,
  pages           TEXT,
  abstract        TEXT,
  url             TEXT,
  oa_url          TEXT,                          -- open-access full-text
  study_type      TEXT,
  impact_factor   NUMERIC(6,3),
  scite_support   INT  DEFAULT 0,
  scite_contrast  INT  DEFAULT 0,
  citation_count  INT  DEFAULT 0,
  embedding       vector(1536),
  first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(doi),
  UNIQUE(pmid)
);

CREATE INDEX IF NOT EXISTS cc_citations_org_idx    ON cc_citations(org_id);
CREATE INDEX IF NOT EXISTS cc_citations_year_idx   ON cc_citations(year);
CREATE INDEX IF NOT EXISTS cc_citations_emb_idx    ON cc_citations
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- Full-text search on title+abstract
CREATE INDEX IF NOT EXISTS cc_citations_fts ON cc_citations
  USING gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(abstract,'')));

-- Link table: evidence_source → canonical citation
CREATE TABLE IF NOT EXISTS cc_source_citations (
  evidence_source_id UUID NOT NULL REFERENCES evidence_sources(id) ON DELETE CASCADE,
  citation_id        UUID NOT NULL REFERENCES cc_citations(id) ON DELETE CASCADE,
  PRIMARY KEY (evidence_source_id, citation_id)
);

-- ============================================================
-- JOBS / PROCESSING QUEUE
-- ============================================================

CREATE TABLE IF NOT EXISTS cc_jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID REFERENCES cc_orgs(id) ON DELETE CASCADE,
  session_id   UUID REFERENCES cc_sessions(id) ON DELETE CASCADE,
  job_type     TEXT NOT NULL,    -- extract_claims | search_evidence | score_provenance | generate_output | export_bundle | review_assign
  status       TEXT NOT NULL DEFAULT 'queued',  -- queued | running | done | failed | cancelled
  priority     INT  NOT NULL DEFAULT 5,         -- 1 (high) – 10 (low)
  payload      JSONB NOT NULL DEFAULT '{}',
  result       JSONB,
  error        TEXT,
  attempts     INT  NOT NULL DEFAULT 0,
  max_attempts INT  NOT NULL DEFAULT 3,
  worker_id    TEXT,
  queued_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS cc_jobs_status_priority_idx ON cc_jobs(status, priority, queued_at)
  WHERE status IN ('queued','running');
CREATE INDEX IF NOT EXISTS cc_jobs_session_idx         ON cc_jobs(session_id);
CREATE INDEX IF NOT EXISTS cc_jobs_org_idx             ON cc_jobs(org_id);
CREATE INDEX IF NOT EXISTS cc_jobs_type_idx            ON cc_jobs(job_type);

-- ── Queue helper: claim next job atomically ───────────────────
CREATE OR REPLACE FUNCTION cc_claim_next_job(p_job_type TEXT DEFAULT NULL)
RETURNS SETOF cc_jobs
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE cc_jobs
  SET status = 'running', started_at = NOW(), attempts = attempts + 1, worker_id = pg_backend_pid()::text
  WHERE id = (
    SELECT id FROM cc_jobs
    WHERE status = 'queued'
      AND (p_job_type IS NULL OR job_type = p_job_type)
      AND attempts < max_attempts
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY priority ASC, queued_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING *;
END;
$$;

-- ============================================================
-- REVIEWS (peer-review microtasks)
-- ============================================================

CREATE TABLE IF NOT EXISTS cc_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES cc_orgs(id) ON DELETE SET NULL,
  session_id      UUID NOT NULL REFERENCES cc_sessions(id) ON DELETE CASCADE,
  claim_id        UUID REFERENCES claims(id) ON DELETE CASCADE,
  reviewer_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_type     TEXT NOT NULL DEFAULT 'claim_accuracy', -- claim_accuracy | source_quality | compliance | full_doc
  status          TEXT NOT NULL DEFAULT 'pending',        -- pending | in_progress | completed | disputed | expired
  verdict         TEXT,                   -- approved | rejected | needs_revision | contested
  confidence      NUMERIC(3,2),           -- reviewer's stated confidence 0.0–1.0
  notes           TEXT,
  suggested_fix   TEXT,
  reward_cents    INT  NOT NULL DEFAULT 0,  -- micropayment amount
  reward_paid     BOOLEAN NOT NULL DEFAULT FALSE,
  time_spent_sec  INT,
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ DEFAULT NOW() + INTERVAL '48 hours'
);

CREATE INDEX IF NOT EXISTS cc_reviews_reviewer_idx    ON cc_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS cc_reviews_session_idx     ON cc_reviews(session_id);
CREATE INDEX IF NOT EXISTS cc_reviews_claim_idx       ON cc_reviews(claim_id);
CREATE INDEX IF NOT EXISTS cc_reviews_status_idx      ON cc_reviews(status);

-- ============================================================
-- AUDIT LOG (append-only immutable log)
-- ============================================================

-- Rename existing audit_events to match naming convention, or add alias view
CREATE TABLE IF NOT EXISTS cc_audit_log (
  id          BIGSERIAL PRIMARY KEY,             -- bigserial for total ordering
  org_id      UUID REFERENCES cc_orgs(id) ON DELETE SET NULL,
  session_id  UUID REFERENCES cc_sessions(id) ON DELETE SET NULL,
  claim_id    UUID REFERENCES claims(id) ON DELETE SET NULL,
  actor_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_type  TEXT NOT NULL DEFAULT 'user',      -- user | system | api | reviewer
  event_type  TEXT NOT NULL,                     -- session.created | claim.extracted | evidence.found | output.generated | review.completed | export.downloaded | etc.
  event_data  JSONB NOT NULL DEFAULT '{}',
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only: disable UPDATE and DELETE via trigger
CREATE OR REPLACE FUNCTION cc_audit_log_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Audit log is immutable — UPDATE/DELETE not allowed';
END;
$$;

CREATE TRIGGER cc_audit_log_no_update
  BEFORE UPDATE ON cc_audit_log
  FOR EACH ROW EXECUTE FUNCTION cc_audit_log_immutable();

CREATE TRIGGER cc_audit_log_no_delete
  BEFORE DELETE ON cc_audit_log
  FOR EACH ROW EXECUTE FUNCTION cc_audit_log_immutable();

CREATE INDEX IF NOT EXISTS cc_audit_log_org_idx     ON cc_audit_log(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cc_audit_log_session_idx ON cc_audit_log(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cc_audit_log_event_idx   ON cc_audit_log(event_type, created_at DESC);

-- ============================================================
-- CONNECTORS (institutional data source plugins)
-- ============================================================

CREATE TABLE IF NOT EXISTS cc_connectors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES cc_orgs(id) ON DELETE CASCADE,
  connector_type  TEXT NOT NULL,  -- pubmed | crossref | scite | unpaywall | elsevier | springer | wiley | institutional_proxy | custom
  display_name    TEXT NOT NULL,
  config          JSONB NOT NULL DEFAULT '{}',  -- encrypted at app layer; api keys, base URLs
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  priority        INT  NOT NULL DEFAULT 5,      -- lower = searched first
  last_used_at    TIMESTAMPTZ,
  total_requests  INT  NOT NULL DEFAULT 0,
  error_rate      NUMERIC(5,4) DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cc_connectors_org_type_idx ON cc_connectors(org_id, connector_type);

-- Default public connectors (org_id = NULL = available to all)
CREATE TABLE IF NOT EXISTS cc_connector_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_type  TEXT UNIQUE NOT NULL,
  display_name    TEXT NOT NULL,
  description     TEXT,
  base_url        TEXT,
  auth_type       TEXT DEFAULT 'none',  -- none | api_key | oauth2 | ip_auth
  rate_limit_rpm  INT  DEFAULT 60,
  supports_fulltext BOOLEAN DEFAULT FALSE,
  supports_scite    BOOLEAN DEFAULT FALSE,
  config_schema   JSONB NOT NULL DEFAULT '{}',  -- JSON Schema for config fields
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO cc_connector_templates (connector_type, display_name, description, base_url, auth_type, rate_limit_rpm, supports_fulltext, supports_scite, config_schema)
VALUES
  ('pubmed',      'PubMed',            'NCBI PubMed biomedical literature',            'https://eutils.ncbi.nlm.nih.gov', 'none',    10,  FALSE, FALSE, '{}'),
  ('crossref',    'CrossRef',          'CrossRef DOI resolution and metadata',          'https://api.crossref.org',        'none',    50,  FALSE, FALSE, '{"polite_mailto": {"type": "string"}}'),
  ('scite',       'Scite.ai',          'Citation context: supporting vs contrasting',   'https://api.scite.ai',            'api_key', 60,  FALSE, TRUE,  '{"api_key": {"type": "string", "secret": true}}'),
  ('unpaywall',   'Unpaywall',         'Open-access full-text URL resolution',          'https://api.unpaywall.org',       'none',    100, TRUE,  FALSE, '{"email": {"type": "string"}}'),
  ('semantic',    'Semantic Scholar',  'AI-powered literature search and recommendations', 'https://api.semanticscholar.org', 'api_key', 100, FALSE, FALSE, '{"api_key": {"type": "string", "secret": true}}'),
  ('europepmc',   'Europe PMC',        'European literature including preprints',        'https://www.ebi.ac.uk/europepmc', 'none',    60,  TRUE,  FALSE, '{}'),
  ('institutional_proxy', 'Institutional Proxy', 'University/hospital library proxy for paywalled access', '', 'ip_auth', 30, TRUE, FALSE, '{"proxy_url": {"type": "string"}}')
ON CONFLICT (connector_type) DO NOTHING;

-- ============================================================
-- EXPORTS (CiteBundle export records)
-- ============================================================

-- Extend existing citebundle_exports if it exists, or this is a superset
CREATE TABLE IF NOT EXISTS cc_exports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES cc_orgs(id) ON DELETE SET NULL,
  session_id      UUID NOT NULL REFERENCES cc_sessions(id) ON DELETE CASCADE,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  export_type     TEXT NOT NULL DEFAULT 'citebundle',  -- citebundle | cms_wordpress | cms_contentful | ris | endnote | zotero | mendeley
  format          TEXT NOT NULL DEFAULT 'zip',         -- zip | json | csv | bib | ris | pdf
  status          TEXT NOT NULL DEFAULT 'pending',     -- pending | generating | ready | failed | expired
  file_path       TEXT,                                -- Supabase Storage path
  file_size_bytes INT,
  download_count  INT  NOT NULL DEFAULT 0,
  last_downloaded TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  metadata        JSONB NOT NULL DEFAULT '{}',        -- includes citation count, format details
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cc_exports_session_idx ON cc_exports(session_id);
CREATE INDEX IF NOT EXISTS cc_exports_org_idx     ON cc_exports(org_id);
CREATE INDEX IF NOT EXISTS cc_exports_status_idx  ON cc_exports(status);

-- ============================================================
-- BILLING STUBS (Stripe integration scaffolding)
-- ============================================================

CREATE TABLE IF NOT EXISTS cc_billing_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT UNIQUE NOT NULL,            -- researcher | professional | agency | enterprise
  display_name    TEXT NOT NULL,
  price_monthly   INT  NOT NULL,                   -- USD cents
  price_annual    INT  NOT NULL,
  stripe_price_monthly_id TEXT,
  stripe_price_annual_id  TEXT,
  features        JSONB NOT NULL DEFAULT '{}',     -- feature flags for this plan
  limits          JSONB NOT NULL DEFAULT '{}',     -- docs_per_month, claims_per_doc, seats, etc.
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO cc_billing_plans (name, display_name, price_monthly, price_annual, features, limits)
VALUES
  ('free',         'Free',          0,      0,
   '{"evidence_search": true, "export_csv": true, "formats": ["twitter_thread"]}',
   '{"docs_per_month": 3, "claims_per_doc": 5, "seats": 1, "connectors": 2}'),
  ('researcher',   'Researcher',    2900,   29000,
   '{"evidence_search": true, "export_all": true, "compliance_check": true, "formats": "all"}',
   '{"docs_per_month": 30, "claims_per_doc": 50, "seats": 1, "connectors": 5}'),
  ('professional', 'Professional',  14900,  149000,
   '{"evidence_search": true, "export_all": true, "compliance_check": true, "formats": "all", "review_queue": true}',
   '{"docs_per_month": 200, "claims_per_doc": 200, "seats": 5, "connectors": 10}'),
  ('agency',       'Agency',        49900,  499000,
   '{"evidence_search": true, "export_all": true, "compliance_check": true, "formats": "all", "review_queue": true, "api_access": true, "cms_export": true}',
   '{"docs_per_month": 2000, "claims_per_doc": 500, "seats": 25, "connectors": 20}'),
  ('enterprise',   'Enterprise',    200000, 2000000,
   '{"evidence_search": true, "export_all": true, "compliance_check": true, "formats": "all", "review_queue": true, "api_access": true, "cms_export": true, "sla_slas": true, "dedicated_support": true, "custom_connectors": true}',
   '{"docs_per_month": -1, "claims_per_doc": -1, "seats": -1, "connectors": -1}')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS cc_billing_subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES cc_orgs(id) ON DELETE CASCADE,
  plan_id             UUID NOT NULL REFERENCES cc_billing_plans(id),
  stripe_sub_id       TEXT UNIQUE,
  stripe_customer_id  TEXT,
  status              TEXT NOT NULL DEFAULT 'trialing',  -- trialing | active | past_due | cancelled | paused
  billing_cycle       TEXT NOT NULL DEFAULT 'monthly',   -- monthly | annual
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  trial_end           TIMESTAMPTZ,
  mrr_cents           INT  NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id)
);

CREATE TABLE IF NOT EXISTS cc_usage_events (
  id          BIGSERIAL PRIMARY KEY,
  org_id      UUID NOT NULL REFERENCES cc_orgs(id) ON DELETE CASCADE,
  session_id  UUID REFERENCES cc_sessions(id) ON DELETE SET NULL,
  event_type  TEXT NOT NULL,   -- doc_processed | claim_extracted | evidence_searched | output_generated | export_downloaded | review_completed
  quantity    INT  NOT NULL DEFAULT 1,
  metadata    JSONB NOT NULL DEFAULT '{}',
  billed      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cc_usage_events_org_idx  ON cc_usage_events(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cc_usage_events_type_idx ON cc_usage_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS cc_usage_events_billed_idx ON cc_usage_events(billed) WHERE billed = FALSE;

-- Monthly usage rollup view
CREATE OR REPLACE VIEW cc_usage_monthly AS
SELECT
  org_id,
  date_trunc('month', created_at) AS month,
  event_type,
  SUM(quantity) AS total,
  COUNT(*) AS event_count
FROM cc_usage_events
GROUP BY org_id, date_trunc('month', created_at), event_type;

-- ============================================================
-- GENERATED OUTPUTS (extend existing table)
-- ============================================================

ALTER TABLE generated_outputs
  ADD COLUMN IF NOT EXISTS org_id     UUID REFERENCES cc_orgs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cms_export_status TEXT,   -- not_exported | exported | failed
  ADD COLUMN IF NOT EXISTS cms_export_url   TEXT,
  ADD COLUMN IF NOT EXISTS version    INT  NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================
-- RISK FLAGS (claim-level risk assessment)
-- ============================================================

CREATE TABLE IF NOT EXISTS cc_risk_flags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES cc_orgs(id) ON DELETE SET NULL,
  claim_id        UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  flag_type       TEXT NOT NULL,  -- unsupported | contested | retracted | regulatory | hallucination_risk | outdated
  severity        TEXT NOT NULL DEFAULT 'warning',  -- info | warning | error | critical
  source          TEXT,           -- rule_engine | scite | pubmed_retraction | llm_review | human_reviewer
  detail          TEXT,
  suggestion      TEXT,
  auto_resolved   BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by     UUID REFERENCES auth.users(id),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cc_risk_flags_claim_idx    ON cc_risk_flags(claim_id);
CREATE INDEX IF NOT EXISTS cc_risk_flags_severity_idx ON cc_risk_flags(severity);
CREATE INDEX IF NOT EXISTS cc_risk_flags_type_idx     ON cc_risk_flags(flag_type);

-- ============================================================
-- SCHEMA MIGRATIONS TRACKER
-- ============================================================

CREATE TABLE IF NOT EXISTS cc_schema_migrations (
  version     TEXT PRIMARY KEY,
  description TEXT,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO cc_schema_migrations (version, description)
VALUES ('002_full_data_model', 'Full data model: orgs, members, profiles, citations, jobs, reviews, audit_log, connectors, billing, risk_flags, pgvector')
ON CONFLICT (version) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all new tables
ALTER TABLE cc_orgs                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_org_members             ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_citations               ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_source_citations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_jobs                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_reviews                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_audit_log               ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_connectors              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_connector_templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_exports                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_billing_plans           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_billing_subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_usage_events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_risk_flags              ENABLE ROW LEVEL SECURITY;

-- ── Helper: check if caller is member of org ─────────────────
CREATE OR REPLACE FUNCTION cc_is_org_member(p_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM cc_org_members
    WHERE org_id = p_org_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION cc_is_org_admin(p_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM cc_org_members
    WHERE org_id = p_org_id AND user_id = auth.uid()
      AND role IN ('admin','owner')
  );
$$;

-- cc_orgs: members can read their orgs; admins can update
CREATE POLICY "Members read own orgs"
  ON cc_orgs FOR SELECT USING (cc_is_org_member(id));
CREATE POLICY "Admins update org"
  ON cc_orgs FOR UPDATE USING (cc_is_org_admin(id));

-- cc_org_members: members see their own org members
CREATE POLICY "Members view org roster"
  ON cc_org_members FOR SELECT USING (cc_is_org_member(org_id));
CREATE POLICY "Admins manage members"
  ON cc_org_members FOR INSERT WITH CHECK (cc_is_org_admin(org_id));
CREATE POLICY "Admins delete members"
  ON cc_org_members FOR DELETE USING (cc_is_org_admin(org_id));

-- cc_profiles: users read their own profile; org members see basic info
CREATE POLICY "Users read own profile"
  ON cc_profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users update own profile"
  ON cc_profiles FOR UPDATE USING (id = auth.uid());

-- cc_citations: org-scoped or public (org_id IS NULL)
CREATE POLICY "Members read citations"
  ON cc_citations FOR SELECT
  USING (org_id IS NULL OR cc_is_org_member(org_id));

-- cc_jobs: org members see own org jobs
CREATE POLICY "Members view jobs"
  ON cc_jobs FOR SELECT USING (cc_is_org_member(org_id));

-- cc_reviews: reviewers see assigned; org members see org reviews
CREATE POLICY "Reviewers read assigned reviews"
  ON cc_reviews FOR SELECT
  USING (reviewer_id = auth.uid() OR cc_is_org_member(org_id));
CREATE POLICY "Reviewers update assigned reviews"
  ON cc_reviews FOR UPDATE USING (reviewer_id = auth.uid());

-- cc_audit_log: read-only for org members (no insert via RLS — service role only)
CREATE POLICY "Members read audit log"
  ON cc_audit_log FOR SELECT
  USING (org_id IS NULL OR cc_is_org_member(org_id));

-- cc_connectors: org-scoped
CREATE POLICY "Members view connectors"
  ON cc_connectors FOR SELECT USING (cc_is_org_member(org_id));
CREATE POLICY "Admins manage connectors"
  ON cc_connectors FOR ALL USING (cc_is_org_admin(org_id));

-- cc_connector_templates: public read
CREATE POLICY "Public read connector templates"
  ON cc_connector_templates FOR SELECT USING (TRUE);

-- cc_exports: org-scoped
CREATE POLICY "Members view exports"
  ON cc_exports FOR SELECT USING (cc_is_org_member(org_id));

-- cc_billing_plans: public read
CREATE POLICY "Public read billing plans"
  ON cc_billing_plans FOR SELECT USING (TRUE);

-- cc_billing_subscriptions: org admins
CREATE POLICY "Admins view subscriptions"
  ON cc_billing_subscriptions FOR SELECT USING (cc_is_org_admin(org_id));

-- cc_usage_events: org admins
CREATE POLICY "Admins view usage"
  ON cc_usage_events FOR SELECT USING (cc_is_org_admin(org_id));

-- cc_risk_flags: org-scoped
CREATE POLICY "Members view risk flags"
  ON cc_risk_flags FOR SELECT USING (cc_is_org_member(org_id));

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION cc_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER cc_orgs_updated_at
  BEFORE UPDATE ON cc_orgs
  FOR EACH ROW EXECUTE FUNCTION cc_touch_updated_at();

CREATE TRIGGER cc_profiles_updated_at
  BEFORE UPDATE ON cc_profiles
  FOR EACH ROW EXECUTE FUNCTION cc_touch_updated_at();

CREATE TRIGGER cc_connectors_updated_at
  BEFORE UPDATE ON cc_connectors
  FOR EACH ROW EXECUTE FUNCTION cc_touch_updated_at();

CREATE TRIGGER cc_billing_subs_updated_at
  BEFORE UPDATE ON cc_billing_subscriptions
  FOR EACH ROW EXECUTE FUNCTION cc_touch_updated_at();
