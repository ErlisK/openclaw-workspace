import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { priceId, mode, tier } = await req.json()
    if (!priceId) return NextResponse.json({ error: 'priceId is required' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
    const checkoutMode = mode === 'subscription' ? 'subscription' : 'payment'

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: checkoutMode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`,
      allow_promotion_codes: true,
      metadata: {
        tier: tier || '',
        user_id: user?.id || '',
        user_email: user?.email || '',
      },
    }

    if (user?.email) {
      sessionParams.customer_email = user.email
    }

    const session = await stripe.checkout.sessions.create(sessionParams)
    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[CHECKOUT]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
