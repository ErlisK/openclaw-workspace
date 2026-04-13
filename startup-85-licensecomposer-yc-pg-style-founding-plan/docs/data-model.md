# Data Model — PactPack (LicenseComposer)

**Supabase project:** `yxkeyftjkblrikxserbs.supabase.co`  
**Last updated:** 2026-04-12  
**Migrations applied:** 007 (`001_initial_schema` → `007_clauses_fill_gaps`)

---

## Entity Relationship Overview

```
auth.users (Supabase managed)
    │
    ├── users           (app-level profile extension)
    ├── profiles        (display name, plan, avatar)
    │
    ├── generated_contracts ──── exports
    │       │                       │
    │       └── license_pages ──── license_acceptances
    │               │
    │               └── generated_licenses ── license_events
    │                           │
    │                           └── verifications
    │
    ├── purchases ──── entitlements
    ├── subscriptions
    ├── checkouts
    ├── contract_packs ── pack_versions
    │
    └── lawyer_review_requests

templates ── template_categories
    │── template_versions
    │── wizard_schemas ── wizard_questions
    └── clauses (many-to-many via template_versions.clause_ids)

jurisdictions   (reference: US, UK, …)
platforms       (reference: itchio, gumroad, opensea, …)
audit_logs
events
```

---

## Core Tables

### `users`
App-level extension of `auth.users`. Created automatically by `handle_new_user` trigger.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid PK` | FK → `auth.users.id` |
| `email` | `text` | Copied from auth |
| `plan` | `text` | `free` \| `pro` \| `lifetime` |
| `stripe_customer_id` | `text` | Stripe customer ID |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### `profiles`
Display/social data. Created alongside `users` on signup.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid PK` | FK → `auth.users.id` |
| `display_name` | `text` | |
| `avatar_url` | `text` | |
| `bio` | `text` | |
| `website_url` | `text` | |
| `creator_type` | `text` | `artist` \| `game_dev` \| `musician` \| etc. |
| `preferred_jurisdiction` | `text` | Default `US` |
| `onboarding_completed` | `boolean` | |
| `created_at` / `updated_at` | `timestamptz` | |

---

## Template Marketplace

### `templates`
The top-level contract type a user can generate.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid PK` | |
| `slug` | `text UNIQUE` | e.g. `commission-agreement-us` |
| `name` | `text` | Display name |
| `description` | `text` | |
| `document_type` | `text` | `commission_agreement` \| `digital_asset_license` \| `collaborator_split` \| `nft_license` |
| `tier` | `text` | `free` \| `premium` |
| `price_cents` | `int` | 0 for free, 500 for $5 premium |
| `jurisdictions` | `text[]` | e.g. `{US, UK}` |
| `platforms` | `text[]` | e.g. `{itchio, gumroad}` |
| `vetting_status` | `text` | `draft` \| `published` \| `deprecated` |
| `is_active` | `boolean` | |
| `is_featured` | `boolean` | |
| `lawyer_reviewed` | `boolean` | |
| `lawyer_name` | `text` | Attorney name if reviewed |
| `current_version` | `text` | e.g. `1.2.0` |
| `template_hash` | `text` | SHA-256 of canonical template fields |
| `changelog` | `text[]` | Ordered change notes |
| `generator_version` | `text` | App version that last updated this |
| `tags` | `text[]` | |
| `created_at` / `updated_at` | `timestamptz` | |

### `template_categories`
| Column | Type |
|--------|------|
| `id` | `uuid PK` |
| `slug` | `text UNIQUE` |
| `name` | `text` |
| `icon` | `text` |
| `description` | `text` |
| `sort_order` | `int` |

### `template_versions`
Immutable version history for each template.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid PK` | |
| `template_id` | `uuid FK` → `templates` | |
| `version` | `text` | Semantic version e.g. `1.2.0` |
| `clause_ids` | `uuid[]` | Ordered clause IDs for this version |
| `clause_hashes` | `jsonb` | `[{slug, hash, version}]` — immutable at snapshot time |
| `jurisdiction_codes` | `text[]` | |
| `platform_codes` | `text[]` | |
| `diff_from_previous` | `text` | Human-readable diff summary |
| `breaking_changes` | `boolean` | |
| `lawyer_name` | `text` | |
| `lawyer_reviewed_at` | `timestamptz` | |
| `generator_version` | `text` | |
| `published_at` | `timestamptz` | NULL = draft |
| `created_at` | `timestamptz` | |

---

## Clause Marketplace

### `clauses`
Atomic legal clauses assembled into templates.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid PK` | |
| `slug` | `text UNIQUE` | e.g. `commission-scope-of-work` |
| `title` | `text` | |
| `category` | `text` | `commission` \| `asset_license` \| `collaboration` \| `nft` \| `general` |
| `plain_english` | `text` | **Required** — plain-language summary |
| `legal_text` | `text` | Full legal language with `{{variable}}` placeholders |
| `variables` | `jsonb` | Variable definitions: `{name, type, default, description}[]` |
| `applies_to` | `text[]` | Document types this clause applies to |
| `jurisdiction_codes` | `text[]` | `{US, UK, …}` |
| `platform_codes` | `text[]` | `{itchio, gumroad, opensea}` |
| `tags` | `text[]` | Searchable tags |
| `risk_notes` | `text` | Why this clause matters — shown in wizard |
| `vetting_status` | `text` | `community` \| `under_review` \| `lawyer_approved` \| `deprecated` |
| `is_required` | `boolean` | Cannot be removed from template |
| `is_active` | `boolean` | |
| `lawyer_reviewed` | `boolean` | |
| `content_hash` | `text` | SHA-256 of `legal_text` — auto-stamped by trigger |
| `changelog` | `text[]` | |
| `generator_version` | `text` | |
| `source_attribution` | `text` | e.g. `CC-BY-4.0 clause adapted from SFWA` |
| `review_notes` | `text` | Internal review comments |
| `deprecated_at` | `timestamptz` | |
| `superseded_by` | `uuid FK` → `clauses` | Points to replacement clause |
| `version` | `text` | |
| `sort_order` | `int` | |
| `created_at` / `updated_at` | `timestamptz` | |

**Current seed counts:** 40 clauses — 12 commission, 12 asset_license, 12 collaboration, 3 nft, 1 general.

---

## Wizard

### `wizard_schemas`
One schema per document_type × jurisdiction.

| Column | Type |
|--------|------|
| `id` | `uuid PK` |
| `document_type` | `text` |
| `jurisdiction_code` | `text` |
| `version` | `text` |
| `title` | `text` |
| `description` | `text` |
| `is_active` | `boolean` |
| `created_at` | `timestamptz` |

### `wizard_questions`
Ordered questions within a schema.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid PK` | |
| `schema_id` | `uuid FK` → `wizard_schemas` | |
| `question_key` | `text` | e.g. `work_type`, `revision_count` |
| `label` | `text` | UI question text |
| `description` | `text` | Tooltip/helper text |
| `input_type` | `text` | `select` \| `text` \| `number` \| `boolean` \| `multiselect` |
| `options` | `jsonb` | `[{value, label}]` for select types |
| `required` | `boolean` | |
| `affects_clauses` | `text[]` | Clause slugs this question gates |
| `sort_order` | `int` | |
| `created_at` | `timestamptz` | |

---

## Contract Generation

### `generated_contracts`
One row per exported contract pack.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid PK` | |
| `user_id` | `uuid FK` → `users` | |
| `template_id` | `uuid FK` → `templates` | |
| `template_slug` | `text` | Denormalised |
| `template_version` | `text` | Denormalised at generation time |
| `jurisdiction_code` | `text` | Resolved jurisdiction |
| `platform_code` | `text` | Target platform |
| `answers` | `jsonb` | Wizard answers `{question_key: value}` |
| `rendered_content` | `text` | Final merged document text |
| `clause_hashes` | `jsonb` | `[{slug, hash, version}]` at generation time |
| `changelog` | `text[]` | |
| `generated_at` | `timestamptz` | Explicit generation timestamp |
| `generator_version` | `text` | App version |
| `verification_hash` | `text` | SHA-256(id \|\| template_hash \|\| clause_hashes \|\| version \|\| generated_at) |
| `provenance_verified` | `boolean` | Set by `verify_contract_provenance()` |
| `verification_url` | `text` | Public URL for counterparty verification |
| `document_id` | `text` | Human-readable ID e.g. `LC-2026-A1B2` |
| `status` | `text` | `draft` \| `final` \| `superseded` |
| `created_at` / `updated_at` | `timestamptz` | |

### `exports`
PDF/text export records.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid PK` | |
| `user_id` | `uuid FK` → `users` | |
| `contract_id` | `uuid FK` → `generated_contracts` | |
| `format` | `text` | `pdf` \| `txt` \| `docx` |
| `storage_path` | `text` | Supabase Storage path |
| `download_url` | `text` | Signed URL |
| `expires_at` | `timestamptz` | |
| `created_at` | `timestamptz` | |

---

## License Pages & Verification

### `license_pages`
Public-facing verification pages embedded in storefronts.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid PK` | |
| `user_id` | `uuid FK` → `users` | |
| `contract_id` | `uuid FK` → `generated_contracts` | |
| `slug` | `text UNIQUE` | URL-safe slug |
| `title` | `text` | |
| `is_public` | `boolean` | |
| `is_active` | `boolean` | |
| `badge_svg` | `text` | Embeddable SVG badge |
| `embed_code` | `text` | `<img>` tag for storefronts |
| `view_count` | `int` | |
| `created_at` / `updated_at` | `timestamptz` | |

### `license_acceptances`
Buyer acknowledgements (click-wrap acceptance log).

| Column | Type |
|--------|------|
| `id` | `uuid PK` |
| `license_id` | `uuid FK` → `generated_licenses` |
| `buyer_email` | `text` |
| `ip_address` | `text` |
| `user_agent` | `text` |
| `accepted_at` | `timestamptz` |

### `verifications`
Provenance verification attempts by counterparties.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid PK` | |
| `license_id` | `uuid` | |
| `contract_id` | `uuid` | |
| `verification_hash` | `text` | Submitted hash |
| `is_valid` | `boolean` | Result |
| `issues` | `text[]` | Validation failure reasons |
| `verifier_ip` | `text` | |
| `created_at` | `timestamptz` | |

---

## Payments & Entitlements

### `purchases`
One-time template purchases ($5 premium templates).

| Column | Type |
|--------|------|
| `id` | `uuid PK` |
| `user_id` | `uuid FK` → `users` |
| `template_id` | `uuid FK` → `templates` |
| `stripe_payment_intent_id` | `text` |
| `amount_cents` | `int` |
| `currency` | `text` |
| `status` | `text` |
| `created_at` | `timestamptz` |

### `subscriptions`
$9/year unlimited-export subscription.

| Column | Type |
|--------|------|
| `id` | `uuid PK` |
| `user_id` | `uuid FK` → `users` |
| `stripe_subscription_id` | `text` |
| `stripe_price_id` | `text` |
| `status` | `text` |
| `current_period_start` | `timestamptz` |
| `current_period_end` | `timestamptz` |
| `cancel_at_period_end` | `boolean` |
| `created_at` / `updated_at` | `timestamptz` |

### `entitlements`
Resolved access rights (set by service_role after payment webhook).

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid PK` | |
| `user_id` | `uuid FK` → `users` | |
| `template_id` | `uuid FK` → `templates` | NULL = subscription (all templates) |
| `source` | `text` | `purchase` \| `subscription` \| `free_tier` |
| `expires_at` | `timestamptz` | NULL = perpetual |
| `created_at` | `timestamptz` | |

---

## Reference Tables

### `jurisdictions`
| Column | Type |
|--------|------|
| `id` | `uuid PK` |
| `code` | `text UNIQUE` |
| `name` | `text` |
| `is_supported_v1` | `boolean` |
| `governing_law_phrase` | `text` |

### `platforms`
| Column | Type |
|--------|------|
| `id` | `uuid PK` |
| `slug` | `text UNIQUE` |
| `name` | `text` |
| `url` | `text` |
| `supported_document_types` | `text[]` |
| `platform_fee_pct` | `numeric` |
| `notes` | `text` |

---

## Audit

### `audit_logs`
| Column | Type |
|--------|------|
| `id` | `uuid PK` |
| `user_id` | `uuid` |
| `actor_type` | `text` |
| `action` | `text` |
| `resource_type` | `text` |
| `resource_id` | `uuid` |
| `resource_slug` | `text` |
| `old_values` | `jsonb` |
| `new_values` | `jsonb` |
| `ip_address` | `text` |
| `user_agent` | `text` |
| `metadata` | `jsonb` |
| `created_at` | `timestamptz` |

---

## DB Functions & Triggers

| Name | Type | Purpose |
|------|------|---------|
| `handle_new_user()` | Trigger fn | Auto-creates `users` + `profiles` rows on `auth.users` INSERT |
| `stamp_clause_hash()` | Trigger fn | Auto-computes `content_hash` on `clauses.legal_text` change |
| `stamp_template_hash()` | Trigger fn | Auto-computes `template_hash` on `templates` change |
| `verify_contract_provenance(UUID)` | Function | Validates full provenance chain; returns `{valid, issues[]}` |
| `is_service_role()` | Function | Returns `true` when current role is `service_role` (used in RLS) |

---

## Geofencing (v1)

Only `US` and `UK` are fully supported in v1. See `lib/jurisdiction.ts`:

```ts
V1_JURISDICTIONS = ['US', 'UK']
```

The `/api/templates` route returns `{ templates: [], geofenced: true, warning: "..." }` for other jurisdictions unless `allow_unsupported=true` is passed. All 40 clauses carry `jurisdiction_codes = {US, UK}`.
