# TeachRepo — Supabase Database (v2)

**Provider:** Supabase (PostgreSQL + RLS)  
**Project ref:** `zkwyfjrgmvpgfbaqwxsb` (us-east-1, ACTIVE_HEALTHY)  
**Schema version:** 2.0

---

## Files

| File | Description |
|------|-------------|
| `schema.sql` | Full v2 schema — 13 tables, indexes, triggers, helper functions |
| `rls.sql` | Row Level Security policies for all 13 tables |

---

## Table Overview

| Table | Rows | Description |
|-------|------|-------------|
| `creators` | 1 per user | Creator profiles — extends auth.users; Stripe Connect; SaaS tier |
| `courses` | 1 per course | Top-level course entity; pricing, Stripe IDs, publish state |
| `course_versions` | N per course | Git-tag-style version snapshots (e.g. "1.0.0", "2.1.3") |
| `lessons` | N per course | Markdown lessons; content stored as `content_md` |
| `quizzes` | 1 per lesson | Quiz metadata; linked to quiz_questions |
| `quiz_questions` | N per quiz | Individual questions (multiple_choice / true_false / short_answer) |
| `quiz_attempts` | N per user/question | Append-only per-question answer records; supports retries |
| `enrollments` | 1 per user/course | Active entitlements; `entitlement_granted_at` is the unlock timestamp |
| `purchases` | 1 per user/course | Stripe Checkout payment records; idempotency key = `stripe_session_id` |
| `affiliates` | 1 per code | Affiliate codes for `?ref=` tracking; commission % |
| `referrals` | 1 per click | Click + optional conversion records; IP-hashed for dedup |
| `repo_imports` | 1 per import job | GitHub repo import status tracking |
| `events` | N per event | First-party analytics event log (append-only, immutable) |

---

## RLS Policy Summary

### Access rules per table

| Table | Public | Authenticated (own) | Creator | Service Role |
|-------|--------|---------------------|---------|--------------|
| `creators` | SELECT | UPDATE own | — | — |
| `courses` | SELECT (published only) | — | Full CRUD | — |
| `course_versions` | SELECT (published course) | — | Full CRUD | — |
| `lessons` | SELECT (is_preview=true) | SELECT (if enrolled) | Full CRUD | — |
| `quizzes` | SELECT (preview lesson) | SELECT (if enrolled) | Full CRUD | — |
| `quiz_questions` | SELECT (preview lesson) | SELECT (if enrolled) | Full CRUD | — |
| `quiz_attempts` | — | INSERT + SELECT own | SELECT course attempts | — |
| `enrollments` | — | SELECT own; INSERT (free only) | SELECT course enrollments | INSERT (paid) |
| `purchases` | — | SELECT own | SELECT course purchases | INSERT + UPDATE |
| `affiliates` | — | SELECT own codes | Full CRUD | — |
| `referrals` | — | SELECT own | SELECT course referrals | INSERT (click tracking) |
| `repo_imports` | — | Full CRUD own | — | — |
| `events` | — | INSERT + SELECT own | SELECT course events | INSERT (anonymous) |

### Key design decisions

1. **Lessons** are readable if `is_preview = true` OR the user has an active enrollment (`entitlement_granted_at IS NOT NULL AND entitlement_revoked_at IS NULL`).
2. **Purchases + Enrollments** are inserted by the **service role key** in the Stripe webhook handler — never by the client. This prevents payment bypass.
3. **Events** can be inserted by any authenticated user (for client-side tracking) but are immutable — no UPDATE/DELETE policy.
4. **Referral clicks** are recorded server-side to enable IP hashing and bot detection. No user INSERT policy.
5. **Helper functions** `is_enrolled(course_id)` and `is_course_creator(course_id)` are `SECURITY DEFINER` — they run with elevated privileges to avoid RLS infinite recursion.

---

## Applying the Schema

```bash
# 1. Get org ID
curl https://api.supabase.com/v1/organizations \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

# 2. Create project (if needed)
curl -X POST https://api.supabase.com/v1/projects \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"teachrepo","organization_id":"<org_id>","plan":"free","region":"us-east-1","db_pass":"<strong_password>"}'

# 3. Apply schema (via Supabase SQL Editor or psql)
psql "$DATABASE_URL" < schema.sql
psql "$DATABASE_URL" < rls.sql
```

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://zkwyfjrgmvpgfbaqwxsb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```
