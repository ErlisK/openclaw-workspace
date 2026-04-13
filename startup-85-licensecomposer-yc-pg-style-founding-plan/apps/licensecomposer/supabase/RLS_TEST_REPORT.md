# RLS Test Report

**Date:** 2026-04-12  
**Supabase project:** yxkeyftjkblrikxserbs  
**Method:** Anon key (unauthenticated requests) + service-role key verification

---

## Test Results

| Table | Anon read | Expected | Result |
|-------|-----------|----------|--------|
| `users` | `[]` | `[]` (row isolation) | ✅ PASS |
| `profiles` | `[]` | `[]` (row isolation) | ✅ PASS |
| `subscriptions` | `[]` | `[]` (row isolation) | ✅ PASS |
| `purchases` | `[]` | `[]` (row isolation) | ✅ PASS |
| `generated_licenses` | `[]` | `[]` (non-public only) | ✅ PASS |
| `generated_contracts` | `[]` | `[]` (owner-only) | ✅ PASS |
| `entitlements` | `[]` | `[]` (owner-only) | ✅ PASS |
| `audit_logs` | `[]` | `[]` (owner-only) | ✅ PASS |
| `templates` | rows returned | public read ✅ | ✅ PASS |
| `clauses` | rows returned | public read ✅ | ✅ PASS |
| `jurisdictions` | rows returned | public read ✅ | ✅ PASS |
| `platforms` | rows returned | public read ✅ | ✅ PASS |
| `template_versions` | rows returned | public read ✅ | ✅ PASS |
| `wizard_schemas` | rows returned | public read ✅ | ✅ PASS |

## RLS Policies Summary

### User-Owned Tables (row isolation)
- `users`: `auth.uid() = id`
- `profiles`: `auth.uid() = id`
- `subscriptions`: `auth.uid() = user_id`
- `purchases`: `auth.uid() = user_id`
- `entitlements`: `auth.uid() = user_id` (SELECT only)
- `generated_contracts`: `auth.uid() = user_id`
- `exports`: `auth.uid() = user_id`
- `license_pages`: `auth.uid() = user_id` (+ public read if `is_public = TRUE`)
- `audit_logs`: `auth.uid() = user_id` (SELECT only; INSERT open for system)
- `license_acceptances`: INSERT open (buyers); SELECT by license owner

### Public Read Tables
- `templates`: `is_active = TRUE`
- `clauses`: `is_active = TRUE`
- `jurisdictions`: all rows
- `platforms`: all rows
- `template_categories`: all rows
- `template_versions`: all rows
- `wizard_schemas`: all rows
- `wizard_questions`: all rows

### Hybrid (public read with owner write)
- `generated_licenses`: public read if `is_public = TRUE AND is_active = TRUE`; owner ALL
- `contract_packs`: public read if `is_public = TRUE`; owner ALL
- `license_pages`: public read if `is_public = TRUE AND is_active = TRUE`; owner ALL
