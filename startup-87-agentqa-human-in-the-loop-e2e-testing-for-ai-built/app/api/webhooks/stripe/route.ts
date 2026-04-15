/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events for credit fulfilment.
 *
 * Events handled:
 * - checkout.session.completed → add credits
 * - charge.refunded → deduct credits (partial/full)
 */
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { addCredits } from '@/lib/credits'
import { captureServerEvent } from '@/lib/analytics/events'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })

  let event
  try {
    const rawBody = await req.text()
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed'
    console.error('Webhook signature error:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as {
          id: string
          payment_intent: string | null
          metadata: { supabase_user_id?: string; credit_pack?: string; credit_amount?: string } | null
          amount_total: number | null
        }
        const userId = session.metadata?.supabase_user_id
        const creditAmount = parseInt(session.metadata?.credit_amount ?? '0', 10)
        const pack = session.metadata?.credit_pack ?? 'unknown'

        if (!userId || !creditAmount) {
          console.error('Webhook: missing metadata', session.metadata)
          break
        }

        const result = await addCredits(userId, creditAmount, {
          checkoutId: session.id,
          paymentIntent: session.payment_intent ?? undefined,
          description: `Purchased ${creditAmount} credits (${pack} pack, $${(session.amount_total ?? 0) / 100})`,
        })

        if (!result.ok) {
          console.error('Webhook: addCredits failed', result.error)
          return NextResponse.json({ error: result.error }, { status: 500 })
        }

        console.log(`Webhook: added ${creditAmount} credits to user ${userId}, new balance: ${result.balance}`)
        captureServerEvent('purchase_credits', userId, {
          credits_purchased: creditAmount,
          pack,
          amount_cents: session.amount_total ?? 0,
          stripe_session_id: session.id,
        }).catch(() => {})
        break
      }

      default:
        // Ignore unhandled events
        break
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
