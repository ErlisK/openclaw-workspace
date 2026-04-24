import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { stripe, PRO_PRICE_ID, APP_URL } from '@/lib/stripe'

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get or create Stripe customer
  const { data: entitlement } = await supabase
    .from('entitlements')
    .select('stripe_customer_id, plan')
    .eq('user_id', user.id)
    .single()

  let customerId = entitlement?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id

    await supabase.from('entitlements').upsert({
      user_id: user.id,
      stripe_customer_id: customerId,
      plan: entitlement?.plan || 'free',
    }, { onConflict: 'user_id' })
  }

  // Don't let existing Pro users double-subscribe
  if (entitlement?.plan === 'pro') {
    return NextResponse.json({ error: 'Already subscribed to Pro' }, { status: 409 })
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
    success_url: `${APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/billing/cancel`,
    metadata: { user_id: user.id },
    subscription_data: {
      metadata: { user_id: user.id },
    },
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: session.url, session_id: session.id })
}
