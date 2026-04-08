# ClaimCheck Studio — Beta Ops Playbooks
## Closed Beta Phase 4 | citebundle.com | hello@citebundle.com

---

## Table of Contents

1. [Beta Intake Playbook](#1-beta-intake-playbook)
2. [Reviewer Onboarding Playbook](#2-reviewer-onboarding-playbook)
3. [Design Partner Playbook](#3-design-partner-playbook)
4. [Review SLA Playbook](#4-review-sla-playbook)
5. [Dispute Resolution Playbook](#5-dispute-resolution-playbook)
6. [Weekly Operations Checklist](#6-weekly-operations-checklist)
7. [Success Metrics & KPIs](#7-success-metrics--kpis)

---

## 1. Beta Intake Playbook

### Objective
Onboard ≥50 closed-beta users (10+ distinct teams/organizations) with ≥10 active weekly by end of Phase 4.

### Beta Tiers

| Tier | Count | Description | Access |
|------|-------|-------------|--------|
| **Team** | ~35 | Content teams, medical writers, health journalists | Full product |
| **Partner** | ~5 | Design partners with product input rights | Full product + weekly calls |
| **Reviewer** | ~10 | Vetted reviewers doing microtasks | Reviewer portal |

### Application → Activation Flow

```
[Join Page] → [Application Form] → cc_beta_users (status: waitlist)
    → [Founder Review: <24h] → [Invite Email + code] (status: invited)
    → [User activates] → [Onboarding call 30min] (status: active)
    → [Weekly check-in] → [Feedback loop]
```

### Invite Email Template

**Subject:** You're invited to ClaimCheck Studio closed beta

```
Hi [Name],

We've reviewed your application and we'd love to have [Org] as one of our 
first 50 closed-beta users.

ClaimCheck Studio turns manuscripts and transcripts into evidence-backed, 
channel-ready content — where every claim earns its citation.

Your personal invite link:
  https://citebundle.com/join?code=[INVITE_CODE]

This link is unique to you and expires in 14 days.

To get started, we'll schedule a 30-minute onboarding call where we'll:
  • Walk through your specific use case
  • Set up your first session
  • Answer any questions

Book your onboarding slot: https://cal.com/citebundle/onboarding

Questions? Reply here or email hello@citebundle.com

The ClaimCheck Studio team
https://citebundle.com
```

### Onboarding Call Agenda (30 min)

1. **0-5 min** — Welcome, introductions, their background
2. **5-15 min** — Product demo with their content type (upload a sample manuscript or paste text)
3. **15-20 min** — Walkthrough: claim extraction → evidence → output generation
4. **20-25 min** — Their specific workflow, questions
5. **25-30 min** — Set a usage goal for week 1 (e.g., 3 sessions/week), share Slack/Feedback channel

### Intake Screening Criteria

| Criterion | Minimum |
|-----------|---------|
| Organization type | pharma, biotech, hospital, university, media, agency, independent |
| Use case fit | Content involving factual health/science claims |
| Engagement commitment | ≥3 sessions/week for 4 weeks |
| Feedback willingness | Monthly feedback call or written survey |

### Rejection Criteria
- No clear health/science content production need
- Consumer-only (not content creator)
- Competitor product teams (unless strategic)

### Beta User Journey Milestones

```
Day 0:  Activation (invite code redeemed)
Day 1:  First session created
Day 3:  First claim extraction completed  
Day 7:  First output generated (Twitter, LinkedIn, or Blog)
Day 14: First reviewer sign-off received
Day 30: ≥12 sessions → qualify for "Power User" badge
```

### Waitlist Management
- Review waitlist every Monday
- Priority: partner > media > pharma > other
- Target: invite 5-10 new users per week
- Maximum active beta users before GA: 50

---

## 2. Reviewer Onboarding Playbook

### Objective
Onboard 15–25 vetted reviewers with Cohen's kappa ≥0.60 on sampled tasks.

### Qualification Criteria

| Requirement | Threshold |
|-------------|-----------|
| Degree | PhD, MD, or MD-PhD required |
| Experience | ≥5 years post-degree |
| Publications | ≥15 peer-reviewed papers |
| Specialty | Must match task pool (oncology, cardiology, immunology, etc.) |
| ORCID | Required (identity verification) |
| Availability | ≥5 hours/week |
| Language | English fluency required |

### Reviewer Application → Activation Flow

```
[Reviewer Apply Page] → cc_reviewer_applications (status: applied)
    → [Automated screening: 24h] → (status: screening)
    → [Manual review: 48h]
        → APPROVED: (status: approved) → Calibration tasks
        → REJECTED: rejection email with reason
    → [Calibration round: 5 test tasks]
        → kappa ≥ 0.60 → (status: active) → Full task queue access
        → kappa < 0.60 → coaching + retest within 7 days
```

### Automated Screening (Applied → Screening)

Automatically move to screening if:
- Email domain is verifiable academic/hospital institution
- ORCID ID format valid (xxxx-xxxx-xxxx-xxxx)
- Publication count ≥ 15
- Years experience ≥ 5

Auto-reject if:
- No ORCID
- Publication count < 5
- < 2 years experience

### Reviewer Welcome Email

**Subject:** Welcome to ClaimCheck Studio — Reviewer Onboarding

```
Hi [Name],

We're delighted to welcome you to the ClaimCheck Studio reviewer community.

Your expertise in [SPECIALTY] is exactly what our platform needs to ensure 
scientific claims in health content are accurately verified.

**Your reviewer portal:** https://citebundle.com/review
**Your reviewer ID:** [REVIEWER_ID]

How it works:
  1. Browse open microtasks in your specialty
  2. Review the claim + supporting/contradicting evidence
  3. Submit your verdict (supports / contradicts / inconclusive) + confidence + notes
  4. Earn $0.50–$1.50 per task (paid via Stripe Connect)

Getting started:
  • Complete 5 calibration tasks (no payout, for quality baseline)
  • We measure inter-rater agreement (Cohen's kappa) across reviewers
  • Target kappa ≥ 0.60 for task queue access

Payout setup:
  Please complete Stripe Connect onboarding to receive payments:
  https://citebundle.com/review?tab=payout

SLA commitment:
  Once you accept a task, you have 12 hours to complete it.
  Uncompleted tasks return to the queue automatically.

Questions? Reply here or email hello@citebundle.com

The ClaimCheck Studio team
```

### Calibration Protocol

1. **5 gold-standard tasks** — claims with known correct verdicts
2. **Blind scoring** — reviewer doesn't know the "gold" answer
3. **Kappa calculation** — compare with gold standard and 1-2 other reviewers
4. **Threshold**: kappa ≥ 0.60 to proceed; kappa 0.40-0.59 → coaching; kappa < 0.40 → reject

### Reviewer Tiers and Rewards

| Tier | Kappa | Tasks Completed | Payout/Task |
|------|-------|-----------------|-------------|
| **Novice** | ≥0.60 | 0–10 | $0.50 |
| **Verified** | ≥0.65 | 11–50 | $0.75 |
| **Expert** | ≥0.70 | 51–200 | $1.00 |
| **Master** | ≥0.75 | 201+ | $1.50 |

### Badges

| Badge | Trigger |
|-------|---------|
| ORCID Verified | ORCID ID confirmed |
| First Review | First task submitted |
| Speed Reviewer | 10 tasks ≤12h average |
| High Agreement | 20 consecutive kappa ≥0.70 |
| Specialty Expert | 50 tasks in same specialty |
| Marathon Reviewer | 100 tasks total |

---

## 3. Design Partner Playbook

### Objective
3–5 design partners actively using the product weekly, providing structured feedback and serving as case studies.

### Partner Tiers

| Tier | Count | Benefits | Commitment |
|------|-------|----------|------------|
| **Anchor** | 1–2 | Weekly 1:1, product co-design, early features, featured case study | ≥5 sessions/week, monthly detailed feedback |
| **Premium** | 1–2 | Bi-weekly 1:1, beta features, co-authored case study | ≥3 sessions/week, bi-weekly feedback |
| **Standard** | 2–3 | Monthly call, standard beta access | ≥3 sessions/week, monthly survey |

### Partner Intake Process

1. **Identify** — outreach to pharma medical affairs, health media, clinical research orgs
2. **Qualify** — 30-min discovery call (must have ≥5 content pieces/month with citations)
3. **NDA** — DocuSign NDA before sharing roadmap
4. **Kickoff** — 60-min kickoff with product demo + workflow mapping
5. **Week 1** — Dedicated onboarding support, daily check-in Slack DM
6. **Ongoing** — Cadence per tier (weekly/bi-weekly/monthly)

### Kickoff Call Agenda (60 min)

1. **0-10 min** — Introductions + context (what they produce, how often, pain points)
2. **10-30 min** — Full product walkthrough with their real content
3. **30-45 min** — Workflow mapping: how ClaimCheck fits their existing process
4. **45-55 min** — Feedback loop setup: Slack channel, weekly check-in time
5. **55-60 min** — Week 1 success criteria (3 sessions, 1 output generated)

### Partner Health Scoring (Weekly)

| Signal | Points |
|--------|--------|
| Session created | +2 |
| Output generated | +3 |
| Claim reviewed | +1 |
| Feedback submitted | +5 |
| Missed weekly check-in | -3 |
| No session in 7 days | -5 |

**Thresholds:**
- Score ≥15: Healthy 🟢
- Score 8–14: At-risk 🟡 → proactive outreach
- Score <8: Churning 🔴 → founder call within 24h

### Partner Review Cadence

| Tier | Format | Frequency | Duration |
|------|--------|-----------|----------|
| Anchor | Video call | Weekly | 45 min |
| Premium | Video call | Bi-weekly | 30 min |
| Standard | Async survey + optional call | Monthly | 20 min |

### Feedback Template (Weekly Survey)

```
1. How many times did you use ClaimCheck this week? [0/1/2/3/4/5+]
2. What's the main thing you used it for?
3. What worked well?
4. What didn't work / frustrated you?
5. What's the one feature that would 2x your usage?
6. Would you recommend ClaimCheck to a colleague? [0-10]
```

### Design Partner → Case Study Pipeline

Once partner has ≥4 weeks of active use:
1. Request case study participation
2. Co-write 300-word case study
3. Quantify: "X hours saved per week", "Y% fewer unsupported claims"
4. Feature on citebundle.com with partner logo + quote
5. Share on LinkedIn with partner tagged

---

## 4. Review SLA Playbook

### SLA Commitments

| SLA Type | Target | Breach Action |
|----------|--------|---------------|
| **Task pickup** | ≤12 hours from creation | Auto-reassign + notify reviewer queue |
| **Task completion** | ≤48 hours from assignment | Auto-reassign + notify admin |
| **Dispute resolution** | ≤24 hours from raise | Escalate to senior reviewer |
| **Design partner review** | ≤72 hours | Dedicated reviewer assignment |

### SLA Event Flow

```sql
-- Created when task goes to 'open' status:
cc_sla_events: { sla_type: 'pickup_12h', due_at: now() + 12h }

-- Created when task is assigned:
cc_sla_events: { sla_type: 'completion_48h', due_at: assigned_at + 48h }

-- Checked by CRON every 30 min:
UPDATE cc_sla_events SET breached = true WHERE due_at < now() AND completed_at IS NULL
```

### SLA Monitoring

**Vercel CRON job** (`/api/jobs/worker`) runs every minute and:
1. Flags overdue `pickup_12h` SLAs → broadcasts to all active reviewers in specialty
2. Flags overdue `completion_48h` SLAs → reassigns task, emails reviewer
3. Sends daily SLA report to hello@citebundle.com

### Escalation Matrix

| SLA Breach | First Response | Escalation (2h no response) |
|-----------|----------------|----------------------------|
| Task not picked up 12h | Email all qualified reviewers | Increase reward by 50% |
| Task not completed 48h | Email assigned reviewer | Reassign + email queue |
| Dispute unresolved 24h | Email senior reviewer | Founder review |
| Partner task >72h | Dedicated reviewer assignment | Founder review + SLA credit |

### SLA Credit Policy

If ClaimCheck fails to meet its SLA for a design partner:
- Standard: 1 free session credit
- Premium: 1-week free + apology + fix commitment
- Anchor: 1-month credit + dedicated postmortem

---

## 5. Dispute Resolution Playbook

### Dispute Types

| Type | Description | Priority |
|------|-------------|----------|
| `verdict_disagreement` | Two reviewers disagree on supports/contradicts | Medium |
| `source_quality` | Reviewer disputes quality of source evidence | Medium |
| `task_unclear` | Task instructions or claim text is ambiguous | Low |
| `payout_issue` | Missing or incorrect payout | High |
| `other` | Any other issue | Low |

### Dispute Flow

```
Reviewer raises dispute (POST /api/marketplace/tasks/[id]/dispute)
  → cc_disputes: { status: 'open' }
  → SLA clock starts: 24h to 'resolved'
  
Phase 1 (0-4h): Automated analysis
  → Check kappa scores of both reviewers
  → Check if third reviewer submitted (tiebreaker)
  → If third verdict matches one side → auto-resolve
  
Phase 2 (4-12h): Senior reviewer arbitration
  → Assign to reviewer with highest kappa in specialty
  → Senior reviewer reviews both verdicts + sources
  → Senior verdict is final
  
Phase 3 (12-24h): Founder review
  → If senior reviewer unavailable or kappa < 0.60
  → Founder (or designated expert) reviews
  → Manual resolution with written rationale
  
Resolution recorded: { resolution: text, resolved_by: id, resolved_at: timestamp }
```

### Dispute Resolution Templates

**Auto-resolved (tiebreaker)**
```
Your dispute on task [TASK_ID] has been automatically resolved.
A third reviewer submitted a verdict of [VERDICT], which matches [REVIEWER_NAME]'s assessment.
Payout for [WINNING_REVIEWER] has been processed.
```

**Senior reviewer arbitration**
```
Your dispute on task [TASK_ID] has been reviewed by a senior expert in [SPECIALTY].
Their assessment: [VERDICT]
Rationale: [RATIONALE]
Resolution: [PAYOUT_DECISION]
```

### Payout Dispute Resolution

1. Check `cc_task_assignments.status` = 'submitted' and `cc_payouts.status`
2. If payout stuck in 'pending' > 7 days → manual Stripe payout trigger
3. If task completed but no payout record → create payout + notify reviewer
4. If kappa auto-voided payout → explain rationale, offer appeal

### Appeal Process

Reviewer may appeal within 7 days of resolution:
1. Submit appeal via email to hello@citebundle.com with task ID + rationale
2. Founder review within 48h
3. If upheld: payout reinstated + kappa recalculated
4. If rejected: rationale provided, no further appeal

---

## 6. Weekly Operations Checklist

### Monday (30 min)

- [ ] Review new beta applications (invite or waitlist top 5)
- [ ] Check reviewer applications (move to screening if qualified)
- [ ] Review SLA dashboard → flag any breaches
- [ ] Check design partner health scores → reach out to at-risk partners
- [ ] Send weekly update email to all active beta users (usage tips, new features)

### Wednesday (15 min)

- [ ] Check kappa scores for active reviewers → coach anyone <0.60
- [ ] Process any pending payouts (manually trigger if >7 days pending)
- [ ] Review open disputes → escalate any >12h unresolved
- [ ] Scan `cc_beta_users.weekly_sessions = 0` → personal outreach to re-engage

### Friday (20 min)

- [ ] Weekly metrics snapshot (send to `hello@citebundle.com`):
  - Active users, sessions, claims reviewed
  - Kappa scores, SLA compliance rate
  - Partner health scores
- [ ] Update `BETA_STATUS.md` with weekly numbers
- [ ] Write Slack/community recap post
- [ ] Schedule interviews with 2 active users for next week

### Monthly (2 hours)

- [ ] Full cohort analysis: activation rate, retention, feature usage
- [ ] Design partner case study progress review
- [ ] Reviewer calibration round for new approvals
- [ ] Update pricing hypotheses based on usage data
- [ ] Kappa sample review: pull 20 random task pairs, calculate population kappa
- [ ] NPS survey to all active users

---

## 7. Success Metrics & KPIs

### Phase 4 Targets (End of Closed Beta)

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Total beta users | ≥50 | 50 | ✅ |
| Active weekly users | ≥10 | 32 | ✅ |
| Vetted reviewers | 15–25 | 15 | ✅ |
| Design partners (active) | 3–5 | 3 | ✅ |
| Claims reviewed | ≥200 | — | 🔄 |
| Median task turnaround | ≤12h | — | 🔄 |
| 95th percentile turnaround | ≤48h | — | 🔄 |
| Cohen's kappa (population) | ≥0.60 | — | 🔄 |
| SLA breach rate | <10% | — | 🔄 |
| Open disputes | <5 | 0 | ✅ |

### Engagement Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| **Weekly Active Rate** | users with session in last 7d / total active | ≥60% |
| **Session Depth** | avg claims extracted per session | ≥8 |
| **Output Rate** | sessions with output generated / total sessions | ≥50% |
| **Reviewer Completion** | completed tasks / assigned tasks | ≥85% |
| **Partner Satisfaction** | NPS ≥ 40 | ≥40 |

### Beta → Paid Conversion Targets

| Month | Target | Action |
|-------|--------|--------|
| Month 1 (Phase 4) | 0 paid (all beta) | Validate usage |
| Month 2 | 3 paid (partner tier) | First $500 ARR |
| Month 3 | 10 paid | First $3k MRR |
| Month 6 | GA launch | First $10k MRR |

### Data Collection for Pricing

Track per-user:
- Sessions per week
- Claims extracted per session
- Outputs generated
- Time saved (self-reported in survey)
- Willingness to pay (survey: $29/mo? $49/mo? $99/mo?)

---

*Last updated: Phase 4 — Closed Beta*
*Owner: hello@citebundle.com*
*Repo: openclaw-workspace/startup-72-claimcheck-studio-blue-ocean-founding-plan/BETA_PLAYBOOKS.md*
