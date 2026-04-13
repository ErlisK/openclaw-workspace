# ClipSpark Ops Runbook

**Version:** 1.0 — Phase 6  
**Maintained by:** Founding team  
**Last updated:** 2025-07

---

## Table of Contents

1. [Stack Overview](#1-stack-overview)
2. [Support Tiers & SLAs](#2-support-tiers--slas)
3. [Incident Response Playbook](#3-incident-response-playbook)
4. [Common Support Scenarios](#4-common-support-scenarios)
5. [Funnel & Ops Alerts](#5-funnel--ops-alerts)
6. [PostHog Funnel Definitions](#6-posthog-funnel-definitions)
7. [Unit Economics Monitoring](#7-unit-economics-monitoring)
8. [Runbook: Specific Incidents](#8-runbook-specific-incidents)
9. [Contacts & Escalation](#9-contacts--escalation)

---

## 1. Stack Overview

| Component | Provider | URL |
|-----------|----------|-----|
| Frontend + API | Vercel (Next.js App Router) | https://clipspark-tau.vercel.app |
| Database | Supabase (PostgreSQL) | https://supabase.com/dashboard/project/twctmwwqxvenvieijmtn |
| Auth | Supabase Auth | — |
| File storage | Supabase Storage | bucket: `uploads` |
| Payments | Stripe | https://dashboard.stripe.com |
| Analytics | PostHog | https://us.posthog.com |
| Email | AgentMail | inbox: hello.clipspark@agentmail.to |
| ASR | OpenAI Whisper API | — |
| Render | ffmpeg (Vercel serverless) | — |

### Environment Variables (Vercel)
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` / `POSTHOG_PERSONAL_API_KEY` / `POSTHOG_PROJECT_ID`
- `AGENTMAIL_API_KEY`
- `CRON_SECRET`

---

## 2. Support Tiers & SLAs

### Response SLAs

| Priority | Trigger | First Response | Resolution Target |
|----------|---------|----------------|-------------------|
| P0 — Critical | All users blocked (auth down, DB down, payments failing) | 30 min | 2 hours |
| P1 — High | Specific user billing issue, jobs failing >25%, data loss risk | 2 hours | 8 hours |
| P2 — Medium | Individual job failure, slow processing, feature confusion | 8 hours | 48 hours |
| P3 — Low | Feature requests, UX feedback, minor bugs | 24 hours | Next sprint |

### Support Channels
1. **In-app form** → `/help/contact-support` → emails `hello.clipspark@agentmail.to`
2. **Direct email** → hello@clipspark.com (alias)
3. **Alpha Discord** (if applicable) → #support channel

### Ticket Triage Flow
```
Ticket arrives → hello.clipspark@agentmail.to
  ↓
Categorize (bug / billing / job-failed / feature / account)
  ↓
P0/P1: → Immediate action + notify user in <30 min
P2/P3: → Add to tracker, reply with ETA
  ↓
Resolve + close → log in outreach-tracker.md if pattern found
```

---

## 3. Incident Response Playbook

### Severity Classification

**P0 — Service Down**
- Symptoms: Login fails, dashboard 500s, no clips processing at all
- Immediate actions:
  1. Check Vercel status: https://vercel-status.com
  2. Check Supabase status: https://status.supabase.com
  3. Check recent Vercel deployments — rollback if needed: `npx vercel rollback --token $VERCEL_ACCESS_TOKEN`
  4. Post status update to any active user channels
  5. Fix forward or rollback within 30 min

**P1 — Degraded Service**
- Symptoms: Jobs failing >25%, billing broken, one user data issue
- Immediate actions:
  1. Check Supabase logs for DB errors
  2. Check Stripe webhook logs
  3. Check Vercel function logs for error patterns
  4. Notify affected users with ETA

**P2 — Partial Failure**
- Symptoms: Single job stuck, slow processing, A/B features broken
- Actions: Log, investigate async, respond within 8h

### Rollback Procedure
```bash
# List recent deployments
npx vercel ls --token $VERCEL_ACCESS_TOKEN

# Roll back to previous deployment
npx vercel rollback [deployment-url] --token $VERCEL_ACCESS_TOKEN
```

### DB Emergency Access
```sql
-- Check for stuck jobs (>30 min processing)
SELECT id, status, created_at, user_id
FROM processing_jobs
WHERE status IN ('pending', 'processing')
  AND created_at < NOW() - INTERVAL '30 minutes'
ORDER BY created_at DESC;

-- Manual job reset
UPDATE processing_jobs SET status = 'failed', error_message = 'manual reset by ops'
WHERE id = '<job_id>';

-- Check recent errors
SELECT error_message, COUNT(*) as count
FROM processing_jobs
WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24h'
GROUP BY error_message ORDER BY count DESC;
```

---

## 4. Common Support Scenarios

### "My job failed"

1. Get job ID from user (visible in dashboard URL or job card)
2. Query Supabase: `SELECT error_message, status FROM processing_jobs WHERE id = '<id>'`
3. Common errors:
   - `audio_too_short` → tell user minimum 2 minutes
   - `quota_exceeded` → check usage_ledger, offer credit pack
   - `whisper_api_error` → transient; ask user to retry
   - `unsupported_codec` → ask user to convert to H.264 MP4
4. For unexplained failures: refund 1 clip credit manually via Supabase:
   ```sql
   UPDATE usage_ledger SET credits_bal = credits_bal + 1 WHERE user_id = '<uid>';
   INSERT INTO credit_transactions (user_id, delta, reason) VALUES ('<uid>', 1, 'ops_goodwill');
   ```

### "I was charged but can't access Pro"

1. Check Stripe: find charge by email, confirm `payment_intent.status = succeeded`
2. Check Supabase `subscriptions` table for user's `plan` field
3. If webhook missed: manually update
   ```sql
   UPDATE subscriptions SET plan = 'pro', status = 'active' WHERE user_id = '<uid>';
   ```
4. Notify user and apologize for the delay

### "My clips look wrong / captions off"

1. Check `clip_outputs.caption_style` vs what user expected
2. Check `processing_jobs.error_message` for partial failures
3. Offer a free re-render: delete the clip and re-trigger from the job

### "I referred someone but didn't get credits"

1. Check `referrals` table:
   ```sql
   SELECT * FROM referrals WHERE referrer_id = '<uid>';
   ```
2. Check if referred user has `referral_activated = true`
3. If activated but credits not granted, manually credit:
   ```sql
   UPDATE usage_ledger SET credits_bal = credits_bal + 5 WHERE user_id = '<uid>';
   UPDATE referrals SET bonus_granted = true, bonus_granted_at = NOW() WHERE id = '<referral_id>';
   ```

---

## 5. Funnel & Ops Alerts

### Automated Daily Alert Cron

**Route:** `GET /api/cron/funnel-alerts`  
**Schedule:** Daily at 09:00 UTC (Vercel cron)  
**Sends alert email when any threshold is breached**

### Funnel SLA Thresholds

| Metric | Target | Alert if |
|--------|--------|---------|
| Signup → Upload | ≥40% | <40% |
| Upload → Preview | ≥75% | <75% |
| Preview → Approve | ≥50% | <50% |
| Job failure rate | ≤10% | >10% |
| Avg processing time | ≤15 min | >15 min |

### Manual Trigger
```bash
curl -X GET "https://clipspark-tau.vercel.app/api/cron/funnel-alerts?force=1"
```

### Reading Alerts
Alerts arrive at `hello.clipspark@agentmail.to` with subject `🚨 ClipSpark Alert: N SLA breach(es)`.

Each alert includes:
- Which thresholds were breached
- 7-day rolling metrics
- A link to the dashboard

---

## 6. PostHog Funnel Definitions

### Activation Funnel (Primary KPI)
```
signup → upload_completed → preview_watched
```
**Activation = user reaches `preview_watched`**  
**Target: ≥40% of signups**

### Engagement Funnel
```
preview_watched → clip_approved → clip_exported
```

### Retention Signal
```
upload_completed on Day 7+ after signup
```

### Key Events Catalog

| Event | When fired | Properties |
|-------|-----------|-----------|
| `signup` | New user auth | provider |
| `upload_started` | File selected or URL submitted | source |
| `upload_completed` | Ingest job created | minutes, source |
| `preview_watched` | Clip detail page load | clip_id, platform |
| `clip_approved` | Approve button clicked | clip_id, score |
| `clip_exported` | Download link clicked | clip_id, platform |
| `ab_variant_created` | A/B variant added | type, clip_id |
| `job_failed` | Job moves to failed | error_message |
| `referral_activated` | Referred user uploads | referrer_id |

### PostHog Dashboard Setup
1. Go to https://us.posthog.com → your ClipSpark project
2. Create funnel: `signup → upload_completed → preview_watched` (7-day conversion window)
3. Create funnel: `upload_completed → clip_approved` (3-day)
4. Set up cohort: "Activated users" = completed `preview_watched` within 7 days of signup
5. Create alert on funnel drop: email if 7-day activation < 40%

---

## 7. Unit Economics Monitoring

### Cost Targets

| Item | Target | Current |
|------|--------|---------|
| Gross margin | ≥70% | Track in `/api/usage` cost data |
| ASR cost per clip | ≤$0.05 | $0.006/min × avg clip length |
| Render cost per clip | ≤$0.03 | $0.010–0.018/min |
| Total COGS per clip | ≤$0.10 | Sum of above |

### Monthly Review Checklist
- [ ] Pull `v_usage_cost_summary` view from Supabase — total cost vs MRR
- [ ] Check Stripe MRR: new subscriptions − churned + credit pack revenue
- [ ] Verify gross margin ≥70%
- [ ] Review top 5 users by cost — any outliers consuming disproportionate compute?
- [ ] Check credit pack redemption rate — are users hitting quota?

### SQL: Monthly Cost Summary
```sql
SELECT
  date_trunc('month', period_start) as month,
  SUM(cost_asr_usd) as asr_cost,
  SUM(cost_render_usd) as render_cost,
  SUM(cost_ingest_usd) as ingest_cost,
  SUM(cost_asr_usd + cost_render_usd + cost_ingest_usd) as total_cost,
  COUNT(DISTINCT user_id) as active_users
FROM usage_ledger
GROUP BY 1
ORDER BY 1 DESC;
```

---

## 8. Runbook: Specific Incidents

### INC-001: High Job Failure Rate (>10%)

**Detection:** Funnel alert email OR PostHog `job_failed` spike

**Steps:**
1. Check Supabase for error distribution (SQL above)
2. Most common cause: OpenAI Whisper API issue
   - Check https://status.openai.com
   - If down: queue is accumulating; notify users with "we're aware" message
3. Second most common: ffmpeg codec issue on specific file type
   - Check `error_message` patterns
   - If reproducible: add codec check to ingest validation
4. Manual fix: re-queue failed jobs after root cause resolved
   ```sql
   UPDATE processing_jobs SET status = 'pending', error_message = NULL
   WHERE status = 'failed' AND created_at > NOW() - INTERVAL '2h';
   ```

### INC-002: Stripe Webhook Failure

**Detection:** User reports charge but no Pro access

**Steps:**
1. Stripe Dashboard → Developers → Webhooks → check for failed events
2. Replay specific event from Stripe UI
3. If replay fails: manually update subscription in Supabase (see billing scenario above)
4. Check `STRIPE_WEBHOOK_SECRET` env var — if rotated, update in Vercel

### INC-003: Supabase Storage Quota

**Detection:** Upload failures with storage error

**Steps:**
1. Supabase Dashboard → Storage → check usage
2. Identify large orphaned files (uploaded but job failed):
   ```sql
   SELECT asset_id, file_size_kb FROM clip_outputs
   WHERE created_at < NOW() - INTERVAL '30d' AND export_url IS NULL
   ORDER BY file_size_kb DESC LIMIT 20;
   ```
3. Run cleanup to remove old preview files for approved clips

### INC-004: Funnel Drop — Signup→Upload Below 40%

**Detection:** Daily alert email

**Steps:**
1. Check PostHog: is the drop on mobile or desktop?
2. Check if upload page has a JS error (Vercel function logs)
3. Check if onboarding checklist is showing correctly
4. Quick fix option: trigger outreach to recent signups who haven't uploaded via email sequences

---

## 9. Contacts & Escalation

| Role | Contact |
|------|---------|
| Founding engineer | Direct Slack/Discord |
| Support inbox | hello.clipspark@agentmail.to |
| Stripe support | https://support.stripe.com |
| Supabase support | https://supabase.com/support |
| Vercel support | https://vercel.com/support |
| OpenAI API status | https://status.openai.com |

### On-Call Rotation (Alpha Phase)
- Founder is the only on-call. Check support inbox 2× per day (morning + evening).
- P0 alerts → immediate. P1 → within 2h. P2/P3 → next business day.

### Escalation Matrix
```
User reports issue
  ↓
Check help center (can user self-serve?)
  ↓ No
Check runbook (standard procedure?)
  ↓ No
Investigate in Supabase + Vercel logs
  ↓ Blocked
Escalate to provider support with evidence
```

---

*Keep this runbook updated as you learn from incidents. After every P0/P1, add a new scenario to Section 8.*
