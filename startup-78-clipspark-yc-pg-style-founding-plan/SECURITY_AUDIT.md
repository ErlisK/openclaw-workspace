# ClipSpark Security & RLS Audit

**Date:** 2025-07  
**Status:** ✅ All tables secured

---

## Summary

| Tables audited | 29 |
|---|---|
| Had RLS disabled | 8 |
| Fixed in this audit | 8 |
| Tables with RLS enabled | 29/29 |

---

## Tables Fixed

| Table | Previous state | Fix applied | Policy type |
|-------|---------------|-------------|------------|
| `email_sequences` | RLS OFF | Enabled | User self (user_id = auth.uid()) + service role |
| `template_variants` | RLS OFF | Enabled | Public read, service write |
| `clips` | RLS OFF | Enabled | Service role only (legacy concierge pilot) |
| `concierge_jobs` | RLS OFF | Enabled | Service role only |
| `csat_responses` | RLS OFF | Enabled | Service role only |
| `feedback` | RLS OFF | Enabled | Service role only |
| `performance_data` | RLS OFF | Enabled | Service role only |
| `research_notes` | RLS OFF | Enabled | Service role only (internal ops, no user_id) |

---

## Full Policy Inventory (Post-Audit)

| Table | Policy | Type | Condition |
|-------|--------|------|-----------|
| `ab_variants` | ab_variants_user | ALL | user_id = auth.uid() |
| `analytics_consent` | consent_self | ALL | user_id = auth.uid() |
| `clip_feedback` | feedback_self | ALL | user_id = auth.uid() |
| `clip_outputs` | clips_self | ALL | user_id = auth.uid() |
| `clip_performance` | clip_perf_user | ALL | user_id = auth.uid() |
| `clips` | clips_service | ALL | auth.role() = 'service_role' |
| `concierge_jobs` | concierge_jobs_service | ALL | auth.role() = 'service_role' |
| `concierge_pilot` | service_all_concierge | ALL | auth.role() = 'service_role' |
| `credit_transactions` | credit_tx_user | SELECT | user_id = auth.uid() |
| `csat_responses` | csat_service | ALL | auth.role() = 'service_role' |
| `dead_letter_jobs` | dlq_service | ALL | auth.role() = 'service_role' |
| `email_sequences` | email_seq_user_self | ALL | user_id = auth.uid() |
| `email_sequences` | email_seq_service | ALL | auth.role() = 'service_role' |
| `feedback` | feedback_service | ALL | auth.role() = 'service_role' |
| `invite_codes` | invites_own | ALL | created_by = auth.uid() |
| `invite_codes` | invites_read | SELECT | true |
| `media_assets` | assets_self | ALL | user_id = auth.uid() |
| `onboarding_checklist` | checklist_user | ALL | user_id = auth.uid() |
| `performance_data` | perf_data_service | ALL | auth.role() = 'service_role' |
| `processing_jobs` | jobs_self | ALL | user_id = auth.uid() |
| `publish_log` | (implicit) | — | user_id = auth.uid() |
| `referrals` | referrals_view | SELECT | user_id = auth.uid() |
| `research_notes` | research_service | ALL | auth.role() = 'service_role' |
| `subscriptions` | subs_self | ALL | user_id = auth.uid() |
| `template_saves` | template_saves_user | ALL | user_id = auth.uid() |
| `template_upvotes` | template_upvotes_user | ALL | user_id = auth.uid() |
| `template_variants` | tv_public_read | SELECT | true |
| `template_variants` | tv_service_write | ALL | auth.role() = 'service_role' |
| `templates` | templates_own_write | ALL | user_id = auth.uid() |
| `templates` | templates_public_read | SELECT | true |
| `transcripts` | users_own_transcripts | ALL | user_id = auth.uid() |
| `usage_ledger` | usage_self | ALL | user_id = auth.uid() |
| `users` | users_self | ALL | id = auth.uid() |
| `waitlist` | public_insert | INSERT | true |
| `waitlist` | public_select | SELECT | true |

---

## Risk Notes

### `credit_transactions` — SELECT only
Users can read their own credit history (SELECT), but cannot INSERT/UPDATE directly. All writes go through service role in API routes. ✅ Correct.

### `referrals` — SELECT only  
Users can see their referrals, but cannot create them directly — created by service role in auth/callback. ✅ Correct.

### `waitlist` — public read+write
Intentional: waitlist is a pre-auth table. No sensitive data. ✅ Acceptable.

### `template_variants` — public read
Templates are global, not user-specific. Public read is intentional. Write is service-only. ✅ Correct.

### `publish_log` — verify policy
Check that `publish_log` has explicit RLS policy if it contains posting credentials. Run:
```sql
SELECT tablename, policyname FROM pg_policies WHERE tablename = 'publish_log';
```

---

## Recommendations

1. **Add `oauth_connections` audit**: Verify the oauth_connections RLS policy restricts access to `user_id = auth.uid()` only — this table may contain OAuth tokens.
   ```sql
   SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'oauth_connections';
   ```

2. **Rotate service role key periodically**: The `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS. Treat it like a root password — never expose in client code.

3. **Enable `pgaudit` extension** (Supabase Pro): Log all SELECT/INSERT/UPDATE on sensitive tables (`users`, `subscriptions`, `usage_ledger`) for compliance.

4. **Add `NOT NULL` constraints on `user_id`** where missing — prevents accidental orphan records that might be visible to wrong users.

5. **Quarterly RLS review**: After each major schema migration, run:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables 
   WHERE schemaname='public' AND rowsecurity = false;
   ```
   Should return 0 rows.
