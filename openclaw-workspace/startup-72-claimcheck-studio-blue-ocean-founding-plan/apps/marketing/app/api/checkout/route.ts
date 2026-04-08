import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const { stripe } = await import('@/lib/stripe')
  const { APP_URL } = await import('@/lib/config')
  const { priceId, email } = await request.json()
  if (!priceId) return NextResponse.json({ error: 'priceId required' }, { status: 400 })

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: email || undefined,
    success_url: `${APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/pricing`,
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: 14,
    },
  })

  return NextResponse.json({ url: session.url })
}
