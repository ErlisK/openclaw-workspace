/**
 * POST /api/billing/checkout
 * Creates a Stripe Checkout Session for a specific test job (tier-based pricing).
 * On success, webhook marks the order paid and publishes the job.
 * Body: { job_id, success_url?, cancel_url? }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { createAdminClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

// Per-tier Stripe price IDs (set via env vars or created inline for MVP)
const TIER_PRICES: Record<string, { amount: number; label: string; duration: string }> = {
  quick:    { amount: 500,  label: 'Smoke Test (~10 min)',    duration: '10 min' },
  standard: { amount: 1000, label: 'Flow Test (~20 min)',     duration: '20 min' },
  deep:     { amount: 1500, label: 'Deep Test (~30 min)',     duration: '30 min' },
}

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { job_id, success_url, cancel_url } = body as {
    job_id: string
    success_url?: string
    cancel_url?: string
  }

  if (!job_id) return NextResponse.json({ error: 'job_id is required' }, { status: 400 })

  const admin = createAdminClient()

  // Fetch the job (must be owned by this user and in draft status)
  const { data: job } = await admin
    .from('test_jobs')
    .select('id, title, tier, price_cents, status, client_id')
    .eq('id', job_id)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.client_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!['draft', 'published'].includes(job.status)) {
    return NextResponse.json({ error: `Job cannot be paid in status: ${job.status}` }, { status: 409 })
  }

  const tierConfig = TIER_PRICES[job.tier] ?? TIER_PRICES.quick
  const amountCents = job.price_cents ?? tierConfig.amount

  // Get or create Stripe customer
  const { data: profile } = await admin
    .from('users')
    .select('stripe_customer_id, email')
    .eq('id', user.id)
    .single()

  let stripeCustomerId = profile?.stripe_customer_id
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? profile?.email,
      metadata: { supabase_user_id: user.id },
    })
    stripeCustomerId = customer.id
    await admin.from('users').update({ stripe_customer_id: customer.id }).eq('id', user.id)
  }

  const origin = req.headers.get('origin') ?? req.nextUrl.origin

  try {
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: {
            name: `${tierConfig.label} — ${job.title}`,
            description: `AgentQA test job: ${tierConfig.duration} human testing session`,
          },
        },
      }],
      success_url: success_url ?? `${origin}/jobs/${job_id}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url ?? `${origin}/jobs/${job_id}?payment=cancelled`,
      metadata: {
        supabase_user_id: user.id,
        job_id: job_id,
        tier: job.tier,
        amount_cents: String(amountCents),
      },
      payment_intent_data: {
        metadata: {
          supabase_user_id: user.id,
          job_id: job_id,
        },
      },
    })

    // Create a pending order record
    await admin.from('orders').insert({
      requester_id: user.id,
      test_job_id: job_id,
      stripe_checkout_session_id: session.id,
      amount_cents: amountCents,
      status: 'pending',
    }).select()

    return NextResponse.json({ url: session.url, session_id: session.id }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Billing checkout error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
