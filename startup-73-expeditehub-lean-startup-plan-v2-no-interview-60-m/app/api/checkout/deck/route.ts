import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSupabaseAdmin } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripe = new (Stripe as any)(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
}) as Stripe

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://startup-73-expeditehub-lean-startup.vercel.app'

export async function POST(req: NextRequest) {
  const db = getSupabaseAdmin()
  const { email, address, price_tier = 79 } = await req.json() as {
    email: string
    address?: string
    price_tier?: 79 | 99
  }

  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const priceId = price_tier === 99
    ? process.env.STRIPE_PRICE_DECK_99
    : process.env.STRIPE_PRICE_DECK_79

  if (!priceId) return NextResponse.json({ error: 'Deck price not configured' }, { status: 500 })

  const amountCents = price_tier === 99 ? 9900 : 7900
  const successParams = new URLSearchParams({ email, deposit: '1', product_type: 'deck' })

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: email,
    success_url: `${APP_URL}/success/deck?${successParams}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/lp/deck-permit-austin?canceled=1`,
    payment_intent_data: {
      capture_method: 'manual',
      metadata: {
        homeowner_email: email,
        address: address ?? '',
        product_type: 'deck_deposit',
        metro: 'Austin',
      },
      description: `ExpediteHub Deck Permit Deposit — ${email}`,
    },
    metadata: { homeowner_email: email, address: address ?? '', product_type: 'deck_deposit' },
    allow_promotion_codes: true,
    custom_text: {
      submit: { message: '100% refundable if no contractor match within 7 business days.' },
    },
  })

  // Create pending deposit record
  await db.from('deposits').upsert({
    homeowner_email: email,
    stripe_session_id: session.id,
    amount_cents: amountCents,
    currency: 'usd',
    status: 'pending',
    price_id: priceId,
    product_type: 'deck_deposit',
    metro: 'Austin',
  }, { onConflict: 'stripe_session_id' })

  return NextResponse.json({ url: session.url, session_id: session.id })
}
