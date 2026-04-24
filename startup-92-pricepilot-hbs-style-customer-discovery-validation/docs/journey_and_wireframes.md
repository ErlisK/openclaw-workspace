# PricePilot — Customer Journey Map & UX Wireframes
*HBS Steps 3–4 | Primary Personas: Maya (Gumroad) + Marcus (Stripe)*
*Last updated: 2025-04-24*

---

## Overview

PricePilot's core user journey has **7 stages** mapping directly to the product's value chain. Each stage is documented with: user mental model, key actions, friction points, and UX wireframe description.

```
DISCOVER → CONNECT → ANALYZE → SIMULATE → EXPERIMENT → MONITOR → ROLLBACK/COMMIT
```

---

## Journey Stage 1: DISCOVER

### User Mental Model
Maya just had a viral Gumroad post and watched $1,800 in sales happen when she suspects $29 could have made $5,100. She Googles "how to test pricing on Gumroad" and finds nothing useful. Sees a tweet from another creator: "Used PricePilot to test my Gumroad price — it just worked."

Marcus has been reading the same r/SaaS thread for the 6th time this month. A customer emailed him saying they'd "pay twice as much." He's about to try to build something himself in Stripe.

### Key Friction Points
- ⚠️ Hero copy must immediately answer "does this work with Gumroad?" (Maya) and "does this work with Stripe subscriptions?" (Marcus)
- ⚠️ First visible element must be a real case study number, not abstract benefit copy
- ⚠️ No free trial gate — must show value before email capture

### Wireframe: Landing Page

```
┌─────────────────────────────────────────────────────────────────┐
│  PricePilot                                    [Sign in]  [Start free] │
├─────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Test a higher price.           ←── Hero headline
│  Safely. In weeks. Not months.  ←── Sub-headline
│                                                                         │
│  ┌──────────────────────────────────────────────────────┐             │
│  │ 📈 "Tested $12 vs $29 on my Notion template.         │             │
│  │     PricePilot said $29 wins. Revenue up 41%."       │             │
│  │                               — @traf_notiontemplate │             │
│  └──────────────────────────────────────────────────────┘             │
│                                                                         │
│  Works with:  [Gumroad] [Stripe] [Shopify] [CSV Upload]               │
│                                                                         │
│  [Connect Gumroad →]  [Connect Stripe →]  [Upload CSV →]              │
│                                                                         │
│  No code. No stats degree. No enterprise pricing tools.               │
│                                                                         │
│  ─────────────────────────────────────────────────────────            │
│                                                                         │
│  How it works:                                                          │
│  1. Connect your payment platform (60 seconds)                         │
│  2. Pick a product to test                                             │
│  3. Get a split-test URL — share it on your next post/launch          │
│  4. See a plain-English verdict when confidence crosses 90%            │
│  5. Raise your price with one click. Or rollback instantly.           │
│                                                                         │
└─────────────────────────────────────────────────────────────────┘
```

**Key UX decisions:**
- "Connect Gumroad" is the primary CTA (Maya persona = largest segment)
- Case study with real numbers is above the fold
- Platform logos signal "works with my tool" before they read a word
- Zero mention of "Bayesian" or technical language on landing page

---

## Journey Stage 2: CONNECT / IMPORT DATA

### User Mental Model
Maya clicks "Connect Gumroad." Expects 3 steps max. Will abandon if asked for API credentials, webhooks, or code.

Marcus clicks "Connect Stripe." Knows OAuth. Has been to developer dashboards before. Can tolerate 2 minutes of setup.

### Key Friction Points
- ⚠️ Gumroad OAuth is limited (no public API for transactions). Must fall back to CSV export with clear instructions.
- ⚠️ Marcus needs to explicitly select which products/plans to include in the analysis
- ⚠️ First data load must show something useful within 60 seconds, not a spinner

### Flow: Gumroad (Maya)

```
Step 1: "Connect Gumroad"
  ┌─────────────────────────────────────────┐
  │  Connect your Gumroad store             │
  │                                         │
  │  [Connect via Gumroad OAuth]            │
  │                                         │
  │  — or —                                 │
  │                                         │
  │  Upload sales CSV                       │
  │  (Dashboard → Analytics → Export CSV)  │
  │                                         │
  │  [Choose file ...]  [Upload]            │
  └─────────────────────────────────────────┘

Step 2: Product selection (auto-populated from data)
  ┌─────────────────────────────────────────┐
  │  Found 8 products. Which to analyze?   │
  │                                         │
  │  ☑ Ultimate Notion Dashboard  $12  847 sales │
  │  ☑ Study Vault Bundle         $19  312 sales │
  │  ☐ Minimalist Journal         $7   1,203 sales│
  │  ☐ ...                                  │
  │                                         │
  │  [Analyze selected products →]          │
  └─────────────────────────────────────────┘
```

### Flow: Stripe (Marcus)

```
Step 1: OAuth → Stripe Connect (standard flow)

Step 2: Plan selection
  ┌─────────────────────────────────────────┐
  │  Found 3 active plans. Pick one to test.│
  │                                         │
  │  ○ Starter  $29/mo  142 active          │
  │  ○ Pro      $79/mo   23 active          │
  │  ○ Custom   $199/mo   8 active          │
  │                                         │
  │  [Analyze Starter plan →]               │
  └─────────────────────────────────────────┘
```

### Wireframe: Data Import Screen

```
┌────────────────────────────────────────────────────────────────┐
│  ← Back   Import your data                                     │
├────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ✅ Gumroad connected                                                  │
│  ⏳ Importing sales history... (847 transactions found)               │
│                                                                        │
│  ┌──────────────────────────────────────────────────────┐            │
│  │ Quick snapshot                                         │            │
│  │                                                        │            │
│  │ Total sales (12mo):    $8,241                          │            │
│  │ Avg order value:       $12.40                          │            │
│  │ Top product:           Notion Dashboard ($12)         │            │
│  │ Sales velocity:        ~65/mo  ↑ trending              │            │
│  │                                                        │            │
│  │ ⚠️  Low volume detected: 65 sales/mo                  │            │
│  │    PricePilot will use Bayesian estimation             │            │
│  │    to give you results with as few as 30 sales.        │            │
│  └──────────────────────────────────────────────────────┘            │
│                                                                        │
│  [Continue to analysis →]                                             │
│                                                                        │
└────────────────────────────────────────────────────────────────┘
```

**Key UX decisions:**
- Surface "low volume detected" early with reassurance about Bayesian approach
- Show $ numbers immediately — confirms the data loaded correctly
- "Quick snapshot" is a trust signal before asking them to do anything

---

## Journey Stage 3: ANALYZE / SIMULATE

### User Mental Model
Maya: "Tell me what's happening with my pricing. In English."
Marcus: "Show me my cohort data. What do my best customers look like vs. my churners?"

### Key Friction Points
- ⚠️ Must not show statistics/charts that require interpretation
- ⚠️ The recommendation must come with a confidence score in plain English ("72% confident")
- ⚠️ Must explain WHY — what signal led to this recommendation

### Wireframe: Analysis Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│  Notion Dashboard  · Gumroad  · Last updated: just now         │
├────────────────────────────────────────────────────────────────┤
│                                                                        │
│  📊 CURRENT STATE                                                      │
│  ┌──────────────────────────────────────────────────────┐            │
│  │  Current price:  $12         Sales/mo:   65           │            │
│  │  Est. revenue:   $780/mo     Conversion: ~3.2%        │            │
│  │  Avg buyer type: first-time (87% one-time buyers)    │            │
│  └──────────────────────────────────────────────────────┘            │
│                                                                        │
│  💡 PRICE RECOMMENDATION                                              │
│  ┌──────────────────────────────────────────────────────┐            │
│  │  PricePilot recommends testing:  $12  vs  $29        │            │
│  │                                                        │            │
│  │  Projected outcome at 90-day mark:                    │            │
│  │  ┌────────────────┬──────────────┐                   │            │
│  │  │ Stay at $12    │ Move to $29  │                   │            │
│  │  │ ~$780/mo       │ ~$1,140/mo   │                   │            │
│  │  │                │ +46% revenue │                   │            │
│  │  │ Confidence: —  │ Confidence: 68% (need ~30 more   │            │
│  │  │                │  conversions to confirm)          │            │
│  │  └────────────────┴──────────────┘                   │            │
│  │                                                        │            │
│  │  Why? Comparable templates in your category sell     │            │
│  │  for $24–$49. Your conversion rate suggests buyers   │            │
│  │  are not price-sensitive at current price.            │            │
│  │                                                        │            │
│  │  Conservative estimate. We won't recommend >3x       │            │
│  │  price increase in a single experiment.               │            │
│  └──────────────────────────────────────────────────────┘            │
│                                                                        │
│  [Start experiment: $12 vs $29 →]   [Adjust prices]                  │
│                                                                        │
└────────────────────────────────────────────────────────────────┘
```

**Key UX decisions:**
- Recommendation is opinionated (2 prices only, not a spectrum)
- Confidence score shown with plain English qualifier
- "Why?" section is always visible — removes black-box anxiety
- Conservative note ("won't recommend >3x") is a trust signal

---

## Journey Stage 4: SHIP EXPERIMENT PAGE

### User Mental Model
Maya: "Give me a link I can drop in my next tweet."
Marcus: "Give me a URL I can put on my pricing page for new visitors only."

### Key Friction Points
- ⚠️ For Gumroad: must redirect to the correct Gumroad product page with the right price
- ⚠️ For Stripe: must generate two Stripe checkout links (one per price variant)
- ⚠️ Must be shareable in < 2 minutes from decision

### Flow

```
Step 1: Confirm prices
  ┌─────────────────────────────────────────┐
  │  Set up your experiment                 │
  │                                         │
  │  Variant A (control):   $12  [edit]     │
  │  Variant B (test):      $29  [edit]     │
  │                                         │
  │  Traffic split:                         │
  │  [50/50] [70/30 A] [80/20 A] [custom]  │
  │                                         │
  │  Expose to:                             │
  │  ○ All visitors (new + returning)       │
  │  ● New visitors only (recommended)      │
  │                                         │
  │  [Generate experiment link →]           │
  └─────────────────────────────────────────┘

Step 2: Share
  ┌─────────────────────────────────────────┐
  │  ✅ Experiment active                    │
  │                                         │
  │  Your experiment link:                  │
  │  pricepilot.co/e/abc123def              │
  │                                         │
  │  [Copy link]  [Share on Twitter]        │
  │                                         │
  │  How it works:                          │
  │  • Visitors to this URL are randomly    │
  │    split: 50% see $12, 50% see $29     │
  │  • You'll get results when we have      │
  │    enough data (est. ~30 more sales)   │
  │  • Email me when results are ready ✓  │
  │                                         │
  │  [View live results] [Done]             │
  └─────────────────────────────────────────┘
```

### Optional: Billing Update (Marcus / Stripe)

```
  ┌──────────────────────────────────────────────────┐
  │  Want to also test on your pricing page?          │
  │                                                    │
  │  We'll create two Stripe checkout links:          │
  │  • checkout.stripe.com/... (Variant A: $29)      │
  │  • checkout.stripe.com/... (Variant B: $49)      │
  │                                                    │
  │  Replace your current "Start free trial" button   │
  │  with the experiment link above.                   │
  │                                                    │
  │  [Generate Stripe links]  [Skip for now]          │
  └──────────────────────────────────────────────────┘
```

---

## Journey Stage 5: MONITOR LIFT

### User Mental Model
Both personas: "Tell me when you have a result. Don't make me check every day."

### Wireframe: Live Results View

```
┌────────────────────────────────────────────────────────────────┐
│  Experiment: Notion Dashboard  · Day 12 of ~21                 │
├────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────┐  ┌──────────────────────┐                  │
│  │  Variant A: $12      │  │  Variant B: $29  🏆   │                  │
│  │  23 visitors         │  │  19 visitors           │                  │
│  │  8 conversions       │  │  7 conversions         │                  │
│  │  Conv rate: 34.8%    │  │  Conv rate: 36.8%      │                  │
│  │  Revenue: $96        │  │  Revenue: $203         │                  │
│  │  Rev/visitor: $4.17  │  │  Rev/visitor: $10.68   │                  │
│  └──────────────────────┘  └──────────────────────┘                  │
│                                                                        │
│  📊 Current confidence: 61%                                           │
│  ████████████░░░░░░░  Need ~18 more conversions                       │
│                                                                        │
│  Predicted outcome: +34% revenue lift if B wins                       │
│  (conservative: +22% accounting for uncertainty)                      │
│                                                                        │
│  [Rollback to A instantly]    [Pause experiment]                      │
│                                                                        │
│  Estimated result date: May 8 (11 more days)                         │
│                                                                        │
└────────────────────────────────────────────────────────────────┘
```

**Email notification when confidence ≥ 90%:**
```
Subject: 🎯 PricePilot result: $29 wins with 91% confidence

Your experiment is done.

Variant B ($29) beat Variant A ($12) in revenue per visitor.

Current revenue estimate: +$360/mo by switching to $29.

[Switch to $29 now — one click]
[See full results]
[Keep testing for more certainty]
```

---

## Journey Stage 6: COMMIT OR ROLLBACK

### Wireframe: Decision Screen

```
┌────────────────────────────────────────────────────────────────┐
│  🎉 Result ready  · 91% confidence                             │
├────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Winner: Variant B at $29                                             │
│                                                                        │
│  Revenue impact (next 30 days):                                       │
│  Current trajectory:    $780/mo                                       │
│  Projected at $29:      $1,140/mo  (+$360/mo)                        │
│                                                                        │
│  ─────────────────────────────────────────────────────────            │
│                                                                        │
│  Option 1: COMMIT  ← Recommended                                      │
│  ┌───────────────────────────────────────────────────┐               │
│  │ Switch your Gumroad product price to $29          │               │
│  │ (We'll update it directly via API)                │               │
│  │                                                    │               │
│  │ [Update to $29 now →]                             │               │
│  └───────────────────────────────────────────────────┘               │
│                                                                        │
│  Option 2: KEEP TESTING                                               │
│  Wait for 95% confidence (est. 5 more days)                          │
│  [Continue experiment]                                                 │
│                                                                        │
│  Option 3: ROLLBACK                                                   │
│  Something feels off? Revert to $12 instantly.                       │
│  [Rollback to $12]                                                     │
│                                                                        │
│  ─────────────────────────────────────────────────────────            │
│                                                                        │
│  📧 Optional: Send price-change notice to your buyers               │
│  [Use template →]                                                     │
│                                                                        │
└────────────────────────────────────────────────────────────────┘
```

---

## Full Journey Map (Swimlane View)

```
PERSONA: MAYA (Gumroad Template Seller)

STAGE        │ USER ACTION          │ SYSTEM RESPONSE           │ FRICTION
─────────────┼─────────────────────┼──────────────────────────┼──────────────────
DISCOVER     │ Sees tweet with real │ Landing page loads with   │ ⚠️ Hero must show
             │ revenue numbers      │ Gumroad logo + case study │ Gumroad first
─────────────┼─────────────────────┼──────────────────────────┼──────────────────
CONNECT      │ Uploads Gumroad CSV │ Parses CSV, shows product │ ⚠️ Must load in
             │ (OAuth unavailable) │ list w/sales counts       │ <5 seconds
─────────────┼─────────────────────┼──────────────────────────┼──────────────────
ANALYZE      │ Selects product      │ Shows snapshot + Bayesian │ ⚠️ No jargon.
             │ Reads recommendation│ recommendation w/$ impact │ Show $ not stats
─────────────┼─────────────────────┼──────────────────────────┼──────────────────
EXPERIMENT   │ Clicks "Start test" │ Generates split link      │ ⚠️ Link must work
             │ Copies link         │ Tracks via redirect       │ instantly
─────────────┼─────────────────────┼──────────────────────────┼──────────────────
MONITOR      │ Shares link, waits  │ Emails result when ready  │ ⚠️ Must not
             │ Checks dashboard    │ Live progress bar visible │ require daily check
─────────────┼─────────────────────┼──────────────────────────┼──────────────────
DECISION     │ Reads result        │ 3-option screen:          │ ⚠️ Rollback must
             │ Commits or rolls bk │ commit / keep / rollback  │ be 1 click, instant
─────────────┼─────────────────────┼──────────────────────────┼──────────────────
SHARE        │ Posts result tweet  │ "Share result" button     │ ← Organic viral loop
             │ #BuildInPublic      │ Pre-written tweet copy    │
```

---

## Critical UX Principles

1. **Never show raw statistics** — always translate to $ impact and plain-English confidence
2. **Rollback is always one click** — visible on every screen after an experiment starts
3. **Conservative by default** — cap recommendations at 2.5x current price; warn on > 1.5x
4. **Mobile-readable results** — founders check email on phone; result emails must be scannable in 10 seconds
5. **Setup < 5 minutes** — if Gumroad setup (CSV upload → first recommendation) takes >5 min, they churn

---

## Screen Inventory (Full App)

| Screen | Route | Primary Persona |
|---|---|---|
| Landing page | `/` | Maya, Marcus |
| Connect Gumroad (CSV) | `/connect/gumroad` | Maya |
| Connect Stripe (OAuth) | `/connect/stripe` | Marcus |
| Product selector | `/onboard/products` | Both |
| Analysis dashboard | `/dashboard` | Both |
| Price recommendation | `/dashboard/[productId]/recommend` | Both |
| Experiment setup | `/experiments/new` | Both |
| Experiment live view | `/experiments/[id]` | Both |
| Result decision screen | `/experiments/[id]/result` | Both |
| Email templates | `/tools/email-templates` | Marcus, Alexei |
| Settings / integrations | `/settings` | Both |
