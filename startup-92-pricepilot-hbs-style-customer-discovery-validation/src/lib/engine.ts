/**
 * PricingSim Bayesian Elasticity Engine v0
 * Model: log(Q/Q_ref) = ε·log(P/P_ref) + noise
 * Prior: ε ~ Normal(-1.0, 0.5²), σ² ~ InvGamma(3, 0.5)
 * Conservative rule: maximize E[R] s.t. p05(R) >= R_ref * 0.95
 */

export interface Transaction {
  price: number        // USD
  quantity: number     // units in period
  period_days: number  // observation window length
  cohort_tag?: string  // 'organic' | 'appsumo' | etc
  is_spike?: boolean
}

export interface RevenueDistribution {
  p05: number; p25: number; p50: number; p75: number; p95: number
  mean: number
  prob_above_current: number
}

export interface EngineResult {
  action: 'test_higher' | 'stable' | 'insufficient_data'
  price_ref: number
  price_proposed: number | null
  revenue_ref_monthly: number
  revenue_dist: RevenueDistribution | null
  elasticity_mean: number | null
  elasticity_sd: number | null
  n_observations: number
  spike_fraction: number
  confidence_label: string
  why_text: string
  caveats: string[]
  conservative_rules_applied: string[]
}

// ── Normal-InvGamma conjugate posterior ─────────────────────────────────────

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
  const lam0 = 1 / (priorSd * priorSd)
  const N = x.length
  let Sxx = 0, Sxy = 0, Syy = 0
  for (let i = 0; i < N; i++) {
    Sxx += x[i] * x[i]
    Sxy += x[i] * y[i]
    Syy += y[i] * y[i]
  }
  const lamPost = lam0 + Sxx
  const muPost  = (priorMu * lam0 + Sxy) / lamPost
  const aPost   = priorA + N / 2
  const bPost   = priorB + 0.5 * Syy + 0.5 * priorMu * priorMu * lam0
               - 0.5 * muPost * muPost * lamPost
  return { mu: muPost, lam: lamPost, a: aPost, b: bPost }
}

// Student-t quantile via Cornish-Fisher approximation (good for df > 3)
function tQuantile(p: number, df: number): number {
  const z = normalQuantile(p)
  return z + (z*z*z + z) / (4*df) + (5*z*z*z*z*z + 16*z*z*z + 3*z) / (96*df*df)
}

function normalQuantile(p: number): number {
  // Beasley-Springer-Moro approximation
  const a = [2.50662823884, -18.61500062529, 41.39119773534, -25.44106049637]
  const b = [-8.47351093090, 23.08336743743, -21.06224101826, 3.13082909833]
  const c = [0.3374754822726147, 0.9761690190917186, 0.1607979714918209,
             0.0276438810333863, 0.0038405729373609, 0.0003951896511349,
             0.0000321767881768, 0.0000002888167364, 0.0000003960315187]
  const y = p - 0.5
  if (Math.abs(y) < 0.42) {
    const r = y * y
    return y * (((a[3]*r + a[2])*r + a[1])*r + a[0]) /
              ((((b[3]*r + b[2])*r + b[1])*r + b[0])*r + 1)
  }
  let r = y < 0 ? p : 1 - p
  r = Math.log(-Math.log(r))
  let x = c[0]
  for (let i = 1; i < 9; i++) x += c[i] * Math.pow(r, i)
  return y < 0 ? -x : x
}

// Sample from Student-t via normal + chi-squared (Box-Muller + gamma)
function sampleStudentT(df: number, mu: number, scale: number, n: number): number[] {
  const samples: number[] = []
  for (let i = 0; i < n; i++) {
    // Normal via Box-Muller
    const u1 = Math.random(), u2 = Math.random()
    const z = Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2)
    // Chi-squared with df degrees of freedom (sum of df standard normals squared)
    let chi2 = 0
    for (let j = 0; j < Math.min(df, 30); j++) {
      const u3 = Math.random(), u4 = Math.random()
      const n2 = Math.sqrt(-2 * Math.log(u3 + 1e-10)) * Math.cos(2 * Math.PI * u4)
      chi2 += n2 * n2
    }
    chi2 = chi2 || df  // fallback
    samples.push(mu + scale * z / Math.sqrt(chi2 / df))
  }
  return samples
}

// ── Revenue prediction ───────────────────────────────────────────────────────

function predictRevenue(
  pNew: number, pRef: number, rRef: number,
  elasticitySamples: number[]
): RevenueDistribution {
  const ratio = pNew / pRef
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

// ── Conservative recommendation rule ────────────────────────────────────────

function findOptimalPrice(
  pRef: number, rRef: number, eMonthly: number,
  samples: number[]
): { price: number; dist: RevenueDistribution; rules: string[] } | null {
  const rules: string[] = []
  let maxMult = 2.5
  const eMean = samples.reduce((a, b) => a + b, 0) / samples.length

  if (eMonthly < 200) { maxMult = Math.min(maxMult, 1.5); rules.push('low_mrr_1.5x_cap') }
  if (eMean < -2.5) { maxMult = Math.min(maxMult, 1.3); rules.push('high_elasticity_1.3x_cap') }

  const floor = rRef * 0.95
  let bestPrice = 0, bestMean = -Infinity, bestDist: RevenueDistribution | null = null

  for (let mult = 1.1; mult <= maxMult; mult += 0.05) {
    const p = Math.round(pRef * mult * 100) / 100
    const dist = predictRevenue(p, pRef, rRef, samples)
    if (dist.p05 < floor) continue
    if (dist.mean > bestMean) {
      bestMean = dist.mean; bestPrice = p; bestDist = dist
    }
  }

  if (!bestDist) return null
  if (bestPrice > pRef * 2.5) rules.push(`hard_cap_at_2.5x`)
  return { price: bestPrice, dist: bestDist, rules }
}

// ── Spike detection ──────────────────────────────────────────────────────────

function flagSpikes(txns: Transaction[]): Transaction[] {
  const qtyPerDay = txns.map(t => t.quantity / t.period_days)
  const sorted = [...qtyPerDay].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const mad = sorted.map(v => Math.abs(v - median)).sort((a, b) => a - b)[Math.floor(sorted.length / 2)]
  return txns.map((t, i) => ({
    ...t,
    is_spike: mad > 0 ? (0.6745 * Math.abs(qtyPerDay[i] - median) / mad) > 3.0 : false,
  }))
}

// ── Main engine entry point ──────────────────────────────────────────────────

export function runEngine(transactions: Transaction[]): EngineResult {
  // Filter to organic cohorts only (exclude promo)
  const excludeTags = ['appsumo', 'promo_code', 'product_hunt']
  const filtered = transactions.filter(t => !excludeTags.includes(t.cohort_tag || ''))

  // Spike detection
  const withSpikes = flagSpikes(filtered)
  const clean = withSpikes.filter(t => !t.is_spike)
  const spikeFraction = 1 - clean.length / Math.max(1, withSpikes.length)
  const N = clean.length

  if (N < 5) return {
    action: 'insufficient_data', price_ref: 0, price_proposed: null,
    revenue_ref_monthly: 0, revenue_dist: null,
    elasticity_mean: null, elasticity_sd: null,
    n_observations: N, spike_fraction: spikeFraction,
    confidence_label: 'Insufficient data',
    why_text: `Only ${N} clean price observations (need ≥5). Import more sales history.`,
    caveats: [`${N} observations is below the minimum of 5`],
    conservative_rules_applied: [],
  }

  // Reference = most recent price period
  const sorted = [...clean].sort((a, b) => b.price - a.price)
  const pRef = sorted[0].price
  const qRef = sorted[0].quantity / sorted[0].period_days

  // Build regression arrays
  const x = clean.map(t => Math.log(t.price / pRef))
  const y = clean.map(t => Math.log((t.quantity / t.period_days) / qRef))

  // Posterior (tighter prior for very small N)
  const priorSd = N < 10 ? 0.3 : 0.5
  const post = nigUpdate(x, y, -1.0, priorSd)

  // Sample from marginal Student-t posterior
  const df = 2 * post.a
  const scale = Math.sqrt(post.b / (post.a * post.lam))
  const samples = sampleStudentT(df, post.mu, scale, 5000)

  const eMean = samples.reduce((a, b) => a + b, 0) / samples.length
  const eVariance = samples.reduce((a, b) => a + (b - eMean) ** 2, 0) / samples.length
  const eSd = Math.sqrt(eVariance)

  // Estimate monthly revenue
  const avgPriceRatio = pRef  // we use current/ref price
  const estConversionRate = 0.04  // ~4% Gumroad baseline
  const estMonthlyRevenue = pRef * estConversionRate * 500  // assumes ~500 visitors/mo
  // Better: sum recent period revenue
  const recentRevenue = clean.reduce((sum, t) => sum + t.price * t.quantity, 0)
  const totalDays = clean.reduce((sum, t) => sum + t.period_days, 0)
  const rRef = (recentRevenue / totalDays) * 30

  // Find optimal price
  const result = findOptimalPrice(pRef, rRef, rRef, samples)

  if (!result) {
    return {
      action: 'stable', price_ref: pRef, price_proposed: null,
      revenue_ref_monthly: rRef, revenue_dist: null,
      elasticity_mean: eMean, elasticity_sd: eSd,
      n_observations: N, spike_fraction: spikeFraction,
      confidence_label: 'Market appears price-sensitive',
      why_text: `With elasticity ≈${eMean.toFixed(1)}, raising prices risks more revenue loss than gain. Experiment cautiously or collect more data.`,
      caveats: spikeFraction > 0.3 ? [`${Math.round(spikeFraction*100)}% of sales detected as spike/promo cohort`] : [],
      conservative_rules_applied: [],
    }
  }

  const minLift = 0.08
  if (result.dist.mean < rRef * (1 + minLift)) {
    return {
      action: 'stable', price_ref: pRef, price_proposed: result.price,
      revenue_ref_monthly: rRef, revenue_dist: result.dist,
      elasticity_mean: eMean, elasticity_sd: eSd,
      n_observations: N, spike_fraction: spikeFraction,
      confidence_label: `Low expected lift — below experiment threshold`,
      why_text: `Expected lift is only ${Math.round((result.dist.mean/rRef - 1)*100)}% (${Math.round(result.dist.prob_above_current * 100)}% probability of any gain) — below the 8% threshold needed to justify an experiment. Current pricing appears close to optimal; collect more data before testing a change.`,
      caveats: [],
      conservative_rules_applied: result.rules,
    }
  }

  const caveats: string[] = []
  if (spikeFraction > 0.3) caveats.push(`${Math.round(spikeFraction*100)}% spike cohort excluded`)
  if (N < 20) caveats.push(`Low data: only ${N} observations — treat as directional`)

  return {
    action: 'test_higher',
    price_ref: pRef,
    price_proposed: result.price,
    revenue_ref_monthly: rRef,
    revenue_dist: result.dist,
    elasticity_mean: eMean,
    elasticity_sd: eSd,
    n_observations: N,
    spike_fraction: spikeFraction,
    confidence_label: `${Math.round(result.dist.prob_above_current * 100)}% likely to increase revenue`,
    why_text: buildWhyText(pRef, result.price, rRef, result.dist, eMean, N),
    caveats,
    conservative_rules_applied: result.rules,
  }
}

function buildWhyText(
  pRef: number, pNew: number, rRef: number,
  dist: RevenueDistribution, eMean: number, N: number
): string {
  const liftPct = Math.round((dist.p50 / rRef - 1) * 100)
  const liftDollars = Math.round((dist.p50 - rRef))
  const mult = (pNew / pRef).toFixed(1)
  return `At $${pNew} (${mult}× your current $${pRef}), we project +${liftPct}% revenue (+$${liftDollars}/mo at median). Elasticity estimate: ${eMean.toFixed(1)} (based on ${N} observations). In the conservative 5th-percentile scenario, you'd lose at most 5% of current revenue.`
}

// ── CSV parsing ──────────────────────────────────────────────────────────────

export interface ParsedTransaction {
  product_name: string
  price: number
  purchased_at: Date
  is_refunded: boolean
  customer_key: string
}

export function parseGumroadCSV(csvText: string): { rows: ParsedTransaction[]; errors: string[] } {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return { rows: [], errors: ['CSV must have at least one data row'] }

  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
  const errors: string[] = []
  const rows: ParsedTransaction[] = []

  // Try to find required columns
  const colDate = header.findIndex(h => h.includes('date') || h.includes('time'))
  const colPrice = header.findIndex(h => h.includes('price') || h.includes('amount'))
  const colProduct = header.findIndex(h => h.includes('product') || h.includes('title') || h.includes('name'))
  const colRefunded = header.findIndex(h => h.includes('refund'))
  const colEmail = header.findIndex(h => h.includes('email') || h.includes('buyer'))

  if (colDate < 0) errors.push('Missing required column: date')
  if (colPrice < 0) errors.push('Missing required column: price')
  if (colProduct < 0) errors.push('Missing required column: product_title')
  if (errors.length > 0) return { rows: [], errors }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))

    const rawPrice = cols[colPrice]?.replace(/[$,]/g, '') || '0'
    const price = parseFloat(rawPrice)
    if (isNaN(price) || price <= 0) continue

    const rawDate = cols[colDate] || ''
    const purchased_at = new Date(rawDate)
    if (isNaN(purchased_at.getTime())) continue

    const email = colEmail >= 0 ? cols[colEmail] : `row_${i}`
    // Simple hash for customer_key (not cryptographic, just for dedup display)
    const customer_key = email.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffffffff, 0).toString(16)

    rows.push({
      product_name: colProduct >= 0 ? cols[colProduct] : 'Unknown',
      price,
      purchased_at,
      is_refunded: colRefunded >= 0 && (cols[colRefunded] || '').toLowerCase().includes('yes'),
      customer_key,
    })
  }

  return { rows, errors }
}
