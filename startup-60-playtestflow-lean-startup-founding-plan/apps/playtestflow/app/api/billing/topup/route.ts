import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { stripe } from '@/lib/stripe'

/**
 * POST /api/billing/topup
 * Create a Stripe Checkout session for a credit top-up purchase.
 * Body: { packageId: 'pack_5' | 'pack_20' | 'pack_50' | 'pack_100' }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { packageId } = await request.json().catch(() => ({}))
    if (!packageId) return NextResponse.json({ error: 'packageId required' }, { status: 400 })

    const svc = createServiceClient()
    const { data: pkg } = await svc
      .from('credit_topup_packages')
      .select('id, credits, price_cents, stripe_price_id, label')
      .eq('id', packageId)
      .single()

    if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    if (!pkg.stripe_price_id || pkg.stripe_price_id.endsWith('_placeholder')) {
      return NextResponse.json({ error: 'Stripe not configured. Contact support.' }, { status: 503 })
    }

    const origin = request.headers.get('origin') ?? 'https://playtestflow.vercel.app'

    // Get or use existing Stripe customer
    const { data: sub } = await svc
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: 'payment',
      line_items: [{ price: pkg.stripe_price_id, quantity: 1 }],
      metadata: {
        user_id: user.id,
        package_id: packageId,
        credits: pkg.credits.toString(),
        type: 'credit_topup',
      },
      success_url: `${origin}/dashboard/billing?topup=success&credits=${pkg.credits}`,
      cancel_url: `${origin}/dashboard/billing?topup=canceled`,
    }

    if (sub?.stripe_customer_id) {
      sessionParams.customer = sub.stripe_customer_id
    } else {
      sessionParams.customer_email = user.email!
    }

    const session = await stripe.checkout.sessions.create(sessionParams)
    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Top-up failed'
    console.error('[topup]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
