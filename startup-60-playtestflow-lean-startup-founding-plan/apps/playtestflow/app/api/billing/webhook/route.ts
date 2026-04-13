import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase-server'
import { addCredits } from '@/lib/credits'
import { trackConversionEvent, getDaysSince } from '@/lib/instrumentation'
import Stripe from 'stripe'

// Stripe v5 moved period fields under `billing_cycle_anchor_config`.
// Cast to access the legacy fields that are still present at runtime.
type SubWithPeriod = Stripe.Subscription & {
  trial_start: number | null
  trial_end: number | null
  current_period_start: number
  current_period_end: number
}

/**
 * POST /api/billing/webhook
 * Stripe webhook handler — updates subscriptions table on billing events.
 * Must be registered in Stripe Dashboard → Webhooks with signing secret.
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature') ?? ''
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[webhook] Signature verification failed:', message)
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  const svc = createServiceClient()

  try {
    switch (event.type) {
      // ── Trial started ──────────────────────────────────────────────────────
      case 'customer.subscription.trial_will_end': {
        const sub = event.data.object as SubWithPeriod
        const userId = sub.metadata?.user_id
        if (!userId) break
        await svc.from('subscription_events').insert({
          user_id: userId,
          plan_id: sub.metadata?.plan_id ?? 'pro',
          event_type: 'trial_ending_soon',
          metadata: { days_remaining: 3 },
          stripe_event_id: event.id,
        })
        break
      }

      // ── Subscription created / updated ─────────────────────────────────────
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as SubWithPeriod
        const userId = sub.metadata?.user_id
        const planId = sub.metadata?.plan_id ?? 'pro'
        if (!userId) break

        const status = sub.status === 'trialing' ? 'trialing'
          : sub.status === 'active' ? 'active'
          : sub.status === 'past_due' ? 'past_due'
          : sub.status === 'canceled' ? 'canceled'
          : sub.status

        await svc.from('subscriptions').upsert({
          user_id: userId,
          plan_id: planId,
          stripe_customer_id: sub.customer as string,
          stripe_subscription_id: sub.id,
          stripe_price_id: sub.items.data[0]?.price?.id ?? null,
          status,
          trial_start: sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : null,
          trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

        // ── Instrumentation: trial_start + paid_conversion ─────────────────
        if (event.type === 'customer.subscription.created' && status === 'trialing') {
          await trackConversionEvent({
            userId, planId, stripeEvent: event.id, eventType: 'trial_start',
            metadata: { stripe_subscription_id: sub.id },
          })
        }

        if (event.type === 'customer.subscription.updated' && status === 'active') {
          const prevAttr = (event.data.previous_attributes as { status?: string } | undefined)
          if (prevAttr?.status === 'trialing') {
            // Trial → paid conversion
            const daysInTrial = await getDaysSince(userId, 'trial_start')
            const mrr = planId === 'studio' ? 7900 : 3900
            await Promise.all([
              svc.from('subscription_events').insert({
                user_id: userId, plan_id: planId, event_type: 'upgraded',
                from_plan: 'free', to_plan: planId,
                amount_cents: mrr, stripe_event_id: event.id,
              }),
              trackConversionEvent({
                userId, planId, stripeEvent: event.id,
                eventType: 'paid_conversion',
                amountCents: mrr,
                daysInTrial: daysInTrial ?? undefined,
                metadata: { stripe_subscription_id: sub.id },
              }),
            ])
          }
        }
        break
      }

      // ── Subscription deleted / canceled ────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as SubWithPeriod
        const userId = sub.metadata?.user_id
        const planId = sub.metadata?.plan_id ?? 'pro'
        if (!userId) break

        await svc.from('subscriptions').update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId)

        await Promise.all([
          svc.from('subscription_events').insert({
            user_id: userId, plan_id: 'free', event_type: 'churned',
            from_plan: planId, to_plan: 'free', stripe_event_id: event.id,
          }),
          trackConversionEvent({
            userId, planId, stripeEvent: event.id, eventType: 'downgrade',
            metadata: { reason: 'canceled', stripe_subscription_id: sub.id },
          }),
        ])
        break
      }

      // ── One-time checkout (credit top-up) ────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.metadata?.type === 'credit_topup') {
          const userId = session.metadata.user_id
          const credits = parseInt(session.metadata.credits ?? '0', 10)
          const packageId = session.metadata.package_id
          if (userId && credits > 0) {
            await addCredits({
              userId,
              amount: credits,
              type: 'topup_stripe',
              description: `Credit top-up — ${credits} credits (${packageId})`,
              referenceId: session.id,
              stripePaymentIntentId: session.payment_intent as string | undefined,
            })
          }
        }
        break
      }

      // ── Payment succeeded ──────────────────────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const { data: sub } = await svc
          .from('subscriptions')
          .select('user_id, plan_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (sub) {
          await svc.from('subscription_events').insert({
            user_id: sub.user_id,
            plan_id: sub.plan_id,
            event_type: 'payment_succeeded',
            amount_cents: invoice.amount_paid,
            stripe_event_id: event.id,
          })
        }
        break
      }

      // ── Payment failed ─────────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const { data: sub } = await svc
          .from('subscriptions')
          .select('user_id, plan_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (sub) {
          await svc.from('subscriptions').update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          }).eq('user_id', sub.user_id)

          await svc.from('subscription_events').insert({
            user_id: sub.user_id,
            plan_id: sub.plan_id,
            event_type: 'payment_failed',
            amount_cents: invoice.amount_due,
            stripe_event_id: event.id,
          })
        }
        break
      }

      default:
        // Unhandled events are fine — just acknowledge
        break
    }
  } catch (err) {
    console.error('[webhook] Handler error:', err)
    // Still return 200 so Stripe doesn't retry
  }

  return NextResponse.json({ received: true })
}
