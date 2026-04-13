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

  const body = await req.json().catch(() => ({}))
  const {
    project_id,
    quote_id,
    homeowner_email,
    amount,          // optional override (cents); defaults to 9900
    price_tier = 99, // 99 or 149
  } = body as {
    project_id?: string
    quote_id?: string
    homeowner_email?: string
    amount?: number
    price_tier?: 99 | 149
  }

  if (!homeowner_email) {
    return NextResponse.json({ error: 'homeowner_email is required' }, { status: 400 })
  }

  // Select price ID
  const priceId = price_tier === 149
    ? process.env.STRIPE_PRICE_149
    : process.env.STRIPE_PRICE_99

  if (!priceId) {
    return NextResponse.json({ error: `STRIPE_PRICE_${price_tier} not configured` }, { status: 500 })
  }

  const amountCents = amount ?? (price_tier === 149 ? 14900 : 9900)

  // Build success URL
  const successParams = new URLSearchParams()
  successParams.set('email', homeowner_email)
  successParams.set('deposit', '1')
  if (project_id) successParams.set('project_id', project_id)

  const successUrl = project_id
    ? `${APP_URL}/project/${project_id}?${successParams}`
    : `${APP_URL}/success?${successParams}`

  try {
    // Create Stripe Checkout Session
    // payment_intent_data.capture_method = 'manual' → authorizes but doesn't capture
    // until we confirm the packet is delivered; enables easy refund for dissatisfied homeowners
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: homeowner_email,
      success_url: successUrl + '&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: project_id
        ? `${APP_URL}/project/${project_id}?canceled=1`
        : `${APP_URL}/?canceled=1`,
      payment_intent_data: {
        capture_method: 'manual',   // authorize now, capture when packet delivered
        metadata: {
          project_id: project_id ?? '',
          quote_id: quote_id ?? '',
          homeowner_email,
          product_type: 'adu_deposit',
          metro: 'Austin',
        },
        description: `ExpediteHub ADU Permit Deposit — ${homeowner_email}`,
      },
      metadata: {
        project_id: project_id ?? '',
        quote_id: quote_id ?? '',
        homeowner_email,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      phone_number_collection: { enabled: true },
      custom_text: {
        submit: {
          message: '100% refundable if no match is made within 5 business days.',
        },
      },
    })

    // Create pending deposit record in Supabase immediately
    await db.from('deposits').upsert({
      project_id: project_id ?? null,
      quote_id: quote_id ?? null,
      homeowner_email,
      stripe_session_id: session.id,
      amount_cents: amountCents,
      currency: 'usd',
      status: 'pending',
      price_id: priceId,
      product_type: 'adu_deposit',
      metro: 'Austin',
    }, { onConflict: 'stripe_session_id' })

    return NextResponse.json({ url: session.url, session_id: session.id })
  } catch (err: unknown) {
    console.error('[checkout] Stripe error:', err)
    const msg = err instanceof Error ? err.message : 'Stripe error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// GET /api/checkout?session_id=cs_xxx — retrieve session status (called from success page)
export async function GET(req: NextRequest) {
  const sessionId = new URL(req.url).searchParams.get('session_id')
  if (!sessionId) return NextResponse.json({ error: 'session_id required' }, { status: 400 })

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'customer'],
    })
    return NextResponse.json({
      status: session.status,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      customer_email: session.customer_email,
      metadata: session.metadata,
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
