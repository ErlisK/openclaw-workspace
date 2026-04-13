# ExpediteHub — Pivot / Persevere Framework
# Phase 1 · Austin ADU · Smoke-Test Window

> **Why small-n thresholds?**  
> With ~60–80 paid clicks and $60 ad spend, traditional statistical significance is impossible.
> These thresholds are calibrated for *directional signal* only — enough to decide whether to
> invest another $300–$500 in a larger test, not to declare product-market fit.  
> Rule: treat any single green signal as "keep the door open"; treat 2+ green signals as "move fast."

---

## Milestone Map

```
Day 0   → Traffic test launches ($60 budget, Austin ADU keywords)
Day 1   → Early CTR / bounce check → adjust ads if needed
Day 3   → H1 Go/No-Go (demand signal from paid clicks)  ← PRIMARY DECISION GATE
Day 7   → H3 Auto-fill accuracy score
Day 14  → H2 Pro supply check + full Phase 1 retrospective  ← COMMIT OR PIVOT
```

---

## H1 — Homeowner Demand  
### Signal window: 72 hours of paid traffic (~60–80 clicks expected)

| Metric | Green ✅ | Yellow ⚠️ | Red ❌ | Where measured |
|--------|----------|-----------|--------|----------------|
| **Paid deposit** (`checkout_success`) | ≥ 1 | — | 0 | Stripe + PostHog |
| **Intent submit rate** (`request_intent_submit` / paid clicks) | ≥ 10% | 5–9% | < 5% | PostHog funnel |
| **High-intent leads** (email + address + timeline in Supabase) | ≥ 3 | 1–2 | 0 | Supabase `leads` |
| **Modal open rate** (`homeowner_cta_click` / `lp_view`) | ≥ 20% | 10–19% | < 10% | PostHog |
| **Email captured** (abandonment saves before Stripe) | ≥ 5 | 2–4 | 0–1 | Supabase `leads` where status=`email_captured` |

**Persevere on H1 if:** deposit ≥ 1 **OR** (intent rate ≥ 10% **AND** high-intent leads ≥ 3)  
**Pivot on H1 if:** 0 deposits AND intent rate < 5% after 72h with ≥ 40 clicks  
**Pause/retest if:** < 40 clicks delivered (insufficient sample — fix ads, don't judge product)

### H1 Micro-survey signal (bonus — not a gate)
Answers to "When do you plan to submit?" inform urgency tier:

| Answer | Interpretation |
|--------|---------------|
| "Within 30 days" | Hot lead — manual follow-up immediately |
| "1–3 months" | Warm — add to drip sequence |
| "Just researching" | Cold — monitor only |

---

## H2 — Pro Supply  
### Signal window: 14 days, unpaid channels only

| Metric | Green ✅ | Yellow ⚠️ | Red ❌ | Where measured |
|--------|----------|-----------|--------|----------------|
| **Pro profile complete** (`pro_profile_complete`) | ≥ 2 | 1 | 0 | PostHog + Supabase `pros` |
| **Pro page views** (`lp_view` on `/pro`) | ≥ 8 | 3–7 | < 3 | PostHog |
| **Pro signup attempts** (`pro_signup`) | ≥ 3 | 1–2 | 0 | PostHog |
| **Quote attempt** (pro contacts us after seeing a lead) | ≥ 1 | — | 0 | Manual / email |

**Persevere on H2 if:** pro_profile_complete ≥ 2  
**Pivot on H2 if:** 0 complete profiles after 14 days AND < 3 pro page views  
**Retest if:** < 3 pro page views (supply outreach hasn't reached them yet — not a product signal)

### H2 Acquisition channels (unpaid, Day 0–14)
Priority order:
1. LinkedIn DMs to Austin permit expediters (search: "permit expediter Austin TX")
2. TX TDLR license holder directory — cold email 20–30 contacts
3. Austin Contractors Facebook Group / Nextdoor Pro
4. Austin permit office bulletin board / in-person ask

---

## H3 — AI Auto-Fill Accuracy  
### Signal window: Day 7 (offline test, 5 sample properties)

| Score | Green ✅ | Yellow ⚠️ | Red ❌ |
|-------|----------|-----------|--------|
| Field-level accuracy (first pass, no human correction) | ≥ 70% | 50–69% | < 50% |

**Test method:** Run auto-fill pipeline on 5 real Austin addresses with known permit data.  
Score = correct fields / total required fields on:
- City of Austin Application for Building Permit (ABP)
- Site Plan checklist (SP-1)
- Zoning data fields (setbacks, FAR, impervious cover)

**Persevere on H3 if:** ≥ 70% accuracy on first pass  
**Conditional on H3 if:** 50–69% — launch as human-assisted, build accuracy in background  
**Pivot on H3 if:** < 50% — remove AI claims from marketing, reposition as marketplace-only

---

## Combined Decision Matrix (Day 14)

| H1 | H2 | H3 | Decision |
|----|----|----|----------|
| ✅ | ✅ | ✅ | **Full speed** — Phase 2: live marketplace, 3 pros, 10 leads, real submissions |
| ✅ | ✅ | ⚠️/❌ | **Proceed as human-only marketplace** — shelve AI claims, hire 1 expediter as contractor |
| ✅ | ❌ | any | **Concierge pivot** — manually source pros per project, no marketplace abstraction |
| ❌ | ✅ | any | **B2B SaaS pivot** — sell auto-fill tool to pros as $49–$99/mo subscription |
| ⚠️ | ⚠️ | any | **Retest** — spend another $150 on ads, tighten targeting, fix funnel friction |
| ❌ | ❌ | ❌ | **Kill or redirect** — test different city (Houston/Denver) or project type (pools/solar) |

---

## Leading Indicators to Watch Daily (Days 1–3)

| Metric | Watch threshold | Action if below |
|--------|----------------|-----------------|
| Ad CTR (Google/Meta) | ≥ 1.5% | Rewrite headline; test benefit-first copy |
| Landing → modal open | ≥ 20% of sessions | A/B test hero headline / CTA button copy |
| Modal → intent submit | ≥ 50% of modal opens | Reduce form fields; move email to first |
| Intent submit → checkout | ≥ 60% | Add social proof in modal; reduce price friction |
| Survey completion rate | ≥ 70% of intent submits | Shorten survey; check UX on mobile |
| Checkout → deposit | ≥ 80% of checkout views | Normal Stripe falloff — acceptable |

---

## Price Variant Interpretation (PostHog `price-test` flag)

With ~60–80 clicks split 3 ways (~20–27 per variant), **no variant can be declared a winner**.
Use these micro-signal rules instead:

| Variant | Deposits | Intent submits | Interpretation |
|---------|----------|---------------|----------------|
| `control` ($199) | ≥ 1 | ≥ 2 | Price not the barrier — keep anchor |
| `beta_149` ($149) | ≥ 1 | ≥ 2 | Mid-tier resonates — test at scale |
| `beta_99` ($99) | ≥ 1 | ≥ 2 | Low price drives conversion — check unit economics |
| All variants | 0 | < 2 | Price is NOT the problem — fix messaging or targeting |

**Key question to answer:** Does any price point generate ≥ 1 deposit in 72h?  
If yes at $99 but not $149/$199 → the market exists but is price-sensitive → unit economics check needed.  
If yes at $199 → strong signal → don't discount.

---

## Budget Guard Rails

| Spend | Trigger |
|-------|---------|
| $0–$20 | Normal test run |
| $20–$40 | Pause and check CTR — only continue if ≥ 1.5% CTR |
| $40–$60 | Finish the test window; collect all data for Day 3 decision |
| > $60 | **STOP** — do not exceed Phase 1 budget without a green H1 signal |

---

## Phase 2 Entry Criteria (commit checklist)

Before spending > $60 on traffic or > 10h on product:

- [ ] H1: ≥ 1 paid deposit OR ≥ 3 high-intent leads
- [ ] H2: ≥ 2 pro profiles complete in Supabase
- [ ] H3: Auto-fill accuracy ≥ 50% (70% preferred)
- [ ] Stripe webhook secret configured (real, not placeholder)
- [ ] PostHog `price-test` flag active and events flowing
- [ ] Micro-survey responses in Supabase for ≥ 3 leads
- [ ] Founder has spoken to ≥ 1 pro and ≥ 1 homeowner who expressed intent

*If all boxes checked → schedule Phase 2 kickoff.*  
*If any box unchecked → fix the specific gap; do not proceed to Phase 2 on momentum alone.*
