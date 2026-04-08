# Technical Blueprint & Data Model — ClaimCheck Studio
## Phase 2: Architecture for Created Blue Ocean Factors

**Date:** 2025-05  
**Status:** High-level blueprint for Phase 3 implementation  
**Scope:** Provenance scoring engine, audit trail, microtask marketplace, compliance rule engine, and supporting data infrastructure

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Next.js)                         │
│  Upload → Claim List → Evidence Review → Output → Export         │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS / Server Actions
┌────────────────────────▼────────────────────────────────────────┐
│                   NEXT.JS APP ROUTER (Vercel)                    │
│  /app/api/sessions   /app/api/claims   /app/api/evidence         │
│  /app/api/generate   /app/api/export   /app/api/compliance       │
│  /app/api/microtasks /app/api/audit    /app/api/webhooks         │
└──┬──────────┬──────────┬──────────┬────────────────────────────┘
   │          │          │          │
   ▼          ▼          ▼          ▼
Supabase   OpenAI    Evidence    Compliance
 (DB +     GPT-4o    APIs        Engine
 Auth +    Claude    PubMed      (Custom)
 Storage)  Fallback  CrossRef
                     Scite
                     Unpaywall
                     Retraction
                     Watch
```

**Stack:** Next.js 15 App Router (TypeScript) · Supabase (Postgres + Auth + Storage + Realtime) · Vercel (hosting + cron) · OpenAI GPT-4o + Anthropic Claude fallback · Stripe (payments)

---

## Core Data Model

### 1. Organizations & Users

```sql
-- Organizations (tenant root)
CREATE TABLE orgs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  plan        TEXT NOT NULL DEFAULT 'researcher',  -- researcher|professional|agency|enterprise
  stripe_customer_id  TEXT,
  compliance_territory TEXT DEFAULT 'general',     -- general|fda_us|ema_eu|fda_ema
  preferred_databases  TEXT[] DEFAULT ARRAY['pubmed','crossref','unpaywall'],
  study_type_weights   JSONB DEFAULT '{"meta_analysis":1.0,"rct":0.8,"cohort":0.6,"case_study":0.4,"review":0.7}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Users (Supabase Auth users extended)
CREATE TABLE user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id),
  org_id      UUID REFERENCES orgs(id),
  role        TEXT NOT NULL DEFAULT 'editor',  -- admin|editor|reviewer
  display_name TEXT,
  email       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Sessions (top-level workflow unit)

```sql
CREATE TABLE sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES orgs(id) NOT NULL,
  created_by      UUID REFERENCES user_profiles(id),
  title           TEXT,
  audience_level  TEXT DEFAULT 'journalist',  -- patient|journalist|clinician|policymaker
  status          TEXT DEFAULT 'draft',        -- draft|processing|complete|archived
  document_path   TEXT,                        -- Supabase Storage path
  document_type   TEXT,                        -- pdf|docx|txt|pptx
  word_count      INT,
  claim_count     INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);
```

### 3. Claims (extracted from document)

```sql
CREATE TABLE claims (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID REFERENCES sessions(id) ON DELETE CASCADE,
  org_id          UUID REFERENCES orgs(id),
  text            TEXT NOT NULL,               -- the raw claim text
  normalized_text TEXT,                        -- LLM-normalized form for dedup/search
  position_index  INT,                         -- order in document
  status          TEXT DEFAULT 'pending',      -- pending|searching|scored|flagged|approved
  confidence_score NUMERIC(4,3),               -- 0.000 to 1.000
  confidence_band  TEXT,                       -- high|moderate|low|none
  evidence_count   INT DEFAULT 0,
  retraction_flag  BOOLEAN DEFAULT FALSE,
  compliance_flags JSONB DEFAULT '[]',         -- array of compliance flag objects
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Provenance Scoring Engine

```sql
-- Evidence sources retrieved per claim
CREATE TABLE evidence_sources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id        UUID REFERENCES claims(id) ON DELETE CASCADE,
  org_id          UUID REFERENCES orgs(id),
  -- Bibliographic metadata
  doi             TEXT,
  title           TEXT NOT NULL,
  authors         TEXT[],
  year            INT,
  journal         TEXT,
  pmid            TEXT,                         -- PubMed ID
  source_db       TEXT NOT NULL,                -- pubmed|crossref|scite|unpaywall
  -- Content
  abstract_snippet TEXT,
  oa_full_text_url TEXT,                        -- Unpaywall OA URL if available
  full_text_excerpt TEXT,                       -- extracted relevant excerpt
  -- Quality signals
  study_type      TEXT,                         -- meta_analysis|rct|cohort|case_study|review|other
  citation_count  INT,
  scite_supports  INT DEFAULT 0,                -- from Scite API
  scite_disputes  INT DEFAULT 0,
  scite_mentions  INT DEFAULT 0,
  -- Status
  retracted       BOOLEAN DEFAULT FALSE,
  retraction_date DATE,
  retraction_reason TEXT,
  access_status   TEXT DEFAULT 'unknown',       -- open|paywalled|cached|unavailable
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Provenance score computation log (immutable; one row per claim score event)
CREATE TABLE provenance_score_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id        UUID REFERENCES claims(id),
  org_id          UUID REFERENCES orgs(id),
  -- Score inputs
  source_count    INT,
  avg_recency_score NUMERIC(4,3),              -- 0-1 based on publication year
  study_type_score  NUMERIC(4,3),              -- weighted avg of study type hierarchy
  scite_sentiment_score NUMERIC(4,3),          -- supports/(supports+disputes) ratio
  retraction_penalty NUMERIC(4,3) DEFAULT 0,  -- deducted for retracted sources
  -- Final score
  raw_score       NUMERIC(4,3),
  final_score     NUMERIC(4,3),               -- after org-specific weight adjustments
  confidence_band TEXT,                        -- high|moderate|low|none
  -- Scoring version
  scorer_version  TEXT DEFAULT 'v1',
  computed_at     TIMESTAMPTZ DEFAULT NOW()
);
```

**Confidence Score Formula (v1):**
```
source_count_score  = min(source_count / 5, 1.0)  -- saturates at 5 sources
recency_score       = avg(1 - (current_year - pub_year) / 20)  -- decays over 20 years
study_type_score    = avg(weight[study_type]) per org config
scite_score         = supports / (supports + disputes + 1)  -- +1 avoids div/0

raw_score = 0.25 * source_count_score
          + 0.25 * recency_score  
          + 0.30 * study_type_score
          + 0.20 * scite_score
          - retraction_penalty (0.3 per retracted source, capped at 0.6)

confidence_band:
  >= 0.80  → high   🟢
  >= 0.50  → moderate 🟡
  >= 0.01  → low    🔴
  == 0     → none   ⚫
```

### 5. Generated Outputs

```sql
CREATE TABLE generated_outputs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID REFERENCES sessions(id) ON DELETE CASCADE,
  org_id          UUID REFERENCES orgs(id),
  format          TEXT NOT NULL,  -- twitter_thread|linkedin_post|blog_section|slide_copy|patient_faq|policy_brief|press_release
  audience_level  TEXT NOT NULL,
  content_json    JSONB NOT NULL,  -- structured content with claim-source links
  word_count      INT,
  compliance_checked BOOLEAN DEFAULT FALSE,
  compliance_clean   BOOLEAN,
  llm_model       TEXT,
  llm_version     TEXT,
  prompt_tokens   INT,
  completion_tokens INT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Sentence-level claim-source attribution (the core provenance UX)
CREATE TABLE output_attributions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  output_id       UUID REFERENCES generated_outputs(id) ON DELETE CASCADE,
  sentence_index  INT,
  claim_id        UUID REFERENCES claims(id),
  source_ids      UUID[],  -- which evidence_sources support this sentence
  confidence_band TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 6. Audit Trail (Immutable)

```sql
-- Append-only audit log; no UPDATE or DELETE permitted via RLS
CREATE TABLE audit_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES orgs(id),
  session_id      UUID REFERENCES sessions(id),
  claim_id        UUID REFERENCES claims(id),
  actor_id        UUID REFERENCES user_profiles(id),
  event_type      TEXT NOT NULL,
  -- event_type values:
  --   session.created | session.document_uploaded
  --   claim.extracted | claim.edited | claim.deleted | claim.approved
  --   evidence.search_started | evidence.search_completed | evidence.source_added
  --   score.computed | score.overridden
  --   output.generated | output.edited | output.exported
  --   compliance.flagged | compliance.flag_accepted | compliance.flag_overridden
  --   citebundle.exported
  --   microtask.created | microtask.assigned | microtask.completed
  --   audit.exported
  event_data      JSONB NOT NULL DEFAULT '{}',
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: SELECT for org members; INSERT for service role only; no UPDATE/DELETE
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_select ON audit_events FOR SELECT USING (org_id = current_org_id());
-- INSERT only via service role (enforced at application layer)
```

### 7. Compliance Rule Engine

```sql
-- Rule pack definitions (system-managed + org-custom)
CREATE TABLE compliance_rule_packs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID,  -- NULL = system-wide; UUID = org-specific
  name            TEXT NOT NULL,
  territory       TEXT NOT NULL,  -- general|fda_us|ema_eu|fda_ema|custom
  version         TEXT NOT NULL DEFAULT '1.0',
  enabled         BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Individual compliance rules
CREATE TABLE compliance_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id         UUID REFERENCES compliance_rule_packs(id),
  rule_code       TEXT NOT NULL,   -- e.g. FDA_001, EMA_015, GEN_042
  category        TEXT NOT NULL,   -- absolute_claim|fair_balance|off_label|superlative|unsubstantiated
  severity        TEXT NOT NULL,   -- error|warning|info
  pattern_type    TEXT NOT NULL,   -- regex|phrase_list|llm_check
  pattern         TEXT,            -- regex or phrase; NULL if llm_check
  llm_prompt      TEXT,            -- used when pattern_type = llm_check
  description     TEXT NOT NULL,
  suggestion      TEXT,            -- replacement phrasing suggestion
  regulatory_ref  TEXT,            -- e.g. "21 CFR 201.56", "EMA/CHMP/2019/123"
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance check results per output
CREATE TABLE compliance_checks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  output_id       UUID REFERENCES generated_outputs(id) ON DELETE CASCADE,
  rule_id         UUID REFERENCES compliance_rules(id),
  org_id          UUID REFERENCES orgs(id),
  -- Location in content
  sentence_index  INT,
  matched_text    TEXT,
  context_window  TEXT,
  -- Rule evaluation
  severity        TEXT,
  suggestion      TEXT,
  -- User decision (immutable once set)
  decision        TEXT,  -- NULL (pending) | accepted | overridden
  decision_by     UUID REFERENCES user_profiles(id),
  decision_at     TIMESTAMPTZ,
  override_reason TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 8. Microtask Marketplace

```sql
-- Reviewer profiles (separate from regular user_profiles)
CREATE TABLE reviewer_profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name      TEXT NOT NULL,
  credentials       TEXT,             -- "MD, Cardiology" | "PhD Immunology"
  specialties       TEXT[],           -- ['cardiology','immunology','oncology']
  institution       TEXT,
  verified_at       TIMESTAMPTZ,
  verification_doc_url TEXT,          -- Supabase Storage path
  reputation_score  NUMERIC(4,2) DEFAULT 5.0,  -- 1.0-10.0
  total_reviews     INT DEFAULT 0,
  acceptance_rate   NUMERIC(4,3),
  avg_turnaround_hours NUMERIC(6,2),
  stripe_account_id TEXT,             -- Stripe Connect for payouts
  available         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Microtask assignments
CREATE TABLE microtasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID REFERENCES orgs(id),
  session_id        UUID REFERENCES sessions(id),
  claim_id          UUID REFERENCES claims(id),
  -- Task spec
  task_type         TEXT NOT NULL DEFAULT 'claim_review',  -- claim_review|source_verify|compliance_check
  specialty_required TEXT[],          -- filter reviewers by specialty
  sla_hours         INT NOT NULL DEFAULT 24,
  fee_cents         INT NOT NULL,     -- total fee charged to requester
  reviewer_cut_cents INT,             -- 70% of fee_cents
  -- Assignment
  status            TEXT DEFAULT 'open',  -- open|assigned|completed|cancelled|disputed
  reviewer_id       UUID REFERENCES reviewer_profiles(id),
  assigned_at       TIMESTAMPTZ,
  due_at            TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  -- Review output
  verdict           TEXT,  -- accepted|modified|rejected
  reviewer_notes    TEXT,
  modified_claim    TEXT,  -- if verdict = modified
  -- Payment
  stripe_payment_intent_id  TEXT,
  stripe_transfer_id        TEXT,    -- payout to reviewer
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### 9. CiteBundle Export Tracking

```sql
CREATE TABLE citebundle_exports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID REFERENCES sessions(id),
  org_id          UUID REFERENCES orgs(id),
  created_by      UUID REFERENCES user_profiles(id),
  output_id       UUID REFERENCES generated_outputs(id),
  -- Bundle contents
  bundle_path     TEXT,             -- Supabase Storage path to ZIP
  includes_csv    BOOLEAN DEFAULT TRUE,
  includes_bibtex BOOLEAN DEFAULT TRUE,
  includes_vancouver BOOLEAN DEFAULT TRUE,
  includes_excerpts BOOLEAN DEFAULT TRUE,
  includes_confidence_report BOOLEAN DEFAULT TRUE,
  includes_snapshot_pdfs BOOLEAN DEFAULT FALSE,  -- agency+ only
  -- Metadata
  source_count    INT,
  claim_count     INT,
  expires_at      TIMESTAMPTZ,      -- 72h from creation
  download_count  INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Service Layer Architecture

### Evidence Search Pipeline (async)

```
User triggers "Find Evidence" for claims
         │
         ▼
Supabase Edge Function: evidence_search_worker
         │
    ┌────┴────┐
    │         │
    ▼         ▼
PubMed     CrossRef
Entrez      REST
  API        API
    │         │
    └────┬────┘
         │ merge + deduplicate by DOI
         ▼
    Scite API
    (citation sentiment: supports/disputes/mentions)
         │
         ▼
    Unpaywall API
    (OA full-text resolution)
         │
         ▼
  Retraction Watch
    (retraction check)
         │
         ▼
  Provenance Scorer
  (compute confidence score)
         │
         ▼
  Write to evidence_sources
  + provenance_score_events
  + Update claims.confidence_score
         │
         ▼
  Supabase Realtime broadcast
  → Browser updates claim card live
```

**API cost estimates (per claim, worst case):**
- PubMed Entrez: free (rate limit: 10 req/sec with API key)
- CrossRef: free (polite pool: 50 req/sec)
- Scite: ~$0.003/claim (at $500/mo = ~165k claims/mo)
- Unpaywall: free (open data)
- Retraction Watch API: free (open data)
- **Total per claim: ~$0.003** (dominated by Scite)

### LLM Generation Pipeline

```
Claims + Evidence Sources + Audience Level + Format
         │
         ▼
Prompt Builder
  - System: role + output schema + compliance territory
  - User: evidence JSON + claim list + audience instructions
         │
         ▼
LLM Router
  - Primary: OpenAI GPT-4o
  - Fallback: Anthropic Claude 3.5 Sonnet (on 429/error)
  - Streaming: Yes (server-sent events to browser)
         │
         ▼
Output Parser
  - Extract sentence-claim attributions
  - Validate JSON schema
  - Store to generated_outputs + output_attributions
         │
         ▼
Compliance Checker
  - Pattern rules: fast regex sweep
  - LLM rules: batch check against rule_packs
  - Write compliance_checks rows
```

**LLM cost estimates (per session):**
- GPT-4o: ~$0.005/1k input tokens + $0.015/1k output tokens
- Avg session: ~8k input tokens (claims + evidence) + ~3k output (per format)
- 7 formats: ~$0.35/session
- **Target price floor:** $29/mo / 20 sessions = $1.45 session budget → $0.35 LLM + $0.30 evidence search + $0.40 overhead = $1.05/session ✅ margin positive

### Compliance Rule Engine

```
Generated content (sentence array)
         │
         ▼
Phase 1: Pattern Sweep (fast, <100ms)
  - Regex rules: match phrase patterns
  - Phrase list rules: exact/fuzzy match
  - Flag any matches with rule metadata
         │
         ▼
Phase 2: LLM Rules (slower, batched)
  - Batched sentences sent to GPT-4o-mini
  - System prompt: "You are a pharmaceutical regulatory compliance checker..."
  - Returns: yes/no + explanation per rule
         │
         ▼
Phase 3: Merge + Deduplicate
  - Group overlapping flags by sentence
  - Assign severity: error > warning > info
  - Write compliance_checks
         │
         ▼
Compliance attestation report generation
  - PDF via @react-pdf/renderer
  - Sections: session metadata, flags summary, decisions, audit trail excerpt
```

### Audit Trail (Append-Only Enforcement)

```
Every state-changing operation:
  1. Execute the operation
  2. Immediately INSERT audit_events row (same DB transaction)
  3. No UPDATE/DELETE on audit_events (RLS enforced)
  4. Admin export: SELECT + render as PDF/JSON
  5. FDA 21 CFR Part 11 (enterprise): add e-signature_id field,
     require 2FA re-auth for compliance decisions
```

### Microtask Marketplace Flow

```
Requester flags claim for review
         │
         ▼
System creates microtask (status=open)
Creates Stripe PaymentIntent (hold funds)
         │
         ▼
Reviewer Matching
  - Filter by specialty_required, availability, reputation_score
  - Sort by: avg_turnaround_hours ASC, reputation_score DESC
  - Notify top 3 available reviewers (email + in-app)
         │
         ▼
Reviewer accepts → status=assigned
SLA clock starts (due_at = now + sla_hours)
         │
         ▼
Reviewer submits verdict (accepted|modified|rejected)
+ notes + modified_claim (if modified)
         │
         ▼
Requester notified
Stripe captures payment
Stripe Connect transfer → reviewer (70%)
audit_events INSERT: microtask.completed
         │
         ▼
Reputation update:
  reviewer_profiles.reputation_score recalculated
  (weighted rolling avg of requester ratings, if provided)
```

---

## Supabase Row-Level Security (RLS) Strategy

```sql
-- Orgs: users only see their own org
CREATE POLICY org_isolation ON sessions
  FOR ALL USING (org_id = auth.jwt()->>'org_id');

-- Audit events: read own org; no write for non-service roles
CREATE POLICY audit_read ON audit_events
  FOR SELECT USING (org_id = auth.jwt()->>'org_id');
-- INSERT is blocked for direct DB users; only service_role key can insert

-- Microtasks: requesters see their org's tasks; reviewers see assigned tasks
CREATE POLICY microtask_requester ON microtasks
  FOR SELECT USING (org_id = auth.jwt()->>'org_id');
CREATE POLICY microtask_reviewer ON microtasks
  FOR SELECT USING (reviewer_id = auth.uid() AND status IN ('assigned','completed'));

-- Evidence sources: org-scoped
CREATE POLICY evidence_org ON evidence_sources
  FOR ALL USING (org_id = auth.jwt()->>'org_id');
```

---

## Scalability & Performance Targets

| Operation | Target Latency | Implementation |
|---|---|---|
| Document upload | <3s for 50MB | Supabase Storage multipart |
| Claim extraction | <60s for 10k words | OpenAI streaming, Edge Function |
| Evidence search (per claim) | <90s | Parallel API calls, async queue |
| Confidence score computation | <200ms | Pure Postgres function |
| Content generation (per format) | <30s | OpenAI streaming |
| Compliance sweep (per output) | <5s (pattern) + <30s (LLM) | Batched LLM calls |
| CiteBundle ZIP generation | <60s | Vercel Edge Function |
| Audit export (PDF) | <10s | React-PDF server render |

---

## Phase 3 Implementation Sequence

**Week 1–2:** Core schema migration + RLS policies + Auth setup  
**Week 3–4:** Evidence search pipeline (PubMed + CrossRef + Unpaywall)  
**Week 5–6:** Provenance scoring engine + claim extraction LLM  
**Week 7–8:** Content generation pipeline + output attribution  
**Week 9–10:** Compliance rule engine (pattern phase + FDA/EMA rule packs)  
**Week 11–12:** Audit trail enforcement + CiteBundle export  
**Week 13–14:** Microtask marketplace MVP (basic flow; Stripe Connect)  
**Week 15–16:** Beta hardening + performance + RLS audit  
