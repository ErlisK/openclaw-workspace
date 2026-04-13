# KidColoring — Domain Model
## Phase 2: Define · Entity Relationships · Canonical Names

> This document is the authoritative reference for the KidColoring domain model.  
> It defines every entity, its responsibilities, its relationships, and how it maps to the Supabase schema.  
> All engineering, product, and design decisions must be consistent with this model.

---

## Entity Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          KIDCOLORING DOMAIN MODEL                           │
│                                                                             │
│   auth.users ─────────► parents (profiles)                                 │
│                              │                                              │
│                              │ 1:N                                          │
│                              ▼                                              │
│                         child_profiles (children)                           │
│                              │                                              │
│                              │ 1:N (optional — anonymous OK)               │
│                              ▼                                              │
│   session_id ──────────► prompts (stories) ─────► moderation_events        │
│                              │                                              │
│                              │ 1:1                                          │
│                              ▼                                              │
│                         generation_jobs ──────────► moderation_events      │
│                              │                                              │
│                              │ 1:1                                          │
│                              ▼                                              │
│                            books ──────────────────► referrals             │
│                              │                                              │
│                              │ 1:N                                          │
│                              ▼                                              │
│                         coloring_pages (pages) ────► moderation_events     │
│                              │                                              │
│                              │ aggregated                                   │
│                              ▼                                              │
│                      satisfaction_ratings                                   │
│                                                                             │
│   All user actions ────────────────────────────────► events (append-only)  │
│   A/B test variants ───────────────────────────────► experiments           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Entities

### 1. `parents` (maps to: `profiles` table)

**Responsibility:** Represents an authenticated adult user — either a parent or a classroom teacher.  
Children never have accounts. `parents` is the root of all ownership in the system.

**Canonical name in product:** "parent" (consumer), "teacher" (B2B)  
**Supabase table:** `profiles`  
**View alias:** `CREATE VIEW parents AS SELECT * FROM profiles WHERE role IN ('parent','teacher','admin')`

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | uuid PK | Mirrors `auth.users.id` |
| `role` | text | `parent` \| `teacher` \| `admin` |
| `display_name` | text | Optional first name or username |
| `coppa_agreed` | boolean | Parental consent recorded |
| `coppa_agreed_at` | timestamptz | Timestamp of consent (legal record, 7-year retention) |
| `is_subscribed` | boolean | Active subscription flag |
| `subscription_tier` | text | `free` \| `monthly` \| `annual` \| `school` |
| `books_created` | int | Denormalized counter |
| `referral_code` | text UNIQUE | Auto-generated 8-char code |
| `referred_by` | uuid FK→profiles | Self-referencing referral chain |
| `ip_country` | text | For GDPR/COPPA geo-gating |
| `deleted_at` | timestamptz | Soft-delete; hard-deleted after 30 days by cron |

**Key invariants:**
- Created automatically when a user signs up via `auth.users` trigger
- `coppa_agreed` must be `true` before any `prompt` can be created
- No child ever appears in this table

---

### 2. `child_profiles` (maps to: `children` table)

**Responsibility:** Represents a child associated with a parent account. Stores only the minimum data needed to personalize book generation. COPPA-compliant: no date of birth, no real name, no direct auth.

**Canonical name in product:** "child" / "little one" (UI copy)  
**Supabase table:** `children`  
**View alias:** `CREATE VIEW child_profiles AS SELECT * FROM children`

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | uuid PK | |
| `parent_id` | uuid FK→profiles | Owning parent/teacher |
| `nickname` | text | Parent-chosen, not necessarily real name |
| `age_years` | smallint | Integer only — never date of birth |
| `interests` | text[] | Optional: `['dinosaurs','space','unicorns']` |
| `deleted_at` | timestamptz | Soft-delete with 30-day grace |

**Key invariants:**
- `parent_id` is always an adult — never another child
- `age_years` drives line weight calibration: 2-4yo → 5pt lines, 5-7yo → 3pt, 8-11yo → 1.5pt
- A `prompt` can reference `child_profiles.id` (optional — anonymous sessions also allowed)
- Maximum 5 child profiles per parent (enforced at application layer)

**Relationships:**
- `parent_id` → `parents.id` (many-to-one)
- `prompts.child_id` → `child_profiles.id` (one-to-many, optional)

---

### 3. `prompts` (maps to: `stories` table)

**Responsibility:** The raw creative input from a parent or child that seeds book generation. Contains the unprocessed text (wizard-assembled or free-typed or voice-transcribed), plus safety assessment metadata.

**Canonical name in product:** "story" (kid UI), "prompt" (internal/engineering)  
**Supabase table:** `stories`  
**View alias:** `CREATE VIEW prompts AS SELECT * FROM stories`

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | uuid PK | |
| `user_id` | uuid FK→profiles | Owning parent |
| `child_id` | uuid FK→children | Optional: which child this is for |
| `session_id` | text | Anonymous session token (pre-auth or post-auth) |
| `input_variant` | text | `blank` \| `wizard` \| `voice` |
| `raw_text` | text | The assembled prompt text. **Cleared to `[deleted]` 90 days after delivery** |
| `age_range` | text | `2-4` \| `4-6` \| `6-8` \| `8-11` \| `11-13` |
| `child_age_years` | smallint | Snapshot at time of creation |
| `wizard_steps` | jsonb | Step-by-step selections if `input_variant='wizard'` |
| `safety_passed` | boolean | Layer 1 result (OpenAI Moderation) |
| `safety_score` | numeric(4,3) | Highest category score (lower = safer) |

**Key invariants:**
- `safety_passed = false` → no `generation_job` is ever created
- `raw_text` is purged (not deleted — row retained for analytics integrity) at 90 days
- One `prompt` produces exactly one `generation_job` (1:1)
- `wizard_steps` schema: `{characters: string[], setting: string, action: string, hero_name?: string}`

**Relationships:**
- `user_id` → `parents.id`
- `child_id` → `child_profiles.id` (optional)
- `id` → `generation_jobs.story_id` (one-to-one)
- `id` → `moderation_events.story_id` (one-to-many)

---

### 4. `generation_jobs` *(new in v1.0)*

**Responsibility:** The explicit state machine for the AI generation pipeline. One job per prompt. Tracks the full lifecycle from queued to delivered, including cost, timing, error codes, and retry state. Decouples the prompt from the generation process — allows retries, cancellation, and async progress without touching the prompt record.

**Canonical name:** "generation_job" (engineering) / "book creation" (product)  
**Supabase table:** `generation_jobs` *(new)*

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | uuid PK | |
| `story_id` | uuid FK→stories UNIQUE | Exactly one job per prompt |
| `book_id` | uuid FK→books | Set when book record is created |
| `user_id` | uuid FK→profiles | Denormalized for fast queries |
| `status` | text | State machine (see below) |
| `input_prompt` | text | Processed/sanitized prompt sent to model. Cleared at 90d |
| `model_id` | text | e.g. `stability-ai/stable-diffusion-xl` |
| `model_version` | text | Exact model checkpoint hash |
| `total_pages` | smallint | Target page count (default 12) |
| `pages_completed` | smallint | Pages with `image_url` written |
| `first_page_ms` | int | Latency: `dispatched_at` → first page |
| `total_ms` | int | Latency: `dispatched_at` → `completed_at` |
| `cost_usd` | numeric(8,4) | AI API cost for this job |
| `error_code` | text | Structured error: `SAFETY_BLOCKED`, `TIMEOUT`, `MODEL_ERROR`, `QUOTA_EXCEEDED` |
| `error_message` | text | Human-readable error detail |
| `retry_count` | smallint | Number of automatic retries attempted |
| `dispatched_at` | timestamptz | When job was sent to AI provider |
| `first_page_at` | timestamptz | When first page image was received |
| `completed_at` | timestamptz | When all pages were generated |
| `failed_at` | timestamptz | When final failure was recorded |

**Status machine:**
```
queued → dispatched → generating → partial → complete
                  ↓                    ↓
               failed ← ← ← ← ← ← failed
                  ↓
             cancelled
```

| Status | Meaning |
|--------|---------|
| `queued` | Created, awaiting worker pickup |
| `dispatched` | Sent to AI provider, awaiting first response |
| `generating` | First page received, remainder in progress |
| `partial` | Interrupted; some pages exist |
| `complete` | All pages generated; book status → `preview_ready` |
| `failed` | Unrecoverable error; parent notified; refund triggered |
| `cancelled` | Cancelled by user or system before completion |

**Key invariants:**
- `UNIQUE(story_id)` — exactly one job per prompt
- `status = 'failed'` → trigger refund flow + `moderation_events` entry if safety-related
- `cost_usd` written by worker on completion (used for unit economics tracking)
- Job record is never deleted; retained for cost analytics and safety audit

**Relationships:**
- `story_id` → `prompts.id` (one-to-one, UNIQUE)
- `book_id` → `books.id` (set on book creation)
- `id` → `moderation_events.generation_job_id` (one-to-many)
- `id` → `coloring_pages.generation_job_id` (one-to-many)

---

### 5. `books`

**Responsibility:** The finished artifact — a PDF-ready collection of coloring pages associated with a prompt and a product type. Owns the payment, delivery, and lifecycle state for the purchasable product.

**Supabase table:** `books` (unchanged)

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | uuid PK | |
| `story_id` | uuid FK→stories | Source prompt |
| `user_id` | uuid FK→profiles | Purchaser |
| `status` | text | `queued→generating→preview_ready→failed→purchased→delivered` |
| `product_type` | text | `single` \| `party_pack` \| `subscription_book` |
| `page_count` | smallint | Actual page count |
| `price_paid_cents` | int | Price in cents at time of purchase |
| `price_variant` | text | Which A/B pricing variant was shown |
| `pdf_url` | text | Signed URL (24h expiry by default) |
| `generation_ms` | int | Denormalized from generation_job.total_ms |
| `first_page_ms` | int | Denormalized from generation_job.first_page_ms |
| `quality_score` | numeric(3,2) | Aggregate quality (0–1) |
| `party_pack_qty` | smallint | For party_pack type: number of copies |
| `referral_code` | text | Used referral code at purchase |
| `purchased_at` | timestamptz | |
| `delivered_at` | timestamptz | When PDF download completed |
| `deleted_at` | timestamptz | Soft-delete |

**Relationships:**
- `story_id` → `prompts.id`
- `user_id` → `parents.id`
- `id` → `coloring_pages.book_id` (one-to-many)
- `id` → `satisfaction_ratings.book_id` (one-to-many)

---

### 6. `coloring_pages` (maps to: `pages` table)

**Responsibility:** Individual generated pages within a book. One record per page per book. Stores the generated image URL, the per-page prompt, generation latency, and quality score. The first two pages are preview pages (shown watermarked before purchase).

**Canonical name:** "coloring_page" (engineering) / "page" (product)  
**Supabase table:** `pages`  
**View alias:** `CREATE VIEW coloring_pages AS SELECT * FROM pages`

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | uuid PK | |
| `book_id` | uuid FK→books | |
| `generation_job_id` | uuid FK→generation_jobs | *(new in v1.0)* — links page to its job |
| `page_index` | smallint | 0-based position in book |
| `prompt_used` | text | The per-page prompt fragment sent to the model |
| `image_url` | text | CDN URL of generated image (PNG, 300 DPI equivalent) |
| `vector_url` | text | Optional SVG version for professional print |
| `generation_ms` | int | Time for this specific page |
| `quality_score` | numeric(3,2) | Per-page quality score from classifier |
| `is_preview` | boolean | True for pages 0 and 1 |
| `is_cover` | boolean | True for page 0 (cover page) |

**Key invariants:**
- `UNIQUE(book_id, page_index)` — no duplicate page positions
- `is_preview = true` for `page_index IN (0, 1)` (enforced by trigger)
- `is_cover = true` for `page_index = 0` only
- Page 0 (cover) always includes child's name + hero illustration

**Relationships:**
- `book_id` → `books.id`
- `generation_job_id` → `generation_jobs.id` *(new)*
- `id` → `moderation_events.page_id` (one-to-many)

---

### 7. `moderation_events` *(new in v1.0)*

**Responsibility:** Append-only log of every content moderation decision made by the system or a human reviewer. Spans three layers: input text filtering, output image classification, and manual review. This is the safety audit trail required by COPPA compliance and the three-layer safety architecture (Guardrail G-07).

**Canonical name:** "moderation_event" (engineering) / "safety check" (compliance)  
**Supabase table:** `moderation_events` *(new)*

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | bigserial PK | Append-only; bigserial for high-volume |
| `event_type` | text | `input_text` \| `output_image` \| `manual_review` \| `appeal` \| `override` |
| `result` | text | `approved` \| `blocked` \| `flagged` \| `escalated` \| `overridden` |
| `story_id` | uuid FK→stories | Source prompt (input_text events) |
| `generation_job_id` | uuid FK→generation_jobs | Associated job |
| `page_id` | uuid FK→pages | Specific page (output_image events) |
| `user_id` | uuid FK→profiles | Owning parent (for refund/notification routing) |
| `classifier` | text | `openai_moderation` \| `google_vision_safesearch` \| `manual` \| `internal_rules` |
| `scores` | jsonb | Raw classifier output, e.g. `{"sexual": 0.001, "violence": 0.003}` |
| `blocked_categories` | text[] | Which categories triggered the block |
| `input_text_snippet` | text | First 200 chars of input (for manual review). **Cleared at 90 days** |
| `reviewer_id` | uuid | For manual review events: which admin reviewed |
| `notes` | text | Manual reviewer notes |
| `created_at` | timestamptz NOT NULL | Immutable — never updated |

**Key invariants:**
- Append-only: no UPDATE or DELETE ever
- `result = 'blocked'` on an `input_text` event → `stories.safety_passed = false` → no job created
- `result = 'flagged'` on an `output_image` event → `books.status = 'failed'` → refund triggered
- `input_text_snippet` cleared (not deleted) at 90 days (same schedule as `stories.raw_text`)
- Only `service_role` can write; no client-side RLS write access

**Relationships:**
- `story_id` → `prompts.id`
- `generation_job_id` → `generation_jobs.id`
- `page_id` → `coloring_pages.id`
- `user_id` → `parents.id`

---

## Supporting Entities

### `events` (analytics stream)
Append-only funnel analytics log. Not the same as `moderation_events`. See `event-taxonomy.md` for full event list. Contains all product funnel events (page views, wizard steps, checkouts, etc.).

### `satisfaction_ratings`
Post-delivery quality signals. Four rating types: `overall`, `print_quality`, `character_consistency`, `story_match`. Used to test assumptions A2 (engagement), A3 (character consistency), B2 (print quality).

### `referrals`
Referral codes and K-factor tracking. One row per unique referral code. `referrals.referral_code` = `profiles.referral_code`.

### `experiments`
A/B experiment registry. Pre-seeded with 4 experiments. Variant assignment happens at session start; stored in `events.properties.variant`.

---

## Entity Relationship Summary

```sql
-- Ownership chain (top-down)
auth.users (1) → profiles/parents (1) → children/child_profiles (N)

-- Story → generation pipeline
prompts/stories (1) → generation_jobs (1) → books (1) → pages/coloring_pages (N)

-- Safety at every layer
prompts/stories (1) → moderation_events (N)  [input_text events]
generation_jobs (1) → moderation_events (N)  [job-level events]
pages/coloring_pages (1) → moderation_events (N)  [output_image events]

-- Product → analytics
books (1) → satisfaction_ratings (N)
all entities → events (N)  [funnel analytics, append-only]

-- Growth
profiles/parents (1) → referrals (N)
```

---

## Naming Conventions

| Canonical Domain Name | Supabase Table | View Alias | Product UI Copy |
|-----------------------|---------------|------------|-----------------|
| `parent` | `profiles` | `parents` | "Your account" |
| `child_profile` | `children` | `child_profiles` | "Your little ones" |
| `prompt` | `stories` | `prompts` | "Your story" |
| `generation_job` | `generation_jobs` | — (native) | "Creating your book..." |
| `book` | `books` | — (native) | "Your coloring book" |
| `coloring_page` | `pages` | `coloring_pages` | "Page [N]" |
| `moderation_event` | `moderation_events` | — (native) | (internal only) |

---

## State Machines

### Book Lifecycle
```
[prompt submitted] → [safety check] → [generation_job: queued]
       ↓ safety fail        ↓ dispatched
  [blocked]          [generation_job: generating]
                            ↓ pages arriving
                     [books.status: generating]
                            ↓ all pages done
                     [books.status: preview_ready]
                            ↓ parent approves + pays
                     [books.status: purchased]
                            ↓ PDF sent
                     [books.status: delivered]
                            ↓ 90 days
                     [stories.raw_text → "[deleted]"]
```

### Moderation Decision Tree
```
User submits story text
        ↓
  [Layer 1: OpenAI Moderation]
  safety_passed = false? → moderation_events(input_text, blocked) → STOP
        ↓ passed
  [Layer 2: Prompt sanitization in system prompt]
  AI generates pages
        ↓
  [Layer 3: Google Vision SafeSearch per page]
  score > threshold? → moderation_events(output_image, flagged) → refund
        ↓ all clear
  moderation_events(output_image, approved)
  books.status → preview_ready
```

---

## Data Retention Schedule

| Entity / Field | Retention | Mechanism |
|----------------|-----------|-----------|
| `profiles.*` | Until deletion + 30d grace | soft/hard delete |
| `children.*` | Until parent deletes + 30d | soft/hard delete |
| `stories.raw_text` | 90 days after book delivery | `purge_expired_story_text()` nightly |
| `generation_jobs.input_prompt` | 90 days after completion | `purge_expired_job_prompts()` nightly |
| `moderation_events.input_text_snippet` | 90 days | `purge_expired_moderation_text()` nightly |
| `events.*` | 2 years (analytics) | Manual archive process |
| `books.*` | 7 years (financial record) | Legal hold; soft-delete suppressed |
| `moderation_events.*` | 7 years (compliance record) | Append-only; no delete |

---

*Domain model version: 1.0 · Derived from Phase 1 (507 research snippets) + Phase 2 (guardrails.md, pov-hmw.md)*  
*Next review: Phase 3 kick-off*
