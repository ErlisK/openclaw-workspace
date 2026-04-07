import Stripe from 'stripe'

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-04-30.basil',
    typescript: true,
  })
}

/** Lazily initialized Stripe client. Throws at call time if key missing. */
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

// ── Plan config ────────────────────────────────────────────────────────────
export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    priceCents: 0,
    priceMonthly: 0,
    maxProjects: 1,
    maxSessionsMo: 2,
    teamSeats: 1,
    stripePriceId: null as string | null,
    stripePriceIdAnnual: null as string | null,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceCents: 3900,
    priceMonthly: 39,
    maxProjects: 5,
    maxSessionsMo: 20,
    teamSeats: 2,
    stripePriceId: process.env.STRIPE_PRICE_PRO_MONTHLY ?? 'price_pro_monthly_placeholder',
    stripePriceIdAnnual: process.env.STRIPE_PRICE_PRO_ANNUAL ?? null,
  },
  studio: {
    id: 'studio',
    name: 'Studio',
    priceCents: 9900,
    priceMonthly: 99,
    maxProjects: null,
    maxSessionsMo: null,
    teamSeats: 10,
    stripePriceId: process.env.STRIPE_PRICE_STUDIO_MONTHLY ?? 'price_studio_monthly_placeholder',
    stripePriceIdAnnual: process.env.STRIPE_PRICE_STUDIO_ANNUAL ?? null,
  },
} as const

export type PlanId = keyof typeof PLANS

export function getPlan(planId: string): typeof PLANS[PlanId] {
  return PLANS[planId as PlanId] ?? PLANS.free
}

// ── Checkout helpers ───────────────────────────────────────────────────────

export async function createCheckoutSession({
  userId,
  userEmail,
  planId,
  successUrl,
  cancelUrl,
  trialDays = 14,
}: {
  userId: string
  userEmail: string
  planId: 'pro' | 'studio'
  successUrl: string
  cancelUrl: string
  trialDays?: number
}) {
  const plan = PLANS[planId]

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: userEmail,
    line_items: [
      {
        price: plan.stripePriceId!,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: trialDays,
      metadata: {
        user_id: userId,
        plan_id: planId,
      },
    },
    metadata: {
      user_id: userId,
      plan_id: planId,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
  })

  return session
}

export async function createBillingPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string
  returnUrl: string
}) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}
