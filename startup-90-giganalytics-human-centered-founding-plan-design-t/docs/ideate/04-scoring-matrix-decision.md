# GigAnalytics — Concept Scoring Matrix + Selected Hybrid MVP

**Document type:** Concept evaluation + decision  
**Date:** April 2026  
**Input:** 3 solution directions (A: Payments-First, B: Calendar-First, C: Pricing Lab)  

---

## 1. Scoring Matrix

Criteria are scored 1–5. Each criterion maps to a specific risk identified in the Insight Brief hypotheses.

| Criterion | Weight | Direction A (Payments-First) | Direction B (Calendar-First) | Direction C (Pricing Lab) |
|-----------|--------|:---:|:---:|:---:|
| **Validates H1** (activation — D7 return) | 3× | 4 | 5 | 3 |
| **Validates H2** (import friction ≤30% abandon) | 3× | 5 | 4 | 2 |
| **Validates H3** (surprise — "I didn't know") | 2× | 5 | 5 | 4 |
| **Validates H6** (15%+ convert to Pro) | 3× | 4 | 4 | 5 |
| **Feasibility** (solo, ≤8 weeks) | 2× | 5 | 3 | 4 |
| **Time to first value** (≤10 min) | 3× | 5 | 4 | 3 |
| **Primary segment fit** (service freelancer) | 2× | 5 | 5 | 3 |
| **Differentiation** (vs. competitors) | 2× | 4 | 5 | 5 |
| **Data availability** (no blockers) | 2× | 5 | 4 | 5 |
| **Retention mechanism** | 2× | 3 | 5 | 3 |

### Weighted Totals

```
Direction A: (4×3)+(5×3)+(5×2)+(4×3)+(5×2)+(5×3)+(5×2)+(4×2)+(5×2)+(3×2)
  = 12 + 15 + 10 + 12 + 10 + 15 + 10 + 8 + 10 + 6 = 108

Direction B: (5×3)+(4×3)+(5×2)+(4×3)+(3×2)+(4×3)+(5×2)+(5×2)+(4×2)+(5×2)
  = 15 + 12 + 10 + 12 + 6 + 12 + 10 + 10 + 8 + 10 = 105

Direction C: (3×3)+(2×3)+(4×2)+(5×3)+(4×2)+(3×3)+(3×2)+(5×2)+(5×2)+(3×2)
  = 9 + 6 + 8 + 15 + 8 + 9 + 6 + 10 + 10 + 6 = 87
```

| Direction | Raw Score | Rank |
|-----------|-----------|------|
| **A — Payments-First** | **108** | **1st** |
| B — Calendar-First | 105 | 2nd |
| C — Pricing Lab | 87 | 3rd |

---

## 2. Score Interpretation

**Direction A (108):** Wins on feasibility, time-to-first-value, and data availability. The "upload CSV → see $/hr" flow is the most concrete, fastest-to-validate concept. Its weakness is retention (H1 risk: users may get one insight and not return until next CSV export). This is the MVP baseline.

**Direction B (105):** Nearly ties with A, and has the best retention score by far (weekly review is a natural recurring touchpoint). Its weaknesses are build complexity and the unvalidated H5 (calendar inference quality). This is the strongest retention mechanism in the product — it must be added to the MVP hybrid.

**Direction C (87):** Strong differentiation and willingness-to-pay, but fails on primary segment fit (many service freelancers have only 2–3 long-term clients, not high-volume proposal workflows). It's the best upsell/Pro feature but not the right core product for MVP. Defer to post-MVP.

---

## 3. The Retention Gap Problem

Direction A alone has a structural retention problem:

```
A's retention model (without B):
  Day 0: User imports Stripe CSV → sees $/hr → "wow, direct clients pay 2.4× more"
  Day 1-6: No reason to return (income is monthly; timer is optional)
  Day 7: Maybe they log some time?
  Day 30: Next CSV export available → they might come back

D7 retention risk: LOW, because there's no daily or weekly trigger.
```

Direction B solves this:
```
B's retention model:
  Week 1: Calendar events auto-proposed → user reviews and confirms
  Week 2: New events appear → weekly review notification
  Week 3: "Your $/hr has updated based on this week's work"
  
D7 retention strength: HIGH, because weekly review creates a recurring touchpoint.
```

**Conclusion:** A alone is feasible and fast. B alone is powerful but slow and complex. **The right answer is A + B hybrid:** ship A first (MVP), add B in the second sprint (V1.1), use A's speed to validate H1 and H3 while B is being built.

---

## 4. Selected Hybrid MVP Architecture

### Phase 1: MVP (Weeks 1–8) — Direction A Core

**What ships:**
- Email/Google signup (no waitlist)
- Stripe + PayPal + Upwork CSV import with auto-detection
- One-tap timer + quick-entry retroactive logging
- Overhead time tagging (proposal/admin reduces effective $/hr)
- Cross-stream $/hr comparison as primary dashboard view
- AI recommendation text (Vercel AI Gateway → Claude Haiku)
- Income goal + progress bar
- Stripe Checkout Pro ($9/month · $79/year)
- Benchmarking opt-in (MVP-lite: industry data until 50 users)

**What is deferred:**
- Google Calendar OAuth (requires app verification + 2 extra weeks)
- A/B pricing experiment (Direction C — deferred post-MVP)
- Heatmap (requires 60 days of data — not available at MVP)

**What Direction A contributes:** Speed to value. Users see their $/hr in ≤5 minutes.

---

### Phase 2: V1.1 (Weeks 9–12) — Add Direction B

**What ships:**
- Google Calendar OAuth integration
- ICS upload as privacy-first alternative
- Calendar event → stream inference (rule-based + LLM classification)
- Weekly review UI (batch confirm/reject proposed events)
- Timer becomes secondary to calendar (calendar is the primary data source)

**What Direction B contributes:** Retention. Weekly review creates a recurring product engagement touchpoint. D7 retention should improve significantly with calendar integration.

---

### Phase 3: V2.0 (Weeks 13–20) — Add Direction C

**What ships:**
- A/B pricing experiment (setup, proposal logging, conversion tracking)
- Price simulator
- Statistical confidence indicator
- Revenue-per-proposal metric alongside $/hr

**What Direction C contributes:** Prescriptive value (helps users earn more, not just understand what they earn). This is the most defensible Pro feature and the strongest upgrade motivation.

---

## 5. Hybrid MVP: Feature Priority Reconciliation

The hybrid MVP (Phase 1 = Direction A core) is confirmed against the priorities from `03-feature-priorities.md`:

| Feature | Priority in Define | Hybrid MVP? | Direction |
|---------|-------------------|-------------|-----------|
| Zero-waitlist signup | P0 | ✅ MVP | A |
| Stripe CSV import | P0 | ✅ MVP | A |
| PayPal CSV import | P0 | ✅ MVP | A |
| Upwork CSV import | P0 | ✅ MVP | A |
| One-tap timer | P0 | ✅ MVP | A |
| $/hr calculation + cross-stream comparison | P0 | ✅ MVP | A |
| AI recommendation text | P0 | ✅ MVP | A+B |
| Google Calendar integration | P0 for SF segment | ❌ V1.1 | B |
| Per-client Stripe breakdown | P1 | ✅ MVP | A |
| Overhead time tagging | P1 | ✅ MVP | A |
| Income goal progress | P1 | ✅ MVP | A |
| Toggl CSV import | P1 | ✅ MVP | A |
| Stripe Checkout Pro | P1 | ✅ MVP | A |
| Heatmap (7-day summary) | P2 | ❌ V1.1 | B |
| A/B pricing experiment | P2 | ❌ V2.0 | C |
| Full heatmap (60-day) | P2 | ❌ V2.0 | B+C |
| Benchmark (GigAnalytics-sourced) | P2 | ❌ V1.1 | A |
| Benchmark (industry data) | P2 | ✅ MVP-lite | A |

---

## 6. Risk Register: Hybrid MVP

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| H1 fails — D7 retention <20% even after core flow | Medium | High | Ship calendar (B) earlier if retention data is poor in first 30 days |
| H2 fails — CSV import abandonment >40% | Medium | High | Add "import helper" (screen recording showing how to export from Stripe) |
| H5 fails — calendar inference <30% accuracy | Low-Medium | Medium | Defer calendar launch; fix inference quality before shipping |
| H6 fails — <5% upgrade at 200 activated users | Medium | High | Reassess feature gates; consider tightening free tier limits |
| Google OAuth app verification takes >4 weeks | Medium | Low | ICS upload as launch-day privacy alternative; OAuth adds V1.1 |
| CSV format edge cases create support load | High | Medium | Pre-test with 20 real user CSVs in alpha; document known edge cases |

---

## 7. Decision Statement

> **We are building the Payments-First Hybrid MVP (Direction A + B roadmap).**
>
> Phase 1 ships in 8 weeks with Directions A's CSV → $/hr core. Phase 2 adds Direction B's calendar inference (weeks 9–12) to address the retention gap. Direction C (Pricing Lab) is confirmed as the V2.0 product evolution after the core has been validated.
>
> This sequence prioritizes: (1) fastest hypothesis validation for H1 and H3, (2) a clear retention path that doesn't require calendar to be built on day one, and (3) the most differentiated long-term roadmap.

---

*This scoring matrix and decision are the basis for the IA map and user journey blueprints in `05-ia-map.md` and `06-user-journeys.md`.*
