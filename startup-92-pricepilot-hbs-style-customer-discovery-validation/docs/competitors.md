# PricingSim — Competitor Matrix
*HBS Discovery Phase — Competitive Landscape*
*Last updated: 2025-04-24 — enriched with live pricing data from competitor pages*

---

## Summary: The White Space

No existing tool combines all five of: (1) works with one-time sales + subscriptions, (2) Bayesian/low-signal elasticity engine, (3) one-click A/B experiment pages, (4) rollback & safety rails, (5) pricing accessible to <$10k MRR founders. **That gap is PricingSim's beachhead.**

---

## Competitor Matrix

| Product | Primary Target | Pricing Experiment Feature | Price | Handles One-Time Sales | Works at <$10k MRR | Key Gap |
|---|---|---|---|---|---|---|
| **ProfitWell Metrics** (Paddle) | SaaS subscriptions | No | Free (upsell to Retain/Pricing) | No | Partially | Subscriptions only; no experiment engine |
| **Baremetrics** | SaaS/subscription Stripe | No | **$75/mo** (Launch, up to $360K ARR) | No | Technically yes, overpriced | No action layer; metrics-only |
| **ChartMogul** | SaaS/subscription | No | **Free up to $10K MRR; $59–$99/mo** (Starter, billed annually) | No | Yes (free tier) | No pricing intelligence; analytics only |
| **Gumroad** (native) | Digital product creators | No | **10% flat fee** per transaction; no monthly fee | Yes | Yes | No pricing intelligence whatsoever |
| **Lemon Squeezy** (native) | Digital SaaS + products | No | **5% + $0.50/txn** (Starter); 8% (no monthly fee option) | Yes | Yes | No experimentation; basic analytics only |
| **Paddle** | SaaS (SMB–Enterprise) | No | **5% + $0.50/txn** (pay-as-you-go); custom for enterprise | Partially | Yes (SMB) | No elasticity/experiment layer |
| **Shopify Analytics** | E-commerce | Manual A/B via apps | Free–$299/mo platform | Yes | Yes | No pricing-specific intelligence |
| **Convert.com** | Enterprise/agency A/B testing | Yes (price page variants) | **$199/mo** (200K tested users/mo) | Yes (generic) | Borderline | No revenue integration; requires traffic volume |
| **Optimizely / VWO** | Enterprise web A/B | Yes (price page) | $36k–$200k+/yr | Yes (generic) | No | Enterprise-only; requires 1000s of visitors |
| **LaunchDarkly** | DevOps feature flags | Partial (price flag rollout) | **~$12/seat/mo** (Starter); enterprise pricing | No | No (requires engineering) | Feature flag infra, not pricing intelligence |
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
- **Live pricing (scraped):** ProfitWell Metrics is free; Paddle charges 5% + $0.50/transaction for billing. Paddle pricing page confirms: "Pay-as-you-go: 5% + 50¢ per Checkout transaction" with "Custom pricing for rapidly scaling businesses."
- **What they do well:** Subscription metric benchmarking, willingness-to-pay surveys via their panel
- **What's missing for PricingSim's segment:** 
  - Requires subscription data (won't work with Gumroad one-time sales)
  - The "Pricing" product is a research consultancy, not a self-serve experiment engine
  - No A/B experiment scaffolding; no rollback
  - Results take weeks from a human research team, not automated Bayesian inference
- **Price point:** Pricing Intelligence add-on is $4k–$12k/yr — inaccessible to <$10k MRR founders

### Baremetrics
- **Positioning:** "Transparent revenue metrics for Stripe-powered businesses"
- **Live pricing (scraped):** Launch plan **starts at $75/mo** for $0–$360K ARR, single Stripe integration. Includes subscription analytics, trial insights, automated email reports, data enrichment via Clearbit. No pricing experimentation features.
- **What they do well:** Beautiful MRR dashboards, cohort retention, ARR forecasting
- **What's missing:**
  - Metrics, not action — shows you what happened, not what to do
  - No price recommendation engine
  - No A/B testing or experiment management
  - $75/mo starting price is steep when MRR is $1–2k (that's 3–7% of revenue)
  - Requires Stripe subscription data; Gumroad integration is limited
- **Relevance to PricingSim:** Clear complement, not competitor; PricingSim can integrate Baremetrics data as a signal source

### ChartMogul
- **Positioning:** "Your SaaS metrics, finally trustworthy. One source of truth for MRR, ARR, and churn."
- **Live pricing (scraped):** **Free up to $10K MRR** (1 billing source, 3 team members). Starter plan at **$59/mo** (annual) for up to $120K ARR. Pro at **$99/mo** (annual). Enterprise from $19,900/yr.
- **Key differentiator vs PricingSim:** ChartMogul has the most generous free tier in the space and genuinely serves early-stage founders. However:
  - Still analytics-only; no pricing recommendation engine
  - No A/B experiment scaffolding or rollback
  - Subscription-biased; poor fit for one-time digital product sellers
  - No Gumroad integration (Stripe, Chargebee, Paddle only)
- **Competitive implication:** ChartMogul free tier is direct competition for PricingSim's onboarding hook; PricingSim must differentiate on *action*, not just metrics

### Gumroad (Native Features)
- **Target users:** Exactly PricingSim's segment
- **Live pricing (scraped):** 10% flat fee per transaction. No monthly subscription. Features include: customizable store, memberships, subscriptions, "pay what you want", discount codes, bundles/upsells. Customer testimonials emphasize simplicity: *"I upload a file, set a price, and I can start selling."*
- **What's critically missing:**
  - Zero pricing intelligence or analytics beyond "here are your sales"
  - No A/B testing of price points
  - No cohort analysis or LTV calculation
  - No way to roll out a price change to a subset of visitors
  - No rollback capability
- **Strategic implication:** Gumroad's 4M+ creators are the PricingSim TAM. PricingSim integrates *on top* of Gumroad via CSV export + API

### Lemon Squeezy
- **Target users:** Indie SaaS + digital product creators (very close to PricingSim target)
- **Live pricing (scraped):** Transaction fee model: Starter at 5% + $0.50/txn. Features include: per-seat pricing, usage-based billing, license key management, digital downloads, no-code checkout, bundles/upsells, coupon codes, real-time revenue insights (MRR, refunds, AOV), AI fraud protection. Testimonials highlight fast setup and all-in-one convenience.
- **What's critically missing:** Despite listing "real-time revenue insights", the analytics are basic — MRR, refunds, AOV. No pricing recommendation engine, no price elasticity analysis, no A/B experiment framework.
- **Note:** Acquired by Stripe in 2024; future product roadmap may expand analytics, making PricingSim's window of differentiation time-sensitive.

### Shopify (+ third-party A/B apps)
- **Target users:** E-commerce merchants
- **Close, but no cigar:** Has pricing flexibility and some A/B apps (Neat A/B Testing, Shoplift, Intelligems). Intelligems is closest to PricingSim's value prop for Shopify — it tests price points with traffic splits. However:
  - Shopify-only; no Gumroad/Stripe/Lemon Squeezy
  - Requires Shopify plan ($29–$299/mo just for the platform)
  - Physical product / e-commerce framing; not built for digital-only creators
  - No Bayesian engine; relies on frequentist significance
- **PricingSim opportunity:** Shopify store owners selling digital products or consulting add-ons are a secondary segment

### Convert.com
- **Live pricing (scraped):** $199/mo for 200K tested users/month. Counts "tested users" as unique visitors bucketed into active experiments. Will not cancel for traffic spikes.
- **Why it fails for PricingSim's segment:**
  - $199/mo is 10–40% of monthly revenue for the target segment — non-starter
  - Traffic-based pricing model is irrelevant for low-volume digital product sellers
  - Frequentist stats; needs high conversion volume to produce significance
  - Not integrated with Stripe/Gumroad revenue data; tests landing pages, not billing flows
  - No Bayesian engine; no pricing-specific recommendations

### Optimizely / VWO / AB Tasty
- **What they do:** Full-stack A/B testing on web properties
- **Why they fail for this segment:**
  - Pricing: $30k+/yr — completely inaccessible
  - Require statistical significance via frequentist methods; need 1,000+ conversions per variant
  - Not opinionated about pricing; you set up the experiment yourself
  - No integration with Stripe/Gumroad revenue data

### LaunchDarkly
- **What it does:** Feature flag management and progressive delivery for engineering teams
- **Why it's used as a pricing proxy:** Teams use feature flags to roll out new price IDs to a % of users, enabling gradual price changes without full deployment
- **Why it fails for PricingSim's target:** Requires engineering team to implement; no pricing intelligence layer; no recommendations; pricing starts ~$12/seat/mo but effectively requires a developer to operate; not a solo-founder tool

### Lago / Stigg / Maxio / Chargebee
- **Category:** Billing infrastructure and subscription management
- **Why they're irrelevant for PricingSim's core segment:**
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
   Lago  Stigg           |    [PricingSim HERE]
   (dev tools)           |
                         |  Gumroad  LemonSqueezy
                    LOW PRICE
```

**PricingSim occupies:** Low-to-mid price ($29–$99/mo), deeply indie/solo-focused, with unique action layer (experiments, rollback, Bayesian recommendations) that nobody in this quadrant has.

---

## Key Competitive Insights

1. **The action gap is real:** Every existing tool is either analytics (show data) or billing infrastructure (process payments). Nobody connects data → recommendation → experiment → rollback in one flow for this segment.

2. **Price ceiling is real:** The market has trained solo founders to expect $0–$29/mo for analytics tools. PricingSim must demonstrate ROI (e.g., "pays for itself in 2 days of revenue lift") to justify $49–$99/mo.

3. **Integration moat:** Deep integrations with Gumroad, Lemon Squeezy, and Stripe CSV import create switching costs that dashboards-only tools can't replicate.

4. **Freemius is adjacent but not a competitor:** Handles WordPress plugin/theme payments with some pricing tools, but niche-specific and not self-serve for experimentation.
