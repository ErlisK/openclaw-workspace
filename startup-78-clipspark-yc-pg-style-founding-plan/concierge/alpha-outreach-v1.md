# ClipSpark Alpha Outreach — Phase 3 Internal Alpha

**Date:** 2026-04-09  
**Cohort:** 10–20 creators (invite-only)  
**App:** https://clipspark-tau.vercel.app  
**Invite codes:** `CLIPSPARK-ALPHA-001` through `CLIPSPARK-ALPHA-005` (5 uses each)

---

## What's Ready

✅ Sign in with Google or magic link email  
✅ Upload an episode (MP3/MP4/WAV, up to 500MB) or paste a URL  
✅ 5 visual templates: Podcast Pro, TikTok Native, LinkedIn Pro, Waveform, Comedy Kinetic  
✅ Platform picker: YouTube Shorts, TikTok, Instagram Reels, LinkedIn, Twitter/X  
✅ Job status pipeline with real-time progress display  
✅ Download clips + preview player  
✅ Pricing page with Stripe checkout ($5/mo Starter, $15/mo Pro, credit packs)  
✅ Settings: plan, privacy, invite codes  

**Alpha users:** unlimited clips, no credit card required.  
**Pipeline:** Currently semi-manual concierge (operator runs transcription + rendering within 48h).

---

## Outreach Template

**Subject:** You're invited to ClipSpark alpha ⚡

---

Hi [Name],

I've been working on a tool called **ClipSpark** — it takes your podcast episodes and turns them into 3–5 short clips for TikTok, Reels, YouTube Shorts, and LinkedIn automatically. AI picks the best moments, burns captions, suggests titles and hashtags. The whole thing takes under 15 minutes.

I'm doing a private alpha with a handful of creators, and I think your work as a [niche] creator would be a perfect fit to test this.

**You're invited:** https://clipspark-tau.vercel.app  
**Your invite code:** `CLIPSPARK-ALPHA-001`

During the alpha: unlimited clips, completely free.

What I'd love in return: honest feedback after you try your first episode. 5 minutes of your time. What worked, what felt off, would you pay $5/month for this.

Happy to jump on a quick call too if that's easier.

— [Founder]

---

## Creator Targets (from Phase 2 pilot list)

| Creator | Niche | Why |
|---------|-------|-----|
| Marcus | Business podcast | High-volume, tests Podcast Pro template |
| James T. | Comedy | Tests Comedy Kinetic + TikTok Native |
| Angela B. | Parenting | Tests emotional/storytelling highlights |
| Nick A. | Fitness | Tests short-form fitness content |
| Raj M. | Tech interviews | Tests tech niche heuristics |
| Lisa Chen | LinkedIn coaching | Best test for LinkedIn Pro template |
| Tom H. | Fintech founder | Tests B2B/founder niche |
| Jamie R. | True Crime | Tests narrative arc detection |

**Additional:** 5–10 creators sourced from Discord/Twitter outreach using LinkedIn invite code.

---

## What to Track (Phase 3 Alpha KPIs)

| Metric | Target | How |
|--------|--------|-----|
| Alpha signups | 10–20 | invite_codes table |
| Jobs submitted | ≥15 | processing_jobs count |
| Clips delivered | ≥30 | clip_outputs count |
| CSAT ≥ 4/5 | ≥70% | clip_feedback table |
| P90 preview time | ≤5 min for 60-min source | tat_sec / 0.9 |
| Job success rate | ≥95% | status != 'failed' / total |

---

## Alpha Feedback Questions

1. (1–5) How good were the clip selections? Did it pick the right moments?
2. (1–5) Would you actually post these clips?
3. What would you change about the output?
4. Would you pay $5/month for this if it worked reliably?
5. What's one feature that would make you pay $15/month?

---

## PostHog Events to Track

| Event | When |
|-------|------|
| `signup` | New user created |
| `onboarding_completed` | Step 3 done |
| `job_created` | POST /api/jobs |
| `job_preview_ready` | status → preview_ready |
| `clip_downloaded` | Download button clicked |
| `checkout_started` | POST /api/checkout |
| `subscription_started` | Stripe webhook checkout.session.completed |
| `feedback_submitted` | clip_feedback INSERT |

Set up PostHog project at https://app.posthog.com → copy Project API Key → set `NEXT_PUBLIC_POSTHOG_KEY` in Vercel.
