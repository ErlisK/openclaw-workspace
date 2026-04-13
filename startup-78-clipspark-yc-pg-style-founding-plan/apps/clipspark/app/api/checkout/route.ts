import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

// Plan + credit pack price IDs
export const PRICE_IDS = {
  PRO_MONTHLY:  'price_1TKNRLGt92XrRvUu0pYVJ95F',
  PRO_YEARLY:   'price_1TKNRLGt92XrRvUuLrZWUXEQ',
  CREDITS_10:   'price_1TKNRMGt92XrRvUuNl0IOJbR',
  CREDITS_50:   'price_1TKNRMGt92XrRvUubXQJOHeK',
}

const SUBSCRIPTION_PRICES = new Set([PRICE_IDS.PRO_MONTHLY, PRICE_IDS.PRO_YEARLY])

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { priceId, successUrl, cancelUrl } = await req.json()

    if (!priceId) {
      return NextResponse.json({ error: 'priceId is required' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
    const isSubscription = SUBSCRIPTION_PRICES.has(priceId)

    // Get or create Stripe customer
    const { data: userRow } = await supabase
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single()

    let customerId = userRow?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || userRow?.email || undefined,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? 'subscription' : 'payment',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${appUrl}/checkout/cancel`,
      allow_promotion_codes: true,
      metadata: { user_id: user.id },
      subscription_data: isSubscription ? {
        metadata: { user_id: user.id },
      } : undefined,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[CHECKOUT]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
