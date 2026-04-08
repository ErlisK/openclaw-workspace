# ClaimCheck Studio — Full Data Model
**Migration:** `002_full_data_model.sql` · **Applied:** 2025-05-07 · **Supabase:** `lpxhxmpzqjygsaawkrva`

---

## Schema Overview

17 `cc_`-prefixed tables + 3 pgvector columns + 17 RLS policies + 5 billing plans + 7 connector templates.

```
cc_orgs                    — Organizations (multi-tenant root)
cc_org_members             — User ↔ org membership + roles
cc_profiles                — User profiles (extends auth.users)
cc_sessions                — Documents / processing sessions
claims                     — Extracted factual claims per session
evidence_sources           — PubMed/CrossRef sources per claim
cc_citations               — Canonical deduplicated reference library
cc_source_citations        — evidence_source → cc_citation link
cc_jobs                    — Background processing job queue
cc_reviews                 — Peer-review microtask records
cc_audit_log               — Append-only immutable event log
cc_connectors              — Per-org data source connectors
cc_connector_templates     — Public connector config templates
cc_exports                 — CiteBundle + CMS export records
cc_billing_plans           — Subscription tier definitions
cc_billing_subscriptions   — Active subscriptions per org
cc_usage_events            — Usage metering for billing
cc_risk_flags              — Claim-level risk assessment records
cc_schema_migrations       — Applied migration tracker
```

---

## Table Descriptions

### `cc_orgs` — Organizations
Multi-tenant root. Each org has a plan, Stripe references, and a settings JSONB blob for feature flags and connector configs.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| slug | TEXT UNIQUE | URL-safe name, e.g. `mayo-clinic` |
| plan | TEXT | `free` · `researcher` · `professional` · `agency` · `enterprise` |
| plan_seats | INT | max users |
| stripe_customer_id | TEXT | for billing |
| settings | JSONB | feature flags, connector overrides |

### `cc_org_members` — Org Membership + Roles
| Column | Type | Notes |
|---|---|---|
| org_id | UUID FK → cc_orgs | |
| user_id | UUID FK → auth.users | |
| role | TEXT | `writer` · `reviewer` · `admin` · `owner` |

### `cc_profiles` — User Profiles
Extends Supabase `auth.users`. Captures reviewer credentialing (ORCID, specialty, reputation score, badges).

### `cc_sessions` — Documents / Sessions
The primary processing unit. Each session = one document upload.

Key added columns over v1:
- `org_id` — multi-tenant scoping
- `territory` — compliance territory (`fda_us` · `ema_eu` · `general`)
- `risk_score` — 0.0–1.0 aggregate risk score
- `source_type` — `paste` · `pdf` · `docx` · `url` · `transcript`
- `deleted_at` — soft delete

### `claims` — Extracted Claims
One row per factual claim extracted from a session document.

Key added columns:
- `embedding` — `vector(1536)` for semantic similarity search
- `claim_type` — `quantitative` · `causal` · `comparative` · `epidemiological` · `treatment`
- `extraction_method` — `rule_v3` · `llm_claude` · `llm_gpt4`
- `risk_flag` — `unsupported` · `contested` · `retracted` · `regulatory`
- `human_verified` — set by reviewer

### `evidence_sources` — Evidence Search Results
PubMed/CrossRef/Scite results linked to claims.

Key added columns:
- `embedding` — `vector(1536)` for relevance scoring
- `study_type` — `rct` · `meta_analysis` · `cohort` · `case_control` · `review`
- `scite_support/contrast/mention` — Scite.ai citation context counts
- `full_text_url` — Unpaywall open-access URL
- `relevance_score` — cosine similarity to claim embedding

### `cc_citations` — Canonical Reference Library
Deduplicated, org-scoped citation store. Claims from multiple sessions that cite the same DOI point here.

- Full-text search index: `to_tsvector('english', title || abstract)`
- pgvector ANN index (ivfflat, 1536 dims, cosine)
- Unique on `doi` and `pmid`

### `cc_jobs` — Background Job Queue
SKIP LOCKED queue with priority, retries, and expiry.

| Status | Description |
|---|---|
| `queued` | Waiting to be claimed |
| `running` | Claimed by a worker |
| `done` | Completed successfully |
| `failed` | Max retries exceeded |
| `cancelled` | Manually cancelled |

Job types: `extract_claims` · `search_evidence` · `score_provenance` · `generate_output` · `export_bundle` · `review_assign`

Helper function: `cc_claim_next_job(p_job_type)` — atomically claims the next queued job using `FOR UPDATE SKIP LOCKED`.

### `cc_reviews` — Peer-Review Microtasks
Reviewer assignment record with verdict, confidence, suggested fix, and micropayment tracking.

| Field | Values |
|---|---|
| review_type | `claim_accuracy` · `source_quality` · `compliance` · `full_doc` |
| status | `pending` · `in_progress` · `completed` · `disputed` · `expired` |
| verdict | `approved` · `rejected` · `needs_revision` · `contested` |
| reward_cents | micropayment amount |

### `cc_audit_log` — Append-Only Immutable Log
Bigserial PK for total ordering. UPDATE and DELETE blocked by triggers — once written, never changed. Covers all user + system actions.

### `cc_connectors` — Per-Org Data Source Connectors
Per-org instances of connector types (e.g. "Mayo Clinic's Elsevier subscription"). Config JSONB should be encrypted at application layer.

### `cc_connector_templates` — Public Connector Templates
Reference catalog of supported connectors with auth type, rate limits, and config schema.

| Connector | Auth | Full-text | Scite |
|---|---|---|---|
| PubMed | none | ❌ | ❌ |
| CrossRef | none | ❌ | ❌ |
| Scite.ai | api_key | ❌ | ✅ |
| Unpaywall | none (email) | ✅ | ❌ |
| Semantic Scholar | api_key | ❌ | ❌ |
| Europe PMC | none | ✅ | ❌ |
| Institutional Proxy | ip_auth | ✅ | ❌ |

### `cc_billing_plans` — Subscription Tiers
Seeded with 5 plans:

| Plan | Price/mo | Docs/mo | Claims/doc | Seats |
|---|---|---|---|---|
| Free | $0 | 3 | 5 | 1 |
| Researcher | $29 | 30 | 50 | 1 |
| Professional | $149 | 200 | 200 | 5 |
| Agency | $499 | 2,000 | 500 | 25 |
| Enterprise | $2,000 | unlimited | unlimited | unlimited |

### `cc_billing_subscriptions` — Active Subscriptions
One record per org. Tracks Stripe sub ID, billing cycle, period dates, trial end, and MRR.

### `cc_usage_events` — Usage Metering
Append-only event stream for billing: `doc_processed` · `claim_extracted` · `evidence_searched` · `output_generated` · `export_downloaded` · `review_completed`. Aggregated view: `cc_usage_monthly`.

### `cc_risk_flags` — Claim Risk Records
| Flag Type | Description |
|---|---|
| `unsupported` | No peer-reviewed evidence found |
| `contested` | >30% contrasting Scite citations |
| `retracted` | Source paper retracted |
| `regulatory` | Prohibited phrasing per territory rules |
| `hallucination_risk` | Low-confidence LLM claim with no evidence |
| `outdated` | Primary source >10 years old |

---

## pgvector Columns

| Table | Column | Dims | Use |
|---|---|---|---|
| `claims` | `embedding` | 1536 | Semantic deduplication, similar-claim retrieval |
| `evidence_sources` | `embedding` | 1536 | Claim-source relevance scoring |
| `cc_citations` | `embedding` | 1536 | "Find similar papers" feature |

Model: `text-embedding-3-small` (OpenAI, 1536 dims). ANN index: `ivfflat` (cosine), lists=100, build after 10k rows.

---

## RLS Summary

| Table | Policies | Access Pattern |
|---|---|---|
| `cc_orgs` | 2 | Members read; admins update |
| `cc_org_members` | 1 | Members see org roster |
| `cc_profiles` | 2 | Self-read + self-update only |
| `cc_citations` | 1 | Members or public (org_id IS NULL) |
| `cc_jobs` | 1 | Org members |
| `cc_reviews` | 2 | Reviewer + org members; reviewer can update |
| `cc_audit_log` | 1 | Org members read-only; writes via service role |
| `cc_connectors` | 1 | Org members |
| `cc_connector_templates` | 1 | Public |
| `cc_exports` | 1 | Org members |
| `cc_billing_plans` | 1 | Public |
| `cc_billing_subscriptions` | 1 | Org admins only |
| `cc_usage_events` | 1 | Org admins only |
| `cc_risk_flags` | 1 | Org members |

Helper functions: `cc_is_org_member(UUID)` · `cc_is_org_admin(UUID)` — both `SECURITY DEFINER`, safe to call from RLS policies without privilege escalation.

---

## Indexes

- **B-tree:** org_id, user_id, session_id, claim_id, status, created_at on all major tables
- **Partial:** `cc_jobs(status, priority, queued_at) WHERE status IN ('queued','running')` — efficient queue drain
- **GIN:** `cc_citations` FTS on `title || abstract` using English dictionary
- **ivfflat (pgvector):** `claims.embedding`, `evidence_sources.embedding`, `cc_citations.embedding` — cosine ANN
- **Trigram (pg_trgm):** available for fuzzy text search on claim text

---

## Conventions

- All tables prefixed `cc_` to avoid conflicts with other projects in the shared Supabase instance
- Soft deletes via `deleted_at TIMESTAMPTZ` on sessions, claims, evidence_sources, generated_outputs
- `updated_at` triggers on cc_orgs, cc_profiles, cc_connectors, cc_billing_subscriptions
- `cc_audit_log` is append-only (UPDATE/DELETE blocked by triggers)
- Service role key used only server-side; anon key + RLS used client-side
