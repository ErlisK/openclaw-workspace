import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { stripe, APP_URL } from '@/lib/stripe'

async function handlePortal(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || APP_URL

  if (authErr || !user) {
    return NextResponse.redirect(`${baseUrl}/login?next=/billing`, 303)
  }

  // Try entitlements table first, then profiles
  const { data: entitlement } = await supabase
    .from('entitlements')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  let customerId = entitlement?.stripe_customer_id

  if (!customerId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()
    customerId = profile?.stripe_customer_id
  }

  if (!customerId) {
    // Create a Stripe customer if missing
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
    await supabase.from('profiles').upsert({ id: user.id, stripe_customer_id: customerId })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/billing`,
  })

  return NextResponse.redirect(session.url, 303)
}

export const GET = handlePortal
export const POST = handlePortal
