---
title: "Building a Bayesian Pricing Engine in TypeScript: How PricePilot Finds Optimal Prices with Noisy Data"
description: "A deep dive into the Normal-InvGamma conjugate model, spike detection, and conservative revenue optimization that powers PricePilot's pricing engine — all in TypeScript, no Python required."
tags: ["typescript", "bayesian", "statistics", "nextjs"]
canonical_url: "https://startup-92-pricepilot-hbs-style-cus.vercel.app/blog/building-the-bayesian-pricing-engine"
cover_image: "https://startup-92-pricepilot-hbs-style-cus.vercel.app/assets/screenshot-homepage.png"
---

When I started building PricePilot, I faced a problem that every statistics-minded solo developer eventually hits: **how do you run a meaningful pricing experiment when you have 30–100 sales per month instead of 30,000?**

Traditional A/B testing frameworks (Optimizely, VWO) are built for high-traffic consumer apps. They assume frequentist statistics: set a sample size up front, collect data until you hit it, then check for statistical significance at p < 0.05. With 50 monthly sales per variant, a frequentist test would take 14–20 months to reach significance. That's useless for a solo founder.

Bayesian inference changes the question. Instead of *"is this statistically significant?"*, it asks *"given the data we have so far, what's the probability that Price B generates more revenue than Price A?"*. That question is answerable with 20–40 data points. This post explains exactly how we implemented the answer.

---

## The Core Model: Price Elasticity as a Regression Problem

The fundamental assumption is a log-linear price-demand relationship:

```
log(Q/Q_ref) = ε · log(P/P_ref) + noise
```

Where:
- `Q` is the observed sales rate (units per day)  
- `P` is the observed price
- `Q_ref`, `P_ref` are a reference period's sales and price
- `ε` is the **price elasticity of demand** — the parameter we're estimating
- `noise` accounts for seasonality, marketing, and random variation

A typical value of `ε = -1.0` means a 10% price increase causes a 10% demand decrease, leaving revenue roughly flat. `ε = -0.5` means demand is inelastic — a 10% price increase only reduces demand by 5%, growing revenue by ~4.5%.

Our prior on `ε` is `Normal(-1.0, 0.5²)` — we believe most digital products sit near unit elasticity, but allow significant uncertainty. This prior pulls the estimate toward -1.0 when we have little data and lets the data speak more as observations accumulate.

---

## Normal-InvGamma Conjugate Posterior

The magic of a conjugate model is that the posterior has a closed-form solution — no MCMC, no sampling at inference time (except when we need predictive distributions). We use the Normal-InvGamma (NIG) conjugate prior for linear regression with unknown variance.

```typescript
interface NIGPosterior {
  mu: number    // posterior mean of ε
  lam: number   // posterior precision on ε
  a: number     // shape of σ² posterior
  b: number     // scale of σ² posterior
}

function nigUpdate(
  x: number[], y: number[],
  priorMu = -1.0, priorSd = 0.5, priorA = 3.0, priorB = 0.5
): NIGPosterior {
  const lam0 = 1 / (priorSd * priorSd)  // prior precision = 1/variance
  const N = x.length
  
  // Sufficient statistics for simple regression through origin
  let Sxx = 0, Sxy = 0, Syy = 0
  for (let i = 0; i < N; i++) {
    Sxx += x[i] * x[i]
    Sxy += x[i] * y[i]
    Syy += y[i] * y[i]
  }
  
  // Posterior parameters (conjugate update)
  const lamPost = lam0 + Sxx
  const muPost  = (priorMu * lam0 + Sxy) / lamPost
  const aPost   = priorA + N / 2
  const bPost   = priorB + 0.5 * Syy
               + 0.5 * priorMu * priorMu * lam0
               - 0.5 * muPost * muPost * lamPost
  
  return { mu: muPost, lam: lamPost, a: aPost, b: bPost }
}
```

The update equations deserve explanation:

- **`lamPost = lam0 + Sxx`**: posterior precision is prior precision plus data precision. More observations → tighter estimate.
- **`muPost = (priorMu * lam0 + Sxy) / lamPost`**: posterior mean is a precision-weighted average of prior and data.
- **`aPost = priorA + N/2`**: each observation contributes 0.5 to the InvGamma shape, tightening our estimate of `σ²`.
- **`bPost`**: the scale update is the key step — it accumulates the sum of squared residuals plus a correction for prior-posterior disagreement.

With 5 observations and a strong prior, `muPost` barely moves from -1.0. With 50 observations, the data dominates.

---

## Predictive Distribution via Student-t Sampling

The marginal posterior of `ε` integrating over `σ²` is a Student-t distribution. This is wider than a normal distribution and captures our uncertainty about the noise level — important when we have few observations.

```typescript
function sampleStudentT(df: number, mu: number, scale: number, n: number): number[] {
  const samples: number[] = []
  for (let i = 0; i < n; i++) {
    // Normal via Box-Muller
    const u1 = Math.random(), u2 = Math.random()
    const z = Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2)
    
    // Chi-squared approximation (sum of squared normals)
    let chi2 = 0
    for (let j = 0; j < Math.min(df, 30); j++) {
      const u3 = Math.random(), u4 = Math.random()
      const n2 = Math.sqrt(-2 * Math.log(u3 + 1e-10)) * Math.cos(2 * Math.PI * u4)
      chi2 += n2 * n2
    }
    chi2 = chi2 || df  // fallback for very large df
    
    samples.push(mu + scale * z / Math.sqrt(chi2 / df))
  }
  return samples
}
```

We then forward-simulate revenue at each candidate price by applying each elasticity sample:

```typescript
function predictRevenue(
  pNew: number, pRef: number, rRef: number,
  elasticitySamples: number[]
): RevenueDistribution {
  const ratio = pNew / pRef
  // Revenue = P_new * Q_new = P_new * Q_ref * (P_new/P_ref)^ε
  // = P_ref * Q_ref * (P_new/P_ref)^(1+ε)
  // = rRef * ratio^(1+ε)
  const revs = elasticitySamples.map(e => ratio ** (1 + e) * rRef)
  revs.sort((a, b) => a - b)
  const n = revs.length
  const pct = (p: number) => revs[Math.floor(p * n / 100)]
  
  return {
    p05: pct(5), p25: pct(25), p50: pct(50), p75: pct(75), p95: pct(95),
    mean: revs.reduce((a, b) => a + b, 0) / n,
    prob_above_current: revs.filter(r => r > rRef).length / n,
  }
}
```

The full revenue distribution — not just a point estimate — is what powers the UI's confidence score and the conservative recommendation rule.

---

## The Conservative Rule: Maximize Expected Revenue Subject to Downside Constraint

A "maximize expected revenue" optimizer would recommend aggressive prices when the distribution has a fat right tail. But solo founders can't stomach a bad month. Our optimizer adds a downside constraint:

> **Find the price that maximizes `E[Revenue]` subject to `p05(Revenue) >= 0.95 × R_ref`**

Translation: the 5th-percentile outcome must not be more than 5% below current revenue.

```typescript
function findOptimalPrice(
  pRef: number, rRef: number, eMonthly: number,
  samples: number[]
): { price: number; dist: RevenueDistribution; rules: string[] } | null {
  const rules: string[] = []
  let maxMult = 2.5  // hard cap at 2.5× current price
  const eMean = samples.reduce((a, b) => a + b, 0) / samples.length

  // Tighten cap based on data signals
  if (eMonthly < 200) { maxMult = Math.min(maxMult, 1.5); rules.push('low_mrr_1.5x_cap') }
  if (eMean < -2.5)   { maxMult = Math.min(maxMult, 1.3); rules.push('high_elasticity_1.3x_cap') }

  const floor = rRef * 0.95  // 5% downside tolerance
  let bestPrice = 0, bestMean = -Infinity, bestDist: RevenueDistribution | null = null

  for (let mult = 1.1; mult <= maxMult; mult += 0.05) {
    const p = Math.round(pRef * mult * 100) / 100
    const dist = predictRevenue(p, pRef, rRef, samples)
    if (dist.p05 < floor) continue  // fails downside constraint
    if (dist.mean > bestMean) {
      bestMean = dist.mean
      bestPrice = p
      bestDist = dist
    }
  }

  return bestDist ? { price: bestPrice, dist: bestDist, rules } : null
}
```

The grid search is deliberately coarse (5% increments) because we're suggesting an experiment target, not a precise optimum. Psychological pricing ($29.99 vs $30.24) matters more than the engine's decimal places.

---

## Spike Detection: Removing Promo Cohorts

A common failure mode: a ProductHunt launch creates a spike at a discounted price. If we naively include those sales, the elasticity estimate thinks demand is high at low prices and projects terrible results for higher prices.

We use a Median Absolute Deviation (MAD) filter:

```typescript
function flagSpikes(txns: Transaction[]): Transaction[] {
  const qtyPerDay = txns.map(t => t.quantity / t.period_days)
  const sorted = [...qtyPerDay].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const mad = sorted
    .map(v => Math.abs(v - median))
    .sort((a, b) => a - b)[Math.floor(sorted.length / 2)]
  
  return txns.map((t, i) => ({
    ...t,
    // Modified Z-score > 3.0 = outlier (Iglewicz & Hoaglin, 1993)
    is_spike: mad > 0
      ? (0.6745 * Math.abs(qtyPerDay[i] - median) / mad) > 3.0
      : false,
  }))
}
```

MAD is preferred over standard deviation for outlier detection because it's not inflated by the very outliers you're trying to detect. The 0.6745 factor scales MAD to approximate a normal distribution's standard deviation.

---

## CSV Import: Auto-Detecting Gumroad/Stripe/Shopify Formats

Parsing real-world export CSVs is messy. We detect columns by substring matching rather than exact header names, because Gumroad changed their export format twice in 2024:

```typescript
export function parseGumroadCSV(csvText: string): { rows: ParsedTransaction[]; errors: string[] } {
  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
  
  // Fuzzy column detection
  const colDate    = header.findIndex(h => h.includes('date') || h.includes('time'))
  const colPrice   = header.findIndex(h => h.includes('price') || h.includes('amount'))
  const colProduct = header.findIndex(h => h.includes('product') || h.includes('title'))
  const colRefund  = header.findIndex(h => h.includes('refund'))
  const colEmail   = header.findIndex(h => h.includes('email') || h.includes('buyer'))
  
  // ...
}
```

One subtlety: we hash the buyer email to a `customer_key` using a simple polynomial hash (not cryptographic — just for deduplication display). We never store the raw email:

```typescript
const customer_key = email.split('')
  .reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffffffff, 0)
  .toString(16)
```

---

## The Next.js + Supabase Stack

The engine runs server-side in a Next.js App Router route handler. The important architectural decision: **run the engine in the API route, not in a Supabase Edge Function**. Edge Functions have a 2MB bundle limit and no native crypto, which makes the TypeScript engine awkward to deploy.

```typescript
// app/api/engine/route.ts
export async function POST(req: Request) {
  const supabase = createClient(/* server-side client */)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  
  const { transactions } = await req.json()
  const result = runEngine(transactions)  // pure TypeScript — no external deps
  
  // Persist result for dashboard
  await supabase.from('engine_results').upsert({
    user_id: user.id,
    result: JSON.stringify(result),
    created_at: new Date().toISOString(),
  })
  
  return Response.json(result)
}
```

The engine is a pure TypeScript module with zero external dependencies. No `ml-matrix`, no `tensorflow.js`, no `mathjs`. The Normal-InvGamma update, the Cornish-Fisher quantile approximation, and the Box-Muller sampler are all hand-implemented. This keeps the bundle small and deployment fast.

---

## What's Next

The current engine assumes a single elasticity parameter across all customer cohorts. The next version will implement a hierarchical model where cohort-specific elasticities are drawn from a shared population prior — useful for products sold across multiple channels (organic vs. paid vs. newsletter) where willingness to pay differs.

We're also planning to add temporal correlation: sales velocity changes with day-of-week and month-of-year patterns. Right now, we handle this coarsely by excluding spike cohorts. A proper seasonal model would recover more signal from small datasets.

---

**PricePilot is live and free to try:** https://startup-92-pricepilot-hbs-style-cus.vercel.app

The full engine source is visible at `src/lib/engine.ts` in the Next.js app. Questions about the Bayesian approach? Drop them in the comments.
