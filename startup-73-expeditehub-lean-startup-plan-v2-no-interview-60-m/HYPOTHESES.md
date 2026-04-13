# ExpediteHub — Testable Hypotheses (Phase 1)
# Austin ADU · Smoke-Test Landing MVP · No-Interview Discovery

**Test window:** 3-day paid traffic test ($60 budget, Austin TX)  
**Expected sample:** ~60–80 paid clicks (directional only — not statistically significant)  
**Tracking:** PostHog · Supabase · Stripe  
**Deployed:** https://startup-73-expeditehub-lean-startup.vercel.app

> These are *smoke-test hypotheses*, not scientific experiments.
> A single green signal justifies continued investment; silence is a pivot trigger.

---

## H1: Homeowner Demand — Willingness to Pay

> **Hypothesis:** At least 1 Austin homeowner will place a $99–$199 deposit for a fast ADU permit
> packet within a 3-day $60 paid traffic test.

### What we're measuring

| Event | Threshold (Green) | Tool |
|-------|-------------------|------|
| `checkout_success` | ≥ 1 paid deposit | Stripe + PostHog |
| `request_intent_submit` rate | ≥ 10% of paid clicks | PostHog funnel |
| High-intent leads (email + address + timeline) | ≥ 3 rows in Supabase | Supabase `leads` |
| `homeowner_cta_click` / `lp_view` | ≥ 20% modal open rate | PostHog |
| `email_captured` (abandonment saves) | ≥ 5 | Supabase `leads` |

### Funnel model (expected with $60 / ~70 clicks)

```
~70 paid clicks
  → ~25 modal opens       (target: ≥ 20% open rate)
    → ~10 intent submits  (target: ≥ 40% of modal opens)
      → ~6 checkout views (target: ≥ 60% of intents)
        → ≥ 1 deposit     (target: ≥ 15% of checkout views)
```

### Test setup
- **Traffic:** $60 Google Ads (ADU + permit keywords, Austin TX geo) and/or Meta
- **A/B:** PostHog `price-test` flag — 3 variants (control $199 · beta_149 $149 · beta_99 $99)
- **Intake:** Fake-door modal collects email, project type, address, zip, timeline
- **Survey:** 2-question micro-survey after intent submit (submit timeline + plans ready?)
- **Abandonment:** Email captured after 1.5s of valid email entry, before form submit

### Outcome thresholds

| Result | Signal | Action |
|--------|--------|--------|
| ≥ 1 deposit | **Strong green** | Persevere → Phase 2 |
| ≥ 10% intent rate + ≥ 3 leads, 0 deposits | **Soft green** | Retest with better checkout trust signals |
| 5–9% intent rate, 1–2 leads, 0 deposits | **Yellow** | Investigate modal friction; retry |
| < 5% intent rate, 0–1 leads | **Red** | Pivot — fix messaging or target audience |
| < 40 clicks delivered | **Inconclusive** | Fix ad targeting first, re-run |

---

## H2: Pro Supply — Marketplace Viability

> **Hypothesis:** 2–3 local Austin permit pros will sign up, and at least 1 will indicate
> willingness to quote on a homeowner lead.

### What we're measuring

| Event | Threshold (Green) | Tool |
|-------|-------------------|------|
| `pro_profile_complete` | ≥ 2 in 14 days | PostHog + Supabase `pros` |
| `pro_signup` (form submitted) | ≥ 3 attempts | PostHog |
| `lp_view` on `/pro` | ≥ 8 views | PostHog |
| Quote intent (manual — pro emails/calls) | ≥ 1 | Founder inbox |

### Acquisition channels (unpaid, Days 0–14)

1. LinkedIn DM — search "permit expediter Austin TX" (target: 20 outreach)
2. TX TDLR license holder list — cold email (target: 30 contacts)
3. Austin Contractors Facebook Group
4. Austin permit office bulletin board
5. Nextdoor Pro / local contractor forums

### Outcome thresholds

| Result | Signal | Action |
|--------|--------|--------|
| ≥ 2 complete profiles | **Green** | Two-sided marketplace viable |
| 1 complete profile | **Yellow** | Concierge model with 1 contracted pro |
| 0 profiles, ≥ 8 pro page views | **Weak yellow** | Rewrite /pro value prop |
| 0 profiles, < 3 pro page views | **Red** | Outreach hasn't landed — try different channels |

---

## H3: AI Auto-Fill Accuracy

> **Hypothesis:** The AI auto-fill pipeline achieves ≥ 70% field-level accuracy on Austin ADU
> primary permit forms on first pass (no human correction).

### What we're measuring

Accuracy = `correct fields / total required fields` on first AI pass, scored against known-correct
answers for 5 sample Austin ADU properties.

**Forms tested:**
- City of Austin Application for Building Permit (ABP)
- Site Plan checklist (SP-1)
- Zoning data fields (setbacks, FAR, impervious cover %)

### Outcome thresholds

| Score | Signal | Action |
|-------|--------|--------|
| ≥ 70% | **Green** | Ship AI auto-fill as a differentiator |
| 50–69% | **Yellow** | Launch with human review; improve templates in background |
| < 50% | **Red** | Remove AI claims from marketing; ship as marketplace-only |

---

## Micro-Survey Signal (bonus — not a gate)

After `request_intent_submit`, users answer:
1. **"When do you plan to submit your permit application?"**
2. **"Do you already have architectural plans or drawings?"**

These are stored in `leads.survey_submit_timeline` and `leads.survey_has_plans`.

**What to look for:**

| Q1 Answer | Q2 Answer | Interpretation |
|-----------|-----------|----------------|
| Within 30 days | Yes, full plans | Hottest lead — call immediately |
| Within 30 days | No — need drafter | High urgency, high LTV (needs more services) |
| 1–3 months | Any | Warm lead — 2-week follow-up drip |
| Just researching | Any | Cold — nurture only |

If ≥ 3 leads answer "Within 30 days" → validates urgency hypothesis even without a paid deposit.

---

## Instrumentation Checklist

- [x] PostHog key active (`phc_vFwCJti5FV7SzBjn3wcwHYciM7FAEdBaNaz7gZzfRsgq`)
- [x] Feature flag `price-test` live (3-way split: control / beta_149 / beta_99)
- [x] Events: `lp_view`, `price_variant`, `homeowner_cta_click`, `pro_cta_click`
- [x] Events: `email_captured`, `request_intent_submit`, `checkout_view`
- [x] Events: `checkout_success` (client + server-side webhook)
- [x] Events: `pro_signup`, `pro_profile_complete`
- [x] Events: `micro_survey_complete`, `micro_survey_skipped`
- [x] Supabase `leads` table: role, zip, project_type, survey columns
- [x] Supabase `pros` table: zip, service_radius
- [ ] Stripe webhook secret (real — replace `whsec_placeholder` in Vercel)
- [ ] Google Ads / Meta campaigns live
- [ ] H3 auto-fill accuracy test run on 5 sample properties
