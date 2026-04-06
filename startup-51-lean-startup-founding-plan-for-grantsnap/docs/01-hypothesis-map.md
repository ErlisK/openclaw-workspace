# GrantSnap — Hypothesis Map & Test Plans
**Phase 1 · Assumption Mapping & Discovery**
**Version:** 1.0 | **Date:** 2025-07-12

---

## Overview

Hypotheses are ordered **high → low risk** (i.e., riskiest assumptions first — if they're wrong, the whole product concept collapses). Each hypothesis has a falsifiable statement, risk rating, test method, success threshold, and owner.

**Risk Scale:**  
🔴 Critical — business doesn't exist without this  
🟠 High — major pivot required if false  
🟡 Medium — feature/pricing adjusts  
🟢 Low — optimization, not survival

---

## H1 — VALUE HYPOTHESIS (Riskiest)

**Hypothesis:**  
Small nonprofit teams (≤5 volunteers/staff) can assemble a credible, submission-ready grant proposal in ≤3 days using GrantSnap's modular block system — compared to their current average of 2–4 weeks.

**Risk Level:** 🔴 Critical  
**Why it's riskiest:** If users can't meaningfully reduce proposal time, the entire product value collapses. No amount of matching or pricing optimization saves it.

**Assumptions underneath:**
1. Teams currently spend disproportionate time *assembling* (not researching) proposals
2. Mission/outcome/budget language *is* meaningfully reusable across funders
3. A drag-and-drop block interface is learnable by non-technical volunteers in <30 minutes
4. "Credible" output is achievable without grant-writing expertise embedded in the tool

**Test Plan:**

| Step | Action | Timeline |
|------|--------|----------|
| 1 | 12 discovery interviews — ask: "Walk me through your last proposal. How long? What part took longest?" | Week 1–2 |
| 2 | Paper prototype test — give 3 users a printed block library + RFP, ask them to assemble a 2-page proposal | Week 3 |
| 3 | Timed task test — 5 users with clickable Figma prototype, measure time-to-complete-draft | Week 4 |
| 4 | Funder review — ask 2 program officers to rate dummy proposals for "professional credibility" | Week 4–5 |

**Success Threshold:**  
- ≥70% interviewees confirm reuse of proposal text between grants  
- Timed test median ≤3 days (4h simulated)  
- ≥1 program officer rates output "fundable as-is or with minor edits"

**Failure Signal:**  
- Users say the hardest part is *researching the funder* or *relationship-building*, not writing  
- <50% reuse text — each proposal is written from scratch

---

## H2 — FEASIBILITY HYPOTHESIS

**Hypothesis:**  
GrantSnap can curate 100+ relevant, active local grant opportunities per target region monthly with ≤0.5 FTE (20h/month) by combining structured funder databases with semi-automated scraping + community tagging.

**Risk Level:** 🔴 Critical  
**Why it's high risk:** Without a steady pipeline of matched opportunities, the product has no recurring reason to exist. This is the "content moat" problem — and it's an ops bet, not just a tech bet.

**Assumptions underneath:**
1. 100+ relevant grants exist per region per month (not just annually)
2. Grant data is accessible via public sources (foundation websites, government portals)
3. Semi-automated scraping + human QA can sustain freshness at ≤20h/month
4. "Relevant" can be operationalized via simple tag taxonomy

**Test Plan:**

| Step | Action | Timeline |
|------|--------|----------|
| 1 | Manual audit of Bay Area grants (Candid, FoundationSearch, city/county portals, CF websites) for 30 days | Week 1–2 |
| 2 | Count qualifying opportunities (open, <$50K, no LOI required, small org eligible) | Week 2 |
| 3 | Time-track hours spent: find → verify → tag → publish | Week 2–3 |
| 4 | Extrapolate to monthly FTE requirement | Week 3 |
| 5 | Build simple scraper prototype for top 5 sources, measure hit rate | Week 4–6 |

**Success Threshold:**  
- 100+ grants found in 30-day Bay Area audit  
- Manual curation takes ≤20h for the month  
- ≥80% of scraped grants remain accurate 2 weeks after ingestion

**Failure Signal:**  
- <60 grants found → not enough volume  
- Curation takes >40h → economically unviable at current pricing  
- Most grants require LOI or existing relationships → not accessible to cold applicants

---

## H3 — MATCHING HYPOTHESIS

**Hypothesis:**  
A simple tag-based matching system (org type × focus area × geography × budget size) produces grant recommendations where ≥60% of surfaced opportunities are rated "relevant" by the target org.

**Risk Level:** 🟠 High  
**Why it's high:** Bad matching = user frustration + no engagement. But this is more fixable than H1/H2 — ML or human curation can improve it. Still needs validation before we build complex logic.

**Assumptions underneath:**
1. Orgs can accurately self-tag their focus areas in ≤5 minutes
2. Funders' eligibility can be reliably tagged from public descriptions
3. Simple intersection (org tags ∩ grant tags) produces better-than-random results
4. Geography + budget filters alone eliminate most irrelevant results

**Test Plan:**

| Step | Action | Timeline |
|------|--------|----------|
| 1 | Define tag taxonomy (v1): 8 focus areas, 6 org types, 4 budget ranges, geographic granularity | Week 2 |
| 2 | Manually tag 50 grants from Bay Area audit | Week 2–3 |
| 3 | Have 5 real orgs complete profile (self-tag), then rate matched results: "Would you apply?" | Week 3–4 |
| 4 | Calculate precision (relevant/total shown) and recall (found/actually available) | Week 4 |

**Success Threshold:**  
- ≥60% of surfaced grants rated "relevant, would consider applying"  
- Orgs complete profile in ≤7 minutes  
- ≥3/5 orgs find at least 5 new-to-them opportunities

**Failure Signal:**  
- Precision <40% → noise overwhelms signal  
- Orgs struggle with self-tagging → profile friction kills onboarding

---

## H4 — MONETIZATION HYPOTHESIS

**Hypothesis:**  
Small nonprofits and volunteer-led orgs will pay $19–$49/month for GrantSnap once they see the value, and the conversion rate from free trial to paid will be ≥15%.

**Risk Level:** 🟡 Medium  
**Why it's medium:** Nonprofit WTP is real (many pay for GrantStation, Instrumentl, Candid at $50–$150+/mo) but the segment we're targeting (grassroots/volunteer-led) is more price-sensitive. Risk is manageable — pricing can adjust.

**Assumptions underneath:**
1. Target orgs have ANY discretionary budget for tools (~$20–$50/mo)
2. They perceive GrantSnap as differentiated from free alternatives (Google + luck)
3. A 14-day free trial is enough to reach an "aha moment"
4. Annual billing discount (e.g., 2 months free) meaningfully improves LTV

**Test Plan:**

| Step | Action | Timeline |
|------|--------|----------|
| 1 | In interviews, ask: "What tools do you pay for? What's your software budget?" | Week 1–2 |
| 2 | Show pricing page mockup in interview: gauge reaction to $19 / $39 / $49 tiers | Week 2–3 |
| 3 | Add Stripe payment to waitlist landing page ("Reserve founder pricing") — measure click-through, not actual charge | Week 3–4 |
| 4 | Van Westendorp price sensitivity survey (n=30) via waitlist email | Week 4–5 |

**Success Threshold:**  
- ≥40% of interviewees say they'd "definitely" or "probably" pay for $19/mo tier  
- ≥5% of landing page visitors click "reserve founder pricing"  
- Van Westendorp: acceptable range includes $19–$39

**Failure Signal:**  
- Majority cite "we have no budget for this"  
- Price sensitivity peaks below $10/mo → doesn't support unit economics  
- "We'd use it only grant-season" → signals seasonal churn risk

---

## Prioritization Summary

| # | Hypothesis | Risk | Test Cost | If False... |
|---|-----------|------|-----------|------------|
| H1 | Value: ≤3 day proposal assembly | 🔴 Critical | Low (interviews) | Pivot entire product concept |
| H2 | Feasibility: 100+ grants/region/mo | 🔴 Critical | Medium (ops test) | Pivot to user-sourced content model |
| H3 | Matching: tag-based ≥60% precision | 🟠 High | Low (survey) | Add AI/human curation layer |
| H4 | Monetization: $19–$49/mo | 🟡 Medium | Low (survey) | Adjust pricing or go freemium |

---

## Phase 1 Test Sequencing

```
Week 1-2:  Launch interviews (H1+H4 signal)
           Begin Bay Area grant audit (H2 test)
Week 3:    Paper prototype test (H1 validation)
           Tag taxonomy + matching test (H3)
Week 4:    Timed Figma prototype test (H1 final)
           Pricing survey to waitlist (H4)
Week 5-6:  Scraper prototype for H2 automation
           Synthesize all findings → pivot/proceed decision
```

**Decision Gate (End of Phase 1):**  
If H1 AND H2 pass → build MVP  
If H1 fails → deep re-interview to find actual core pain  
If H2 fails → explore partnership with existing grant databases (Candid API, Foundation Directory)

---

*Document owner: Founding Team | Review at end of Week 4 discovery sprint*
