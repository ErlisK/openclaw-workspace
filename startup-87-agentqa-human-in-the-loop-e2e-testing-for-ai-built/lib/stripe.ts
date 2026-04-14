import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {})

export interface CreditPack {
  id: 'starter' | 'growth' | 'scale'
  name: string
  credits: number
  price_cents: number
  price_id: string
  description: string
  badge?: string
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 10,
    price_cents: 1500,
    price_id: process.env.STRIPE_PRICE_STARTER ?? '',
    description: 'Good for 2 Quick tests or 1 Standard test',
  },
  {
    id: 'growth',
    name: 'Growth',
    credits: 40,
    price_cents: 5000,
    price_id: process.env.STRIPE_PRICE_GROWTH ?? '',
    description: 'Good for 8 Quick tests or 4 Deep tests',
    badge: 'Popular',
  },
  {
    id: 'scale',
    name: 'Scale',
    credits: 130,
    price_cents: 15000,
    price_id: process.env.STRIPE_PRICE_SCALE ?? '',
    description: 'Good for 26 Quick tests — best value (13% bonus)',
    badge: 'Best value',
  },
]

/** Cost in credits per tier */
export const TIER_CREDITS: Record<string, number> = {
  quick:    5,
  standard: 10,
  deep:     15,
}
