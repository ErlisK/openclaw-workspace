/**
 * POST /api/checkout
 * Creates a Stripe Checkout session for credit pack purchase.
 * Body: { pack: 'starter' | 'growth' | 'scale', success_url?, cancel_url? }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { createAdminClient } from '@/lib/supabase/server'
import { stripe, CREDIT_PACKS } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { pack, success_url, cancel_url } = body as {
    pack: string
    success_url?: string
    cancel_url?: string
  }

  const creditPack = CREDIT_PACKS.find(p => p.id === pack)
  if (!creditPack) {
    return NextResponse.json({ error: `Unknown pack: ${pack}. Use starter, growth, or scale.` }, { status: 400 })
  }
  if (!creditPack.price_id) {
    return NextResponse.json({ error: 'Pack price not configured' }, { status: 500 })
  }

  const admin = createAdminClient()

  // Get or create Stripe customer
  let stripeCustomerId: string | null = null
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (profile?.stripe_customer_id) {
    stripeCustomerId = profile.stripe_customer_id
  } else {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    })
    stripeCustomerId = customer.id
    await admin
      .from('profiles')
      .update({ stripe_customer_id: customer.id })
      .eq('id', user.id)
  }

  const origin = req.headers.get('origin') ?? req.nextUrl.origin
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId ?? undefined,
    mode: 'payment',
    line_items: [{ price: creditPack.price_id, quantity: 1 }],
    success_url: success_url ?? `${origin}/credits?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancel_url ?? `${origin}/credits?cancelled=1`,
    metadata: {
      supabase_user_id: user.id,
      credit_pack: pack,
      credit_amount: String(creditPack.credits),
    },
    payment_intent_data: {
      metadata: {
        supabase_user_id: user.id,
        credit_pack: pack,
        credit_amount: String(creditPack.credits),
      },
    },
  })

  return NextResponse.json({
    url: session.url,
    session_id: session.id,
  }, { status: 201 })
}
