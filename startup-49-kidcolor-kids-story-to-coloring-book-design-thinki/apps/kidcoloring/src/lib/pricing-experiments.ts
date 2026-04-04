/**
 * src/lib/pricing-experiments.ts
 *
 * Server-side pricing experiment assignment + price config.
 *
 * Experiment: pricing_v1  (4 variants, 25% each)
 * ─────────────────────────────────────────────────
 *  control  │ $6.99 / 8 pages  │ baseline
 *  low      │ $4.99 / 8 pages  │ low-friction first purchase
 *  premium  │ $9.99 / 12 pages │ more value = higher price
 *  anchor   │ $6.99 / 8 pages  │ shown vs "$12.99 was" anchor
 *
 * Assignment: djb2(sessionToken) % 100 → deterministic per session
 * No DB call needed for assignment — only writes on first exposure.
 *
 * Hypothesis:
 *   low:     +40% conversion rate vs control (lower barrier)
 *   premium: +30% revenue per activated user (value signal: more pages)
 *   anchor:  +20% conversion rate vs control (cognitive anchoring)
 *
 * Guardrails:
 *   - Churn rate (subscription cancel within 7d) must stay < 15%
 *   - Refund rate must stay < 5%
 */

export type PricingVariant = 'control' | 'low' | 'premium' | 'anchor'

export interface PricingConfig {
  variant:       PricingVariant
  priceCents:    number          // charge amount
  displayPrice:  string          // "$6.99"
  pageCount:     number          // pages included
  priceId:       string          // Stripe price ID key
  badge:         string | null   // "🎉 Launch price" etc.
  headline:      string          // paywall headline
  description:   string          // what they get
  anchorPrice:   string | null   // strikethrough "was $12.99"
  urgencyLine:   string | null   // "Limited launch price"
  experiment:    'pricing_v1'
}

const VARIANTS: Record<PricingVariant, Omit<PricingConfig, 'variant' | 'experiment'>> = {
  control: {
    priceCents:   699,
    displayPrice: '$6.99',
    pageCount:    8,
    priceId:      'per_book_699',
    badge:        null,
    headline:     'Get the full coloring book',
    description:  '8 personalised pages · PDF download · Print at home',
    anchorPrice:  null,
    urgencyLine:  null,
  },
  low: {
    priceCents:   499,
    displayPrice: '$4.99',
    pageCount:    8,
    priceId:      'per_book_499',
    badge:        '🎉 Launch price',
    headline:     'Download the full book for just $4.99',
    description:  '8 personalised pages · PDF download · Print at home',
    anchorPrice:  null,
    urgencyLine:  'Special price for early families — limited time',
  },
  premium: {
    priceCents:   999,
    displayPrice: '$9.99',
    pageCount:    12,
    priceId:      'per_book_999',
    badge:        '⭐ Best value',
    headline:     'Get 12 pages — the full adventure',
    description:  '12 personalised pages · PDF download · Print at home · More to color!',
    anchorPrice:  null,
    urgencyLine:  null,
  },
  anchor: {
    priceCents:   699,
    displayPrice: '$6.99',
    pageCount:    8,
    priceId:      'per_book_699',
    badge:        '50% off today',
    headline:     'Today only: download for $6.99',
    description:  '8 personalised pages · PDF download · Print at home',
    anchorPrice:  '$12.99',
    urgencyLine:  'Regular price returns tomorrow',
  },
}

/** djb2 hash — same algorithm used in experiments.ts for deterministic assignment */
function djb2(str: string): number {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i)
    h = h >>> 0  // keep unsigned 32-bit
  }
  return h
}

/**
 * Deterministically assign a pricing variant from a session token.
 * Same token always returns the same variant.
 */
export function assignPricingVariant(sessionToken: string): PricingVariant {
  const bucket = djb2(sessionToken + 'pricing_v1') % 100
  if (bucket < 25) return 'control'
  if (bucket < 50) return 'low'
  if (bucket < 75) return 'premium'
  return 'anchor'
}

/** Get the full pricing config for a session */
export function getPricingConfig(sessionToken: string): PricingConfig {
  const variant = assignPricingVariant(sessionToken)
  return { variant, experiment: 'pricing_v1', ...VARIANTS[variant] }
}

/** Get pricing config for a specific variant (for admin testing) */
export function getPricingConfigForVariant(variant: PricingVariant): PricingConfig {
  return { variant, experiment: 'pricing_v1', ...VARIANTS[variant] }
}

/** All variants for display / analysis */
export const ALL_VARIANTS: PricingVariant[] = ['control', 'low', 'premium', 'anchor']

/** For use in Stripe checkout — resolve the actual price_data */
export function buildPriceData(config: PricingConfig) {
  return {
    currency:     'usd',
    unit_amount:  config.priceCents,
    product_data: {
      name:        `KidColoring — ${config.pageCount}-page personalised book`,
      description: config.description,
      metadata: {
        variant:    config.variant,
        experiment: config.experiment,
        pageCount:  String(config.pageCount),
      },
    },
  }
}
