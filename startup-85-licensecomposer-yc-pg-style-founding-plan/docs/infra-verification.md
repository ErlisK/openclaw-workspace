# Infrastructure Verification — LicenseComposer

**Date:** 2026-04-12  
**Status:** ✅ All systems operational

---

## 1. GitHub Monorepo

| Check | Result |
|-------|--------|
| Repo | `github.com/ErlisK/openclaw-workspace` |
| App subfolder | `startup-85-licensecomposer-yc-pg-style-founding-plan/apps/licensecomposer/` |
| Framework | Next.js App Router + TypeScript |
| Branch | `main` (up to date, clean) |

---

## 2. Vercel Project

| Check | Result |
|-------|--------|
| Project ID | `prj_btrxNgnIFHgbS5Ewuyx6xbvNRHLB` |
| Root directory | `startup-85-licensecomposer-yc-pg-style-founding-plan/apps/licensecomposer` |
| Framework detected | `nextjs` |
| Latest deploy | HTTP 200 — *"LicenseComposer — Plain-English Contracts for Indie Creators"* |
| Domain: pactpack.com | ✅ verified |
| Domain: licensecomposer.com | ✅ verified |
| Env vars set | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` |

---

## 3. Supabase Schema

**Project:** `yxkeyftjkblrikxserbs.supabase.co`  
**Migrations applied:** 5

| Migration | Description |
|-----------|-------------|
| `001_initial_schema.sql` | Core tables: users, profiles, templates, clauses, categories, wizard_schemas |
| `002_auth_hooks.sql` | Auth triggers: auto-create profile on signup, plan management |
| `003_extended_schema.sql` | generated_contracts, exports, license_pages, purchases, entitlements, verifications |
| `004_provenance_metadata.sql` | content_hash, changelog, generator_version, source_attribution on clauses |
| `005_rls_hardening.sql` | vetting_status on templates, is_service_role() helper, comprehensive RLS policies |

**Tables (28 total):**
`users`, `profiles`, `templates`, `template_categories`, `template_versions`,
`clauses`, `wizard_schemas`, `wizard_questions`, `generated_contracts`, `exports`,
`license_pages`, `license_acceptances`, `pack_versions`, `contract_packs`,
`purchases`, `entitlements`, `subscriptions`, `checkouts`, `verifications`,
`lawyer_review_requests`, `license_events`, `generated_licenses`, `audit_logs`,
`events`, `jurisdictions`, `platforms`, `user_unlocked_templates`

---

## 4. Seed Data

| Entity | Count | Threshold |
|--------|-------|-----------|
| Templates | **18** | ≥ 6 ✅ |
| Clauses | **34** | ≥ 30 ✅ |
| Template categories | 8 | — |
| Template versions | 30 | — |
| Wizard schemas | 16 | — |

**Template types seeded:**
- `commission_agreement` × 6 (US + UK + personal/commercial variants)
- `digital_asset_license` × 8 (game assets, fonts, audio, 3D, brushes, photos, stock, templates)
- `collaborator_split` × 3 (US, two-person game dev, creative duo)
- `nft_license` × 1 (OpenSea commercial)

**Clause categories in seed:** scope_of_work, revisions, payment, ip_rights, jurisdiction,
platform_specific, confidentiality, termination, representations, indemnification,
revenue_split, vesting, nft_rights

---

## 5. RLS Row Isolation Tests

| Test | Expected | Result |
|------|----------|--------|
| `anon` reads `users` | 0 rows (blocked) | ✅ 0 rows |
| `anon` reads published `templates` | > 0 rows (allowed) | ✅ 18 rows |
| `anon` reads `generated_contracts` | 0 rows (blocked) | ✅ 0 rows |
| `anon` reads `purchases` | 0 rows (blocked) | ✅ 0 rows |
| `service_role` reads all `templates` | 18 rows | ✅ 18 rows |

---

## 6. Seed Script Location

```
apps/licensecomposer/supabase/seed/seed.js
apps/licensecomposer/seed.js  (symlink / copy)
```

Run with:
```bash
SUPABASE_URL=https://yxkeyftjkblrikxserbs.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<key> \
node apps/licensecomposer/supabase/seed/seed.js
```

---

*All success criteria for this phase are met.*
