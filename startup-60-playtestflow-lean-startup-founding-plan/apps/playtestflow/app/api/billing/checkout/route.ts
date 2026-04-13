import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { createCheckoutSession } from '@/lib/stripe'

/**
 * POST /api/billing/checkout
 * Body: { planId: 'pro' | 'studio' }
 * Returns: { url: string } — Stripe Checkout redirect URL
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { planId } = await request.json().catch(() => ({}))
    if (!planId || !['pro', 'studio'].includes(planId)) {
      return NextResponse.json({ error: 'Invalid planId' }, { status: 400 })
    }

    const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://playtestflow.vercel.app'

    // Check for existing Stripe customer
    const svc = createServiceClient()
    const { data: sub } = await svc
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    const session = await createCheckoutSession({
      userId: user.id,
      userEmail: user.email!,
      planId: planId as 'pro' | 'studio',
      successUrl: `${origin}/dashboard/billing?success=1&plan=${planId}`,
      cancelUrl: `${origin}/pricing?canceled=1`,
      trialDays: 14,
    })

    // Log trial start event (non-throwing)
    try {
      await svc.from('subscription_events').insert({
        user_id: user.id,
        plan_id: planId,
        event_type: 'checkout_initiated',
        to_plan: planId,
        metadata: { checkout_session_id: session.id },
      })
    } catch {}

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Checkout failed'
    console.error('[checkout]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
