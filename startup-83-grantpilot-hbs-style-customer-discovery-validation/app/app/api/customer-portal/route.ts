import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient, createAdminClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin

    // Get stripe_customer_id from entitlements
    const admin = createAdminClient()
    const { data: ent } = await admin
      .from('entitlements')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    let customerId = ent?.stripe_customer_id

    // If no customer yet, create one in Stripe
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      })
      customerId = customer.id
      await admin.from('entitlements')
        .upsert({ user_id: user.id, stripe_customer_id: customerId, tier: 'free', pack_credits: 0, status: 'active' }, { onConflict: 'user_id' })
    }

    const { returnUrl } = await req.json().catch(() => ({}))

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || `${appUrl}/settings/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[PORTAL]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
