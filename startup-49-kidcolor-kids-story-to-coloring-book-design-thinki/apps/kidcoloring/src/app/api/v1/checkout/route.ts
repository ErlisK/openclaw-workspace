import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe, isStripeConfigured, isTestMode, PRODUCTS, buildLineItems, buildTaxOptions, PriceId } from '@/lib/stripe'
import { getPricingConfig, buildPriceData } from '@/lib/pricing-experiments'


/**
 * POST /api/v1/checkout
 *
 * Creates a Stripe Checkout Session for KidColoring premium purchase.
 *
 * Body: {
 *   priceId:   'per_book_699' | 'per_book_999' | 'per_book_1299' | 'subscription'
 *   sessionId: KidColoring trial session UUID
 *   email?:    Pre-fill parent email
 * }
 *
 * Returns: { url: string }  → redirect to Stripe Checkout
 *          { fakeDoor: true } → Stripe not configured (graceful degradation)
 *
 * PARENT VERIFICATION:
 *   - email field captures parent email for receipt
 *   - Stripe Checkout collects billing address for tax purposes
 *   - metadata carries kidcoloring_session_id for webhook attribution
 *
 * TAX SETTINGS:
 *   - Automatic tax enabled when STRIPE_TAX_RATE_ID is set
 *   - Billing address always collected for tax compliance
 *   - Digital goods — no shipping required
 */

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  let body: {
    priceId?:   string
    sessionId?: string
    sessionToken?: string
    email?:     string
    userId?:    string
  }

  try {
    body = await req.json() as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { priceId: _reqPriceId, sessionId, email, userId, sessionToken } = body

  // Use pricing experiment variant if sessionToken provided and no explicit priceId
  const expConfig  = sessionToken ? getPricingConfig(sessionToken) : null
  const priceId    = _reqPriceId ?? expConfig?.priceId ?? 'per_book_999'
  const _expVariant = expConfig?.variant ?? null
  const product = PRODUCTS[priceId as PriceId]

  if (!product) {
    return NextResponse.json({ error: `Unknown priceId: ${priceId}` }, { status: 400 })
  }

  // ── Graceful degradation when Stripe not configured ──────────────────────
  if (!isStripeConfigured()) {
    // Log fake-door click to DB for tracking
    const sb = admin()
    void sb.from('orders').insert({
      price_id:    priceId,
      metadata:    { fake_door: true, pricing_variant: _expVariant, pricing_experiment: 'pricing_v1' },
      amount_cents: product.amountCents,
      currency:    'usd',
      status:      'pending',
      receipt_email: email ?? null,
      metadata:    { fake_door: true, session_id: sessionId, no_stripe_key: true },
    })

    void sb.from('events').insert({
      event_name: 'checkout_fake_door',
      session_id: sessionId ?? null,
      properties: { price_id: priceId, email: email ?? null },
    })

    return NextResponse.json({
      url:      null,
      fakeDoor: true,
      message:  "You're on the early access list! We'll email you when payment goes live.",
    })
  }

  const origin = req.headers.get('origin')
    ?? process.env.NEXT_PUBLIC_APP_URL
    ?? 'https://kidcoloring-research.vercel.app'

  const successUrl = [
    `${origin}/checkout/success`,
    `?sessionId=${sessionId ?? ''}`,
    `&priceId=${priceId}`,
    `&stripe_session_id={CHECKOUT_SESSION_ID}`,
  ].join('')

  const cancelUrl = sessionId
    ? `${origin}/create/preview/${sessionId}?checkout=cancelled`
    : `${origin}/?checkout=cancelled`

  try {
    const stripe = getStripe()

    // Look up or create Stripe customer for this email (for subscriptions)
    let stripeCustomerId: string | undefined
    if (email) {
      const existing = await stripe.customers.list({ email, limit: 1 })
      if (existing.data.length > 0) {
        stripeCustomerId = existing.data[0].id
      }
    }

    const taxOptions = buildTaxOptions()
    // Use experiment price if assigned; fall back to standard product price
    const lineItems = (expConfig && _expVariant && _expVariant !== 'control')
      ? [{ price_data: buildPriceData(expConfig), quantity: 1 }]
      : buildLineItems(product)

    const params: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode:          product.mode,
      line_items:    lineItems,
      success_url:   successUrl,
      cancel_url:    cancelUrl,
      customer:      stripeCustomerId,
      customer_email: stripeCustomerId ? undefined : email,
      billing_address_collection: 'auto',  // collect for tax compliance
      phone_number_collection:    { enabled: false },
      metadata: {
        kidcoloring_session_id: sessionId ?? '',
        pricing_variant:        _expVariant ?? 'unknown',
        pricing_experiment:     'pricing_v1',
        price_id:               priceId,
        user_id:                userId ?? '',
        test_mode:              isTestMode() ? 'true' : 'false',
      },
      payment_intent_data: product.mode === 'payment' ? {
        description:     `KidColoring — ${product.name}`,
        receipt_email:   email ?? undefined,
        metadata:        { kidcoloring_session_id: sessionId ?? '', price_id: priceId },
      } : undefined,
      allow_promotion_codes: true,
      ...taxOptions,
    }

    // Subscription-specific settings
    if (product.mode === 'subscription' && params) {
      params.subscription_data = {
        metadata:    { kidcoloring_session_id: sessionId ?? '', user_id: userId ?? '' },
        trial_period_days: 7,  // 7-day free trial for subscriptions
        description: 'KidColoring Monthly Subscription',
      }
    }

    const checkoutSession = await stripe.checkout.sessions.create(params)

    // Pre-create order row (status=pending, will update via webhook)
    const sb = admin()
    await sb.from('orders').insert({
      stripe_session_id: checkoutSession.id,
      user_id:           userId ?? null,
      session_id:        sessionId ?? null,
      price_id:          priceId,
      amount_cents:      product.amountCents,
      currency:          'usd',
      status:            'pending',
      receipt_email:     email ?? null,
      metadata:          { test_mode: isTestMode(), stripe_mode: product.mode },
    })

    await sb.from('events').insert({
      event_name: 'checkout_started',
      session_id: sessionId ?? null,
      properties: { price_id: priceId, stripe_session_id: checkoutSession.id, test_mode: isTestMode() },
    })

    return NextResponse.json({ url: checkoutSession.url, testMode: isTestMode() })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[checkout] Stripe error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * GET /api/v1/checkout?sessionId=xxx
 * Retrieve checkout session status (for success page polling)
 */
export async function GET(req: NextRequest) {
  const stripeSessionId = req.nextUrl.searchParams.get('stripeSessionId')
  if (!stripeSessionId) {
    return NextResponse.json({ error: 'stripeSessionId required' }, { status: 400 })
  }

  // Look up in our orders table first
  const sb = admin()
  const { data: order } = await sb
    .from('orders')
    .select('id, status, paid_at, receipt_sent, price_id, amount_cents')
    .eq('stripe_session_id', stripeSessionId)
    .single()

  if (order) {
    return NextResponse.json({ order })
  }

  // Fallback: query Stripe directly
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  try {
    const stripe  = getStripe()
    const session = await stripe.checkout.sessions.retrieve(stripeSessionId)
    return NextResponse.json({
      status:         session.payment_status,
      customerEmail:  session.customer_email,
      amountTotal:    session.amount_total,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
