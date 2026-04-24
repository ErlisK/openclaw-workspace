# PricePilot — Competitor Matrix
*HBS Discovery Phase — Competitive Landscape*
*Last updated: 2025-04-24*

---

## Summary: The White Space

No existing tool combines all five of: (1) works with one-time sales + subscriptions, (2) Bayesian/low-signal elasticity engine, (3) one-click A/B experiment pages, (4) rollback & safety rails, (5) pricing accessible to <$10k MRR founders. **That gap is PricePilot's beachhead.**

---

## Competitor Matrix

| Product | Primary Target | Pricing Experiment Feature | Price | Handles One-Time Sales | Works at <$10k MRR | Key Gap |
|---|---|---|---|---|---|---|
| **ProfitWell Metrics** (Paddle) | SaaS subscriptions | No | Free (upsell to Retain/Pricing) | No | Partially | Subscriptions only; no experiment engine |
| **Baremetrics** | SaaS/subscription Stripe | No | $108–$333/mo | No | Technically yes, overpriced | No action layer; metrics-only |
| **ChartMogul** | SaaS/subscription | No | Free–$179/mo | No | Yes | No pricing intelligence; analytics only |
| **Gumroad** (native) | Digital product creators | No | 10% fee | Yes | Yes | No pricing intelligence whatsoever |
| **Lemon Squeezy** (native) | Digital SaaS + products | No | 5–8% fee | Yes | Yes | No experimentation; basic analytics |
| **Paddle** | SaaS (SMB–Enterprise) | No | 5% + $0.50/txn | Partially | Yes (SMB) | No elasticity/experiment layer |
| **Shopify Analytics** | E-commerce | Manual A/B via apps | Free–$299/mo platform | Yes | Yes | No pricing-specific intelligence |
| **Optimizely / VWO** | Enterprise web A/B | Yes (price page) | $36k–$200k+/yr | Yes (generic) | No | Enterprise-only; requires 1000s of visitors |
| **Pricefx** | Manufacturing/Retail enterprise | Yes (advanced) | $50k+/yr | Yes | No | Enterprise; irrelevant segment |
| **Zilliant** | B2B Sales pricing | Yes (quoting) | $100k+/yr | No | No | Enterprise; irrelevant segment |
| **Price Intelligently** (Paddle) | Mid-market SaaS | Yes (research-based) | $1,500–$4,000+/mo | No | No | Way out of price range; SaaS-only |
| **Splitbee** | Web analytics | No | Free–$24/mo | N/A | Yes | No pricing focus |
| **Lago** | Open-source billing | No | Free/Open-source | Partially | Yes (engineering-heavy) | Dev tool; no pricing recommendations |
| **Stigg** | Feature entitlement/pricing | Partial (tier management) | Freemium | Yes | Yes (dev effort req.) | Requires engineering setup; no elasticity |
| **Maxio (SaaSOptics)** | SaaS Mid-market | No | $500+/mo | No | No | Out of price range; complex onboarding |
| **Chargebee** | SaaS SMB–Enterprise | No | $299+/mo | No | No | Billing infra, not pricing intelligence |

---

## Detailed Analysis

### ProfitWell / Paddle Pricing Intelligence
- **Positioning:** "Free SaaS metrics, sell Retain (dunning) and Pricing (research) as upsells"
- **What they do well:** Subscription metric benchmarking, willingness-to-pay surveys via their panel
- **What's missing for PricePilot's segment:** 
  - Requires subscription data (won't work with Gumroad one-time sales)
  - The "Pricing" product is a research consultancy, not a self-serve experiment engine
  - No A/B experiment scaffolding; no rollback
  - Results take weeks from a human research team, not automated Bayesian inference
- **Price point:** Pricing Intelligence add-on is $4k–$12k/yr — inaccessible to <$10k MRR founders

### Baremetrics
- **Positioning:** "Transparent revenue metrics for Stripe-powered businesses"
- **What they do well:** Beautiful MRR dashboards, cohort retention, ARR forecasting
- **What's missing:**
  - Metrics, not action — shows you what happened, not what to do
  - No price recommendation engine
  - No A/B testing or experiment management
  - $108/mo starting price is steep when MRR is $2k
  - Requires Stripe subscription data; Gumroad integration is limited
- **Relevance to PricePilot:** Clear complement, not competitor; PricePilot can integrate Baremetrics data as a signal source

### ChartMogul
- **Positioning:** "Subscription analytics platform"
- **What's missing:** Same as Baremetrics — analytics-only, no action layer, subscription-biased

### Gumroad (Native Features)
- **Target users:** Exactly PricePilot's segment
- **What they do well:** Simple storefront, digital delivery, 10% transaction fee model
- **What's critically missing:**
  - Zero pricing intelligence or analytics beyond "here are your sales"
  - No A/B testing of price points
  - No cohort analysis or LTV calculation
  - No bundle/upsell optimization
  - No way to roll out a price change to a subset of visitors
- **Strategic implication:** Gumroad's 4M+ creators are the PricePilot TAM. PricePilot integrates *on top* of Gumroad

### Lemon Squeezy
- **Target users:** Indie SaaS + digital product creators (very close to PricePilot target)
- **What's missing:** Same as Gumroad — excellent billing rails, zero pricing intelligence
- **Note:** Acquired by Stripe in 2024; future product evolution uncertain

### Shopify (+ third-party A/B apps)
- **Target users:** E-commerce merchants
- **Close, but no cigar:** Has pricing flexibility and some A/B apps (Neat A/B Testing, Shoplift)
- **Gap:** Physical/e-commerce focused; no elasticity engine; apps test copy/design, not pricing strategy
- **PricePilot opportunity:** Shopify store owners selling digital products or consulting add-ons

### Optimizely / VWO / AB Tasty
- **What they do:** Full-stack A/B testing on web properties
- **Why they fail for this segment:**
  - Pricing: $30k+/yr — completely inaccessible
  - Require statistical significance via frequentist methods; need 1,000+ conversions per variant
  - Not opinionated about pricing; you set up the experiment yourself
  - No integration with Stripe/Gumroad revenue data

### Lago / Stigg / Maxio / Chargebee
- **Category:** Billing infrastructure and subscription management
- **Why they're irrelevant for PricePilot's core segment:**
  - Engineering-heavy setup (Lago, Stigg)
  - Priced for teams, not solo founders
  - Feature entitlement management ≠ pricing optimization
  - None has a recommendation or experiment engine

---

## Positioning Map

```
                    HIGH PRICE
                         |
   Pricefx              |    Price Intelligently
   Zilliant             |    (Paddle)
                         |
   ENTERPRISE -------- [X] --------- SMB/INDIE
   SEGMENT              |
                         |  Baremetrics  ChartMogul
                         |  Maxio  Chargebee
                         |
   Lago  Stigg           |    [PricePilot HERE]
   (dev tools)           |
                         |  Gumroad  LemonSqueezy
                    LOW PRICE
```

**PricePilot occupies:** Low-to-mid price ($29–$99/mo), deeply indie/solo-focused, with unique action layer (experiments, rollback, Bayesian recommendations) that nobody in this quadrant has.

---

## Key Competitive Insights

1. **The action gap is real:** Every existing tool is either analytics (show data) or billing infrastructure (process payments). Nobody connects data → recommendation → experiment → rollback in one flow for this segment.

2. **Price ceiling is real:** The market has trained solo founders to expect $0–$29/mo for analytics tools. PricePilot must demonstrate ROI (e.g., "pays for itself in 2 days of revenue lift") to justify $49–$99/mo.

3. **Integration moat:** Deep integrations with Gumroad, Lemon Squeezy, and Stripe CSV import create switching costs that dashboards-only tools can't replicate.

4. **Freemius is adjacent but not a competitor:** Handles WordPress plugin/theme payments with some pricing tools, but niche-specific and not self-serve for experimentation.
