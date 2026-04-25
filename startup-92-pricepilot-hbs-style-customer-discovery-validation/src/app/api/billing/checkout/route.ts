import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { stripe, PRO_PRICE_ID, APP_URL } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
  if (profile?.plan === 'pro') return NextResponse.json({ error: 'Already Pro' }, { status: 400 })

  const priceId = process.env.STRIPE_PRICE_PRO || PRO_PRICE_ID
  const baseUrl = APP_URL
  const successUrl = process.env.STRIPE_SUCCESS_URL || `${baseUrl}/billing?success=1`
  const cancelUrl = process.env.STRIPE_CANCEL_URL || `${baseUrl}/billing?canceled=1`

  if (!priceId) {
    return NextResponse.json({ url: '/pricing' })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { user_id: user.id },
  })

  return NextResponse.json({ url: session.url })
}
