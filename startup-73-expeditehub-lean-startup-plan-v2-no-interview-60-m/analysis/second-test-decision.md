# Phase 5 — Second Test: Austin Deck vs. Austin ADU

## Decision: PARALLEL TEST — Build "Austin Deck" thin-slice

**Recorded:** 2026-04-12  
**Status:** Building

---

## Decision Logic

### Why not deepen Austin ADU?

| Signal | Status |
|---|---|
| Product completeness | ✅ AI packet, quotes, corrections, timeline view, ToS — fully built |
| Organic demand | ❌ 0 homeowner form fills, 0 deposits |
| Distribution unblocked? | ❌ Not yet — community posts not live |
| Pro supply | ❌ 0 verified pros |

Deepening ADU before solving distribution is waste. The product is ready.

### Why "Austin Deck" as the second test?

Austin decks are the **lowest-friction residential permit type**:

| Factor | ADU | Deck |
|---|---|---|
| Permit complexity | High (zoning, impervious, setbacks, utility) | Low (structural calc, setbacks) |
| Homeowner urgency | Moderate | **Higher** — faster project cycle |
| Search volume | ~600/mo "Austin ADU permit" | **~900/mo "Austin deck permit"** |
| Avg permit fee paid to expediter | $1,500–$3,000 | $300–$800 |
| Time to permit (Austin DSD) | 45–90 days | **7–21 days** |
| Pro supply needed | Full expediter | **Any licensed contractor** |
| AI form fill difficulty | High | **Low** — fewer fields |

**Deck is a faster signal test**: lower barrier, shorter cycle, more addressable supply.  
If deck gets deposits that ADU didn't → ADU demand problem, not execution.  
If neither → distribution problem, test messaging.

### Test format: 3-day demand test, $60 budget

**Day 1–2 (Austin ADU):**
- Post ADU message variant A ("guaranteed 48h match") on Reddit r/Austin, Nextdoor
- $20 Google Ads for ADU LP

**Day 1–2 (Austin Deck — parallel):**
- New LP at `/lp/deck-permit-austin`
- Same thin-slice: deposit → request → pro board
- Post deck message to r/Austin, Nextdoor, r/DIY
- $20 Google Ads for deck LP

**Day 3: Decision point**

| Result | Action |
|---|---|
| ≥1 deck deposit, 0 ADU | Double down on deck; deprioritize ADU |
| ≥1 ADU deposit, 0 deck | Deepen ADU; pause deck |
| Both get deposits | Build unified "Austin residential permits" hub |
| Neither (< 3 form fills each) | **PIVOT** — B2B SaaS for permit firms at $149/mo |

---

## What's being built now

1. `/lp/deck-permit-austin` — LP with deck-tuned messaging
2. `/deck-request` — 4-step deck request form (simplified vs ADU)
3. Deck-tuned BP fields in AI packet (deck footprint, ledger attachment, footing spec)
4. Stripe deck deposit prices ($79/$99)
5. `/pivot` page updated with deck test results

---

## Message variant test (ADU)

### Control (current): "Get your Austin ADU permit packet in 48 hours"
### Variant A: "Fixed price. Fast permit. Austin ADU."
- Headline: "Your Austin ADU permit packet — fixed $1,800"
- Subhead: "Licensed expediter, AI-drafted BP-001, DSD submission. No hourly billing."
- CTA: "Reserve my spot — $99 deposit"

### Variant B (deck): "Deck permit in 7 days — or your deposit back"
- Headline: "Austin deck permit, done right"  
- Subhead: "Licensed contractor quotes your project same day. AI-drafted plans package ready in 48h."
- CTA: "Start for $79"

---

## Success criteria for this test

- **Primary**: ≥1 paid deposit (ADU or deck) within 5 days of live traffic
- **Secondary**: CPL (form fill with address) ≤ $30
- **Tertiary**: Quote submitted within 24h of any project posted

## Failure criteria (triggers PIVOT)
- < 3 combined form fills after 200+ impressions across both tests
- 0 deposits after ≥1 form fill (messaging/pricing problem, not demand)
