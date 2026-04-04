/**
 * src/lib/stripe.ts
 *
 * Stripe client singleton + product/price configuration for KidColoring.
 *
 * PRICING TIERS:
 *   per_book_699   → $6.99 one-time per book (4 pages, budget)
 *   per_book_999   → $9.99 one-time per book (4 pages, standard) ← default
 *   per_book_1299  → $12.99 one-time per book (8 pages, premium)
 *   subscription   → $7.99/month unlimited books
 *
 * ENVIRONMENT VARIABLES REQUIRED:
 *   STRIPE_SECRET_KEY          sk_test_... (test) / sk_live_... (live)
 *   STRIPE_PUBLISHABLE_KEY     pk_test_... / pk_live_...
 *   STRIPE_WEBHOOK_SECRET      whsec_... (from Stripe Dashboard → Webhooks)
 *   STRIPE_PRICE_PER_BOOK_699  price_... (optional — uses dynamic if missing)
 *   STRIPE_PRICE_PER_BOOK_999  price_...
 *   STRIPE_PRICE_PER_BOOK_1299 price_...
 *   STRIPE_PRICE_SUBSCRIPTION  price_...
 *   STRIPE_TAX_RATE_ID         txr_... (from Stripe Tax → Tax rates)
 *
 * SETUP GUIDE (test mode):
 *   1. Create account at https://dashboard.stripe.com
 *   2. Switch to Test mode (top-right toggle)
 *   3. Developers → API keys → Reveal test key
 *   4. Copy sk_test_... → STRIPE_SECRET_KEY
 *   5. Copy pk_test_... → STRIPE_PUBLISHABLE_KEY
 *   6. Webhooks → Add endpoint → https://kidcoloring-research.vercel.app/api/v1/checkout/webhook
 *      Events: checkout.session.completed, payment_intent.payment_failed, customer.subscription.*
 *   7. Copy whsec_... → STRIPE_WEBHOOK_SECRET
 *   8. Create products in Stripe Dashboard → Products (or use dynamic prices below)
 *
 * TEST CARDS (Stripe test mode):
 *   Success:   4242 4242 4242 4242 | any future date | any CVC
 *   Declined:  4000 0000 0000 0002
 *   3D Secure: 4000 0027 6000 3184
 *   Int'l:     4000 0025 6000 0001
 */

import Stripe from 'stripe'

// ── Singleton ─────────────────────────────────────────────────────────────────
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
    _stripe = new Stripe(key, { apiVersion: '2025-05-28.basil', typescript: true })
  }
  return _stripe
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

export function isTestMode(): boolean {
  const key = process.env.STRIPE_SECRET_KEY ?? ''
  return key.startsWith('sk_test_')
}

// ── Product catalog ──────────────────────────────────────────────────────────
export type PriceId = 'per_book_699' | 'per_book_999' | 'per_book_1299' | 'subscription'

export interface ProductConfig {
  priceId:     PriceId
  name:        string
  description: string
  amountCents: number
  currency:    'usd'
  mode:        'payment' | 'subscription'
  pages:       number
  badge?:      string
  envPriceKey: string  // STRIPE_PRICE_... env var name
}

export const PRODUCTS: Record<PriceId, ProductConfig> = {
  per_book_699: {
    priceId:     'per_book_699',
    name:        'KidColoring Book — $6.99',
    description: 'Personalized 4-page coloring book PDF, ready to print',
    amountCents: 699,
    currency:    'usd',
    mode:        'payment',
    pages:       4,
    envPriceKey: 'STRIPE_PRICE_PER_BOOK_699',
  },
  per_book_999: {
    priceId:     'per_book_999',
    name:        'KidColoring Book — $9.99',
    description: 'Personalized 4-page coloring book PDF, ready to print',
    amountCents: 999,
    currency:    'usd',
    mode:        'payment',
    pages:       4,
    badge:       'Most popular',
    envPriceKey: 'STRIPE_PRICE_PER_BOOK_999',
  },
  per_book_1299: {
    priceId:     'per_book_1299',
    name:        'KidColoring Book — $12.99 (8 pages)',
    description: 'Personalized 8-page coloring book PDF, high-res print quality',
    amountCents: 1299,
    currency:    'usd',
    mode:        'payment',
    pages:       8,
    envPriceKey: 'STRIPE_PRICE_PER_BOOK_1299',
  },
  subscription: {
    priceId:     'subscription',
    name:        'KidColoring Monthly — $7.99/month',
    description: 'Unlimited personalized coloring books, new themes monthly',
    amountCents: 799,
    currency:    'usd',
    mode:        'subscription',
    pages:       -1,  // unlimited
    badge:       'Best value',
    envPriceKey: 'STRIPE_PRICE_SUBSCRIPTION',
  },
}

// ── Build line items ─────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildLineItems(product: ProductConfig): any {
  const stripePriceId = process.env[product.envPriceKey]

  if (stripePriceId) {
    // Use pre-created Stripe price (production)
    return [{ price: stripePriceId, quantity: 1 }]
  }

  // Dynamic price creation (test mode convenience)
  if (product.mode === 'payment') {
    return [{
      price_data: {
        currency:     product.currency,
        product_data: {
          name:        product.name,
          description: product.description,
          images:      ['https://kidcoloring-research.vercel.app/og-image.png'],
          metadata:    { price_id: product.priceId },
        },
        unit_amount: product.amountCents,
      },
      quantity: 1,
    }]
  }

  // Subscription
  return [{
    price_data: {
      currency:     product.currency,
      product_data: {
        name:        product.name,
        description: product.description,
      },
      unit_amount:  product.amountCents,
      recurring:    { interval: 'month' },
    },
    quantity: 1,
  }]
}

// ── Tax configuration ────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildTaxOptions(): Record<string, any> {
  const taxRateId = process.env.STRIPE_TAX_RATE_ID

  if (taxRateId) {
    // Use explicit tax rate (e.g., US sales tax 8.5%)
    return {
      // Stripe Checkout can auto-collect tax with Stripe Tax
      automatic_tax: { enabled: true },
    }
  }

  // Stripe Tax automatic (requires Tax registration in Dashboard)
  // Return empty — no tax unless STRIPE_TAX_RATE_ID is set
  return {}
}
