import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { createBillingPortalSession } from '@/lib/stripe'

/**
 * POST /api/billing/portal
 * Redirects to Stripe Customer Portal for subscription management.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const svc = createServiceClient()
    const { data: sub } = await svc
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account found. Please subscribe first.' }, { status: 404 })
    }

    const origin = request.headers.get('origin') ?? 'https://playtestflow.vercel.app'
    const portalSession = await createBillingPortalSession({
      customerId: sub.stripe_customer_id,
      returnUrl: `${origin}/dashboard/billing`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Portal creation failed'
    console.error('[portal]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
