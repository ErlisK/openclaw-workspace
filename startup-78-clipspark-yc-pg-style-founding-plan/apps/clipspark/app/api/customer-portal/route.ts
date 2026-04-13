import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin

    // Look up stripe_customer_id from users table
    const { data: userRow } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    const customerId = userRow?.stripe_customer_id

    if (!customerId) {
      // No subscription yet — redirect to pricing
      return NextResponse.redirect(new URL('/pricing', req.url))
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/settings`,
    })

    return NextResponse.redirect(session.url)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[PORTAL]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
