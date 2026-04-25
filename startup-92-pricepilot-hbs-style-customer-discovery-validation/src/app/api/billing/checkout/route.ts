import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { stripe, PRO_PRICE_ID, APP_URL } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || APP_URL

  if (authErr || !user) {
    return NextResponse.redirect(`${baseUrl}/login?next=/pricing`, 303)
  }

  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
  if (profile?.plan === 'pro') {
    return NextResponse.redirect(`${baseUrl}/billing`, 303)
  }

  const priceId = process.env.STRIPE_PRICE_PRO_ID || process.env.STRIPE_PRICE_PRO || PRO_PRICE_ID

  if (!priceId) {
    return NextResponse.redirect(`${baseUrl}/pricing`, 303)
  }

  const successUrl = `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = `${baseUrl}/pricing`

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { user_id: user.id },
  })

  return NextResponse.redirect(session.url!, 303)
}
