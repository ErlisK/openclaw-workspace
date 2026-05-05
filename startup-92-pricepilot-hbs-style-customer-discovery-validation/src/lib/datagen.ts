/**
 * PricingSim Synthetic Data Generator v2
 * Generates realistic transaction histories with variety:
 *   - Launch + decay pattern (spike on release, gradual drop)
 *   - Seasonal pattern (Q4 boost, summer dip)
 *   - Steady growth pattern
 *   - AppSumo-style spike cohort
 *   - Coupon-cohort discounts
 *   - Multi-channel split (organic/paid/affiliate)
 *   - Bundle pricing (two products, cross-sell)
 */

export interface CohortConfig {
  channel?: string
  coupon?: string
  coupon_discount_pct?: number  // e.g. 0.3 = 30% off
}

export type DemandPattern =
  | 'steady'       // flat with noise
  | 'growth'       // gradual increase month-over-month
  | 'launch_decay' // spike at start, exponential decay to steady state
  | 'seasonal'     // Q4 peak (Nov/Dec 2×), summer trough (Jul/Aug 0.7×)
  | 'appsumo'      // one large spike cohort mid-history (marked is_spike_cohort=true)
  | 'volatile'     // high variance, price-sensitive

export interface DataGenConfig {
  product_name: string
  base_price: number       // USD
  monthly_sales: number    // units/mo at base_price at steady state
  elasticity: number       // true price elasticity (e.g. -1.0)
  n_months: number         // history length (3-24)
  price_changes: number    // spontaneous price change events (0-4)
  noise_sd: number         // multiplicative noise SD (0.0-0.5)
  pattern: DemandPattern
  cohorts: CohortConfig
  // Multi-channel split (must sum to ≤1; remainder = 'organic')
  channel_split?: Record<string, number>
}

export interface SyntheticTransaction {
  platform: string
  platform_txn_id: string
  amount_cents: number
  currency: string
  is_refunded: boolean
  customer_key: string
  purchased_at: string
  is_spike_cohort: boolean
  metadata: Record<string, string>
}

export interface GenerationResult {
  product_name: string
  n_transactions: number
  n_months: number
  price_schedule: Array<{ price: number; starts_month: number }>
  cohorts: CohortConfig
  pattern: DemandPattern
  transactions: SyntheticTransaction[]
}

// ── PRNG (seeded for reproducibility) ────────────────────────────────────
export function makeRng(seed: number) {
  let s = seed >>> 0
  return function rand(): number {
    s = Math.imul(s, 1664525) + 1013904223
    return (s >>> 0) / 0x100000000
  }
}

function normalRand(rand: () => number): number {
  const u1 = Math.max(rand(), 1e-10)
  const u2 = rand()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

// ── Demand multiplier per pattern ────────────────────────────────────────
function demandMultiplier(pattern: DemandPattern, monthIdx: number, totalMonths: number, rand: () => number): number {
  const normalised = monthIdx / Math.max(totalMonths - 1, 1)

  switch (pattern) {
    case 'steady':
      return 1.0

    case 'growth':
      // Linear growth from 0.6× to 1.4× over history
      return 0.6 + 0.8 * normalised

    case 'launch_decay': {
      // Spike 3× at launch, decay to 1× with half-life ~3 months
      const decayHalfLife = 3
      const decayFactor = Math.pow(0.5, monthIdx / decayHalfLife)
      return 1 + 2 * decayFactor
    }

    case 'seasonal': {
      // Calendar month matters more than position — assume month 0 = Jan
      const calMonth = (monthIdx % 12) + 1
      if (calMonth === 11 || calMonth === 12) return 1.9  // Black Friday / holiday
      if (calMonth === 1) return 0.75    // January slump
      if (calMonth === 7 || calMonth === 8) return 0.7   // Summer
      if (calMonth >= 9 && calMonth <= 10) return 1.2    // Fall ramp
      return 1.0
    }

    case 'appsumo':
      // Large spike at month ~30% of history, back to normal otherwise
      return 1.0

    case 'volatile':
      // High-variance; multiplier drawn from log-normal each month
      return Math.exp(normalRand(rand) * 0.4)

    default:
      return 1.0
  }
}

// ── Main generator ────────────────────────────────────────────────────────
export function generateTransactions(cfg: DataGenConfig, seed?: number): GenerationResult {
  const rand = makeRng(seed ?? (Date.now() % 1e9))

  const nMonths = Math.min(Math.max(cfg.n_months, 3), 24)
  const priceChanges = Math.min(Math.max(cfg.price_changes, 0), 4)
  const noiseSd = Math.min(Math.max(cfg.noise_sd, 0), 0.5)

  // ── Build price schedule ────────────────────────────────────────────
  const prices: number[] = [cfg.base_price]
  const priceStartMonths: number[] = [0]
  const changeMonths: Set<number> = new Set()

  if (priceChanges > 0) {
    const spacing = Math.floor(nMonths / (priceChanges + 1))
    for (let i = 0; i < priceChanges; i++) {
      const month = (i + 1) * spacing
      changeMonths.add(month)
      priceStartMonths.push(month)
      const prevPrice = prices[prices.length - 1]
      // Realistic price changes: mostly increases (+10-50%), occasional decreases (-10-20%)
      const isIncrease = rand() > 0.3
      const factor = isIncrease
        ? 1.1 + rand() * 0.4
        : 0.8 + rand() * 0.1
      prices.push(Math.round(prevPrice * factor * 100) / 100)
    }
  }

  // ── AppSumo spike config ─────────────────────────────────────────────
  const appsumoMonth = Math.floor(nMonths * 0.3)
  const appsumoSpikeMultiplier = 8 + rand() * 4  // 8-12× spike

  // ── Generate transactions ─────────────────────────────────────────────
  const transactions: SyntheticTransaction[] = []
  const now = new Date()
  let currentPriceIdx = 0

  for (let month = 0; month < nMonths; month++) {
    if (changeMonths.has(month)) currentPriceIdx++
    const baseMonthPrice = prices[Math.min(currentPriceIdx, prices.length - 1)]

    // Demand multipliers
    let mult = demandMultiplier(cfg.pattern, month, nMonths, rand)
    if (cfg.pattern === 'appsumo' && month === appsumoMonth) {
      mult = appsumoSpikeMultiplier
    }

    // Price × elasticity effect
    const priceRatio = baseMonthPrice / cfg.base_price
    const elasticityEffect = Math.pow(Math.max(priceRatio, 0.1), cfg.elasticity)

    // Log-normal noise
    const noiseFactor = noiseSd > 0 ? Math.exp(normalRand(rand) * noiseSd) : 1
    const expectedQty = Math.max(1, Math.round(cfg.monthly_sales * mult * elasticityEffect * noiseFactor))

    // Calendar date for this month
    const monthDate = new Date(now)
    monthDate.setMonth(monthDate.getMonth() - (nMonths - 1 - month))

    for (let t = 0; t < expectedQty; t++) {
      // Distribute transactions through the month with realistic clustering
      // (more sales on weekends, less mid-week — simplified to day 1-28)
      const day = 1 + Math.floor(rand() * 28)
      const hour = Math.floor(rand() * 24)
      const txDate = new Date(monthDate)
      txDate.setDate(day)
      txDate.setHours(hour, Math.floor(rand() * 60), 0, 0)

      // Determine channel
      let channel = 'organic'
      if (cfg.channel_split) {
        const roll = rand()
        let cumulative = 0
        for (const [ch, fraction] of Object.entries(cfg.channel_split)) {
          cumulative += fraction
          if (roll < cumulative) { channel = ch; break }
        }
      }
      if (cfg.pattern === 'appsumo' && month === appsumoMonth) channel = 'appsumo'

      // Apply coupon discount if applicable
      const isSpikeCohort = cfg.pattern === 'appsumo' && month === appsumoMonth
      let finalPrice = baseMonthPrice
      const hasCoupon = cfg.cohorts.coupon && rand() < 0.25  // 25% of buyers use coupon
      if (hasCoupon && cfg.cohorts.coupon_discount_pct) {
        finalPrice = baseMonthPrice * (1 - cfg.cohorts.coupon_discount_pct)
      }
      // AppSumo deals are typically at a steep discount
      if (isSpikeCohort) {
        finalPrice = baseMonthPrice * (0.4 + rand() * 0.2)  // 40-60% of list price
      }

      const metadata: Record<string, string> = { channel }
      if (hasCoupon && cfg.cohorts.coupon) metadata.coupon = cfg.cohorts.coupon
      if (cfg.cohorts.coupon && !hasCoupon) metadata.coupon = 'none'

      transactions.push({
        platform: 'synthetic',
        platform_txn_id: `syn-${month}-${t}-${Math.floor(rand() * 0xFFFFFF).toString(16)}`,
        amount_cents: Math.round(Math.max(finalPrice, 0.5) * 100),
        currency: 'usd',
        is_refunded: rand() < 0.025,
        customer_key: `cust-${Math.floor(rand() * 50000).toString(16)}`,
        purchased_at: txDate.toISOString(),
        is_spike_cohort: isSpikeCohort,
        metadata,
      })
    }
  }

  return {
    product_name: cfg.product_name,
    n_transactions: transactions.length,
    n_months: nMonths,
    price_schedule: prices.map((p, i) => ({ price: p, starts_month: priceStartMonths[i] ?? 0 })),
    cohorts: cfg.cohorts,
    pattern: cfg.pattern,
    transactions,
  }
}

// ── Pre-built demo scenarios ──────────────────────────────────────────────
export const DEMO_SCENARIOS: Record<string, DataGenConfig> = {
  indie_template_pack: {
    product_name: 'Notion Template Pack',
    base_price: 29,
    monthly_sales: 45,
    elasticity: -1.2,
    n_months: 12,
    price_changes: 2,
    noise_sd: 0.15,
    pattern: 'growth',
    cohorts: { channel: 'organic', coupon: 'LAUNCH20', coupon_discount_pct: 0.2 },
    channel_split: { organic: 0.6, twitter: 0.25, newsletter: 0.15 },
  },

  micro_saas_starter: {
    product_name: 'MicroSaaS Starter Kit',
    base_price: 49,
    monthly_sales: 30,
    elasticity: -0.8,
    n_months: 18,
    price_changes: 3,
    noise_sd: 0.12,
    pattern: 'steady',
    cohorts: { channel: 'organic' },
    channel_split: { organic: 0.5, reddit: 0.2, hacker_news: 0.2, affiliate: 0.1 },
  },

  appsumo_deal: {
    product_name: 'DataExport Pro',
    base_price: 97,
    monthly_sales: 15,
    elasticity: -1.5,
    n_months: 12,
    price_changes: 1,
    noise_sd: 0.2,
    pattern: 'appsumo',
    cohorts: { channel: 'appsumo' },
    channel_split: { organic: 0.7, appsumo: 0.3 },
  },

  ebook_launch_decay: {
    product_name: 'Pricing Psychology Ebook',
    base_price: 19,
    monthly_sales: 80,
    elasticity: -1.8,
    n_months: 9,
    price_changes: 1,
    noise_sd: 0.18,
    pattern: 'launch_decay',
    cohorts: { channel: 'organic', coupon: 'EARLYBIRD', coupon_discount_pct: 0.3 },
    channel_split: { organic: 0.45, twitter: 0.3, newsletter: 0.25 },
  },

  saas_seasonal: {
    product_name: 'Year Planner Tool',
    base_price: 12,
    monthly_sales: 120,
    elasticity: -0.6,
    n_months: 24,
    price_changes: 2,
    noise_sd: 0.1,
    pattern: 'seasonal',
    cohorts: { channel: 'organic', coupon: 'BLACKFRIDAY', coupon_discount_pct: 0.4 },
    channel_split: { organic: 0.7, paid: 0.2, affiliate: 0.1 },
  },

  volatile_consulting: {
    product_name: 'Strategy Session (1hr)',
    base_price: 299,
    monthly_sales: 6,
    elasticity: -0.5,
    n_months: 12,
    price_changes: 2,
    noise_sd: 0.35,
    pattern: 'volatile',
    cohorts: { channel: 'organic' },
  },
}
