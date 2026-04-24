import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { stripe, APP_URL } from '@/lib/stripe'

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: entitlement } = await supabase
    .from('entitlements')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  if (!entitlement?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: entitlement.stripe_customer_id,
    return_url: `${APP_URL}/dashboard`,
  })

  return NextResponse.json({ url: session.url })
}
