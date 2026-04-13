# ExpediteHub — Pivot / Persevere Memo
**Date:** 2026-04-11  
**Phase:** 4 — Template Hardening & Quoting UX  
**Author:** Founding AI Agent (ExpediteHub v0)

---

## 1. What We Shipped in Phase 3–4

| Deliverable | Status |
|---|---|
| MVP (Next.js + Supabase + Stripe) | ✅ Live |
| Landing pages A/B ($/199 vs $99 beta) | ✅ Deployed |
| Pro onboarding + magic-link auth | ✅ Live |
| Pro portal with quote flow | ✅ Live |
| 50+ outreach emails to Austin expediters | ✅ Sent |
| 5 community/org emails (AIA, HBA, Monitor) | ✅ Sent |
| Template editor v0 (localStorage) | ✅ Shipped |
| **Template editor v1 (Supabase-backed)** | ✅ Phase 4 |
| **Quoting UX v1.5 (presets + checklist)** | ✅ Phase 4 |
| **AI packet auto-fill accuracy: 78.6%** | ✅ Phase 4 |
| Paid search ($60 MS Ads) | ❌ Blocked by VPS IP / CAPTCHA |

---

## 2. Signal Inventory

### Demand Signals (Homeowner Side)
| Signal | Count | Quality |
|---|---|---|
| LP page views (organic) | ~0 confirmed | No UTM traffic yet |
| Lead captures from LP | 0 | Needs paid/organic traffic |
| Request form submissions | 0 (seeded 1) | No real demand yet |
| Checkout attempts | 0 | |

### Supply Signals (Pro Side)
| Signal | Count | Quality |
|---|---|---|
| Outreach emails sent | 55 | Cold |
| Pro accounts created | 1 (seeded) | Seeded, not organic |
| Organic pro signups | 0 | |
| Quotes submitted | 1–2 (seeded) | Seeded |
| Reply rate from outreach | 0% confirmed | |

### Product Quality Signals
| Metric | Value | Target | Status |
|---|---|---|---|
| AI auto-fill accuracy (required fields) | **78.6%** | ≥75% | ✅ |
| Fields needing homeowner input | 4/14 req | ≤5 | ✅ |
| Quote-to-conversation rate | N/A (no real quotes) | ≥50% | ⚠️ |
| Packet preview abandonment | N/A | ≤30% | ⚠️ |

---

## 3. Hypothesis Status

### H1: Homeowners will pay $99–$199 for AI-assisted ADU permit prep
**Verdict: UNTESTED** — No paid traffic delivered to LPs. LP exists and is functional; no real conversion data.  
**Next action:** Drive traffic via Google Ads (residential IP required) or Reddit/community posts.

### H2: Austin expediters will quote within 48h of project posting
**Verdict: UNTESTED** — Pro outreach sent but no organic signups. One seeded quote.  
**Next action:** Follow-up email to wave 1–2 list. Consider direct LinkedIn outreach to Austin permit expediters.

### H3: AI auto-fill saves 60%+ of form-prep time
**Verdict: PARTIALLY VALIDATED** — 78.6% of required fields auto-fill from GIS/rules/account. Remaining 4 fields (existing structure sqft, hard surface sqft, utility connection, phone) must come from homeowner intake.  
**Next action:** Add these 4 fields to the intake form (`/request`) and re-measure.

### H4: Escrow/milestone payments reduce pro payment risk
**Verdict: NOT TESTABLE YET** — No paying transaction has occurred.

---

## 4. Riskiest Assumption (Next Test)

> **"At least one Austin homeowner actively planning an ADU will find the platform, trust it enough to enter their address, and pay $99+ for the AI packet."**

This is the most critical unvalidated hypothesis. Every other assumption flows downstream from this.

**Why it's the riskiest:**
- We have supply-side infrastructure but zero organic demand
- LP exists but has received no real traffic
- All 55 outreach emails were to pros (supply side) not homeowners (demand side)

**How to test it (next 5 days):**
1. **Reddit r/Austin + r/homeowners** — post the community drafts from `outreach/community-posts.md` manually. Requires ~15 min human time.
2. **Nextdoor Austin** — post in 3 Austin neighborhoods near Red River. Local trust builder.
3. **Google Ads from residential IP** — import `ads/google-ads-import.csv`, target "austin adu permit" + "austin backyard cottage permit". $20 budget, 3 days.
4. **Facebook Groups**: "Austin ADU Owners," "Austin Homeowners" — post the Facebook draft.

**Success threshold for persevere decision:**
- ≥1 paid transaction ($99+) within 7 days of first organic traffic hit → **PERSEVERE**
- ≥3 LP form fills (name + address entered) without payment → iterate pricing/framing, try $49
- 0 engagement after 200+ LP views → **PIVOT** (consider B2B: sell template tools to permit companies, not homeowners)

---

## 5. Pivot Options (if demand signal is weak)

### Option A: B2B SaaS — Sell to Expediters
Instead of selling to homeowners, license the AI form-fill tool to permit expediting firms. They use it to prep packets faster; we charge $49/month or per-packet.
- **Pros:** Firms are easier to reach, less price-sensitive, no consumer trust barrier
- **Cons:** Smaller TAM, no marketplace network effects

### Option B: GovTech — Sell to Municipalities
Sell the jurisdiction-tuned template system to Austin DSD or other cities as a self-service pre-screening tool.
- **Pros:** Large contracts, high barriers to competition
- **Cons:** Long sales cycles, wrong team profile for current speed

### Option C: Narrow + Deepen — ADU Only, One Neighborhood
Focus on a single Austin zip (78702, 78704) with hyper-local marketing and door-to-door flyers. Prove demand in a 2-mile radius first.
- **Pros:** Concentrated distribution, word-of-mouth
- **Cons:** Very narrow initial TAM

---

## 6. Persevere Decision Framework

```
IF (paid_transactions >= 1 AND NPS >= 7) → PERSEVERE, raise $25K from angels
IF (leads >= 10 AND conversion < 2%)     → ITERATE pricing/messaging, A/B test $49
IF (leads < 5 after 300 LP views)        → PIVOT to Option A (B2B SaaS)
IF (pros reply rate < 5% after 75 emails) → PIVOT pro acquisition to direct sales
```

---

## 7. Next Milestone

**Phase 5 target (7 days):**
- [ ] 1 paid homeowner ($99+)
- [ ] 3 real pro replies from outreach
- [ ] Intake form updated with 4 missing fields → accuracy ≥80%
- [ ] Community posts manually published by founder

**If Phase 5 target missed:** Execute Pivot Option A (B2B expediter licensing).

---

*Generated by ExpediteHub AI Agent — Phase 4 retrospective*
