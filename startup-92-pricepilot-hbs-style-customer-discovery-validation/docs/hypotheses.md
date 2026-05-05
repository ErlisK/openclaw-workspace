# PricingSim — Problem Hypotheses
*HBS Discovery Phase — Steps 1–2*
*Last updated: 2025-04-24*

---

## Primary Segment

**Solo creators and one-person micro-SaaS founders doing $500–$10k MRR** who sell at least one of:
- Digital products (templates, fonts, icon packs, Notion/Figma/Obsidian assets)
- Online courses or cohort programs
- Micro-SaaS tools (single-feature apps, browser extensions, API wrappers)
- Productized consulting (fixed-scope retainers, audits, strategy sprints)

**Demographics:**
- Typically 1 person; occasionally 2 (founder + VA/contractor)
- Primarily bootstrapped, no VC, revenue = salary
- Platforms: Gumroad, Lemon Squeezy, Stripe, Shopify, Paddle, Podia, Teachable
- Communities: IndieHackers, r/SaaS, r/microsaas, X (Twitter), Slack groups

**Why this band matters ($500–$10k MRR):**
- Too small for enterprise pricing consultants or large analytics platforms (Chargebee, Maxio)
- Large enough that pricing decisions have real dollar impact (a 15% price lift at $5k MRR = $750/mo = $9k/yr)
- Motivated to grow but have neither the data volume nor risk tolerance for reckless experimentation
- Underserved: most tools assume hundreds of customers; these founders often have 20–200

---

## Core Job-to-be-Done

> **"When I'm unsure if my price is leaving money on the table, I want to safely test a higher price so I can grow revenue without scaring off the customers I already have."**

**Primary job:** Increase revenue per customer through smarter pricing, not more customers  
**Secondary job:** Reduce the anxiety and ambiguity that keeps founders stuck at their current price forever  
**Emotional job:** Feel like a "real business" that makes data-driven decisions, not gut-driven guesses

**Hiring trigger:** The founder has been at roughly the same price for 6–18 months, suspects they're underpriced, but is paralyzed by fear of churn or angry emails.

---

## Key Constraints

### 1. Low Transaction Volume
- Most founders in this segment have 20–500 customers total, often fewer
- Classical frequentist A/B testing requires hundreds of conversions per variant; meaningless for these sample sizes
- Standard split-test tools (Optimizely, VWO) produce no useful signal under typical monthly traffic of 300–2,000 visitors

### 2. Risk Aversion / Revenue Fragility
- Revenue = personal income; a 20% churn spike from a bad price change can be financially devastating
- No investor safety net; no runway buffer; one bad move is felt immediately
- Founders have seen (or personally experienced) horror stories of raised prices causing mass cancellations on platforms like ProductHunt
- Will not adopt any tool that could "nuke my business"

### 3. Time and Cognitive Bandwidth Poverty
- Solo operators wear every hat: product, support, marketing, finance
- Will not spend >2 hours setting up an experiment
- Will not analyze spreadsheets or build revenue models from scratch
- Needs recommendations, not raw data

### 4. Noisy / Incomplete Data
- Transaction histories from Gumroad may only show 6–18 months of sales
- Seasonal spikes (AppSumo launch, Product Hunt, Black Friday) distort baselines
- No CRM data; limited cohort information; customers are largely anonymous
- Mix of one-time purchases and subscriptions makes analysis non-trivial

### 5. Platform Lock-in Concerns
- Most founders can't do server-side A/B testing on Gumroad or Podia — limited customizability
- Stripe allows price variants but requires technical setup; most non-technical founders avoid it
- Lemon Squeezy and Gumroad don't expose a native "run a price experiment" feature

---

## Why Current Approaches Fail

### 1. Gut-Feel Price Changes ("Just Raise It and See")
- No data to support the decision; relies on Twitter anecdata ("I raised my price 3x and doubled revenue!")
- No rollback plan; permanent changes expose full customer base at once
- Survivorship bias: founders who killed churn by raising prices share loudly; those who lost 40% of customers go quiet
- **Gap PricingSim fills:** Statistical grounding + staged rollout + rollback button

### 2. General Analytics Tools (Baremetrics, ChartMogul, ProfitWell)
- Show what happened, not what to do
- Designed for SaaS companies with subscription data; poor fit for one-time digital product sellers
- Minimum viable data: Baremetrics requires Stripe/Braintree subscription data; irrelevant for Gumroad sellers
- No pricing recommendation engine; no A/B test scaffolding; no rollback
- Pricing: Baremetrics starts at $108/mo — often more than the founder's own product revenue
- **Gap PricingSim fills:** Action-oriented recommendations, not just dashboards; works with low-volume one-time sales

### 3. Enterprise Pricing Optimization (Pricefx, Zilliant, PROS)
- Built for manufacturing, retail, or SaaS companies with thousands of SKUs and millions of transactions
- Minimum deal size typically $50k+/year
- Require dedicated implementation teams and months of onboarding
- **Gap PricingSim fills:** Zero-setup, opinionated, built for 1-person operations

### 4. DIY Spreadsheet Models
- Founders copy-paste revenue CSVs into Google Sheets and try to model elasticity by hand
- No statistical rigor; cognitive overhead is high; mistakes are easy
- Can't simulate "what if" without building the model from scratch
- Not connected to live payment data; requires manual refresh
- **Gap PricingSim fills:** Auto-ingestion from Stripe/Gumroad + automated Bayesian simulations

### 5. Pricing Consultants
- Cost $200–$500/hr; inaccessible at $2k MRR
- One-time engagement; no ongoing experiment loop
- Advice is generic; not calibrated to the founder's specific data
- **Gap PricingSim fills:** Persistent, affordable, data-driven pricing intelligence at 1/100th the cost

---

## Hypothesis Stack

**H1 — The Core Pain Hypothesis (Most Critical)**  
> More than 60% of solo founders at $500–$10k MRR believe their current price is suboptimal, but have not changed it in over 6 months due to fear of churn or uncertainty about the right direction.  
*Falsifiable via: survey of 50+ founders; customer interviews; community polls*

**H2 — The Data Scarcity Hypothesis**  
> More than 70% of target founders have fewer than 200 transactions in their last 12 months, making classical A/B testing statistically useless, creating demand for Bayesian/low-signal approaches.  
*Falsifiable via: analysis of publicly shared revenue stats on IndieHackers; Stripe MRR distribution data*

**H3 — The Safety-First Adoption Hypothesis**  
> Founders will only adopt a pricing tool if it includes explicit rollback capability and staged rollouts (e.g., "only show new price to 20% of visitors"); the absence of these features is a hard blocker.  
*Falsifiable via: willingness-to-pay interviews; feature ranking exercises*

**H4 — The Revenue Lift Hypothesis**  
> Founders using PricingSim's Bayesian recommendation engine will achieve a statistically significant revenue lift of ≥10% within 60 days, compared to no-change control groups.  
*Falsifiable via: product telemetry post-launch; cohort analysis of early adopters*

**H5 — The Channel Hypothesis**  
> The primary acquisition channels for PricingSim are IndieHackers, r/SaaS, and Twitter/X — specifically posts from founders sharing pricing experiments — not paid ads or SEO.  
*Falsifiable via: UTM tracking on early signups; community post engagement rates*

---

## Cluster-Informed Hypothesis Refinements
*Updated after AI clustering of 60 public signals via Vercel AI Gateway (2025-04-24)*

### Cluster Validation of H1–H5

**H1 (Core Pain) — STRENGTHENED:**  
Cluster 1 (Fear-of-Churn Price-Increase Paralysis) is the single most frequent pain category at 13.3% of all signals. The AI independently identified this as the #1 priority cluster, confirming H1's primacy. The cluster reveals the emotion is not just "uncertainty" but specifically churn anxiety — meaning rollback and staged rollout are not just nice-to-haves but *pre-conditions for adoption*.

**H2 (Data Scarcity) — STRENGTHENED:**  
Cluster 2 (Statistically-Invalid Tiny-Sample Tests) confirms that sample size anxiety is a distinct, named pain (10% frequency). Founders are aware that classical A/B testing is invalid for them — they just have no Bayesian alternative. This validates PricingSim's Bayesian engine as the core technical differentiation.

**H3 (Safety-First) — STRONGLY CONFIRMED:**  
Clusters 1 and 9 together (20% of signals) directly map to the rollback + staged rollout requirement. The cluster analysis reveals the mechanism: it's not just that founders want safety — they've been *burned* by previous price changes done wrong, making safety infrastructure the psychological unlock for adoption.

**H4 (Revenue Lift) — REFINED:**  
Cluster 4 (Missing Value-to-Price Alignment) suggests the average underpricing gap is 3–10x — much larger than the 10% lift estimated in H4. Revised: PricingSim should be able to demonstrate ≥15–25% revenue lift within 60 days for first-time users, since most are severely underpriced.

**H5 (Channel) — CONFIRMED:**  
Clusters were sourced from r/SaaS, r/microsaas, IndieHackers, and Twitter/BuildInPublic — the exact channels named in H5. The highest-engagement signals came from r/SaaS and r/microsaas.

### New Hypothesis H6 (Vicious Cycle Unlock)
> **H6:** Founders cannot break their discount-dependency cycle without first running a successful safe price experiment. Once they see a successful rollout (even at 10% traffic), the emotional unlock allows subsequent experiments to happen faster and with more confidence.

*Falsifiable via: user interview probing sequence; behavioral analytics on second/third experiment rates vs. control*

### Cluster-to-Feature Priority Map

| Priority | Cluster | MVP Feature Required |
|---|---|---|
| P0 | Fear-of-Churn Paralysis | Staged rollout + rollback |
| P0 | Tiny-Sample Tests | Bayesian low-signal engine |
| P0 | Data-Blind Guesswork | Guided pricing advisor |
| P1 | Value-to-Price Gap | Value calculator + benchmarks |
| P1 | Execution Gap | One-click A/B setup (no code) |
| P2 | Discount Trap | Discount recovery simulator |
| P2 | Migration Guilt | Email templates + cohort migration |
| P3 | Bundle Uncertainty | Bundle optimizer |
