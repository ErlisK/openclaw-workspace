/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events.
 *
 * Events handled:
 * - checkout.session.completed:
 *   - If metadata has credit_pack → add credits
 *   - If metadata has job_id → mark order paid + publish job
 * - charge.refunded → mark order refunded
 */
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { addCredits } from '@/lib/credits'
import { applyReferralCredits } from '@/lib/referrals'
import { createAdminClient } from '@/lib/supabase/server'
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
          metadata: {
            supabase_user_id?: string
            credit_pack?: string
            credit_amount?: string
            job_id?: string
            tier?: string
            amount_cents?: string
          } | null
          amount_total: number | null
        }

        const userId = session.metadata?.supabase_user_id
        const jobId = session.metadata?.job_id
        const creditAmount = parseInt(session.metadata?.credit_amount ?? '0', 10)

        if (!userId) {
          console.error('Webhook: missing supabase_user_id in metadata', session.metadata)
          break
        }

        const admin = createAdminClient()

        // Idempotency: check if we've already processed this event
        const { data: existing } = await admin
          .from('stripe_events')
          .select('stripe_event_id')
          .eq('stripe_event_id', event.id)
          .maybeSingle()

        if (existing) {
          console.log('Webhook: already processed event', event.id)
          break
        }

        // Record event for idempotency
        await admin.from('stripe_events').insert({
          stripe_event_id: event.id,
          event_type: event.type,
          payload: session,
        })

        if (jobId) {
          // Job purchase: mark order paid + publish job
          const amountCents = (parseInt(session.metadata?.amount_cents ?? '0', 10)) || (session.amount_total ?? 0)

          await admin
            .from('orders')
            .update({
              status: 'paid',
              stripe_payment_intent_id: session.payment_intent,
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_checkout_session_id', session.id)

          await admin
            .from('test_jobs')
            .update({
              status: 'published',
              published_at: new Date().toISOString(),
              payment_status: 'paid',
              stripe_payment_intent_id: session.payment_intent,
              updated_at: new Date().toISOString(),
            })
            .eq('id', jobId)
            .eq('client_id', userId)

          console.log(`Webhook: job ${jobId} published, order paid ($${amountCents / 100})`)
          captureServerEvent('job_published_paid', userId, {
            job_id: jobId,
            amount_cents: amountCents,
            stripe_session_id: session.id,
          }).catch(() => {})
        } else if (creditAmount > 0) {
          // Credit pack purchase
          const pack = session.metadata?.credit_pack ?? 'unknown'
          const result = await addCredits(userId, creditAmount, {
            checkoutId: session.id,
            paymentIntent: session.payment_intent ?? undefined,
            description: `Purchased ${creditAmount} credits (${pack} pack, $${(session.amount_total ?? 0) / 100})`,
          })

          if (!result.ok) {
            console.error('Webhook: addCredits failed', result.error)
            return NextResponse.json({ error: result.error }, { status: 500 })
          }

          console.log(`Webhook: added ${creditAmount} credits to user ${userId}`)
          // Apply referral bonus on first purchase (idempotent)
          applyReferralCredits(userId).then(r => {
            if (r.applied) console.log(`Webhook: referral credits applied for ${userId} (+${r.refereeGranted} each side)`)
          }).catch(() => {})
          captureServerEvent('purchase_credits', userId, {
            credits_purchased: creditAmount,
            pack,
            amount_cents: session.amount_total ?? 0,
            stripe_session_id: session.id,
          }).catch(() => {})
        }

        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as {
          payment_intent: string | null
        }

        if (charge.payment_intent) {
          const admin = createAdminClient()
          await admin
            .from('orders')
            .update({ status: 'refunded', updated_at: new Date().toISOString() })
            .eq('stripe_payment_intent_id', charge.payment_intent)
        }
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
