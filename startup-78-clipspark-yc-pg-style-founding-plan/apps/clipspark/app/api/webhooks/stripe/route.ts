import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/service'
import { trackServer } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

// Plan caps by Stripe price metadata
const PLAN_CONFIG: Record<string, { plan: string; clips_per_month: number; minutes_per_month: number; minutes_per_clip: number }> = {
  'price_1TKNRLGt92XrRvUu0pYVJ95F': { plan: 'pro',   clips_per_month: 10, minutes_per_month: 600, minutes_per_clip: 120 },
  'price_1TKNRLGt92XrRvUuLrZWUXEQ': { plan: 'pro',   clips_per_month: 10, minutes_per_month: 600, minutes_per_clip: 120 },
}

const CREDIT_CONFIG: Record<string, number> = {
  'price_1TKNRMGt92XrRvUuNl0IOJbR': 10,
  'price_1TKNRMGt92XrRvUubXQJOHeK': 50,
  'price_1TKPvwGt92XrRvUu2uyIpY7A': 25,
  'price_1TKMUrGt92XrRvUuPyPTDMbV': 10,  // legacy
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[WEBHOOK] STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Signature verification failed'
    console.error('[WEBHOOK] Sig verify failed:', msg)
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const supabase = createServiceClient()

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        const customerId = session.customer as string

        if (!userId) {
          console.error('[WEBHOOK] checkout.session.completed: no user_id in metadata', session.id)
          break
        }

        // Save stripe_customer_id on users
        if (customerId) {
          await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', userId)
        }

        if (session.mode === 'subscription') {
          // Subscription already handled by customer.subscription.created below
          console.log(`[WEBHOOK] Subscription checkout done: user=${userId}`)
          trackServer(userId, 'checkout_completed', {
            mode: 'subscription',
            amount: session.amount_total,
            currency: session.currency,
            customer_id: customerId,
          })
        } else if (session.mode === 'payment') {
          // One-time credit pack purchase
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { expand: ['data.price'] })
          let totalCredits = 0
          for (const item of lineItems.data) {
            const priceId = item.price?.id || ''
            const credits = CREDIT_CONFIG[priceId] || 0
            totalCredits += credits * (item.quantity || 1)
          }
          if (totalCredits > 0) {
            await addCredits(supabase, userId, totalCredits)
            console.log(`[WEBHOOK] Credits added: user=${userId} credits=+${totalCredits}`)
            trackServer(userId, 'credits_purchased', {
              credits: totalCredits,
              amount: session.amount_total,
              currency: session.currency,
            })
          }
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string

        // Look up user by stripe_customer_id
        const { data: userRow } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!userRow) {
          // May not have been saved yet — wait for next event
          console.warn('[WEBHOOK] No user found for customer:', customerId)
          break
        }

        const userId = userRow.id
        const priceId = sub.items.data[0]?.price.id || ''
        const cfg = PLAN_CONFIG[priceId] || { plan: 'free', clips_per_month: 5, minutes_per_month: 300, minutes_per_clip: 60 }

        // Upsert subscription record
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_subscription_id: sub.id,
          stripe_customer_id: customerId,
          stripe_price_id: priceId,
          plan: cfg.plan,
          status: sub.status,
          current_period_start: new Date((sub as any).current_period_start * 1000).toISOString(),
          current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          clips_per_month: cfg.clips_per_month,
          minutes_per_clip: cfg.minutes_per_clip,
          minutes_per_month: cfg.minutes_per_month,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

        console.log(`[WEBHOOK] Subscription upserted: user=${userId} plan=${cfg.plan} status=${sub.status}`)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string

        const { data: userRow } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (userRow) {
          await supabase.from('subscriptions')
            .update({ status: 'canceled', updated_at: new Date().toISOString() })
            .eq('user_id', userRow.id)
          console.log(`[WEBHOOK] Subscription canceled: user=${userRow.id}`)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        // Reset monthly usage on successful recurring payment
        const customerId = invoice.customer as string
        const { data: userRow } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()
        if (userRow && invoice.billing_reason === 'subscription_cycle') {
          const periodStart = new Date().toISOString().slice(0, 7) + '-01'
          // The new period will be auto-created on next ingest; nothing to reset here
          // (we use monthly period_start in usage_ledger to isolate periods)
          console.log(`[WEBHOOK] Renewal payment succeeded: user=${userRow.id}`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.warn(`[WEBHOOK] Payment failed: invoice=${invoice.id} customer=${invoice.customer}`)
        break
      }
    }
  } catch (err) {
    console.error('[WEBHOOK] Handler error:', err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// ── Helper: add credits to current-period usage_ledger ────────────────────────
async function addCredits(supabase: ReturnType<typeof createServiceClient>, userId: string, credits: number) {
  const periodStart = new Date().toISOString().slice(0, 7) + '-01'

  const { data: existing } = await supabase
    .from('usage_ledger')
    .select('id, credits_bal')
    .eq('user_id', userId)
    .eq('period_start', periodStart)
    .single()

  if (existing) {
    await supabase.from('usage_ledger').update({
      credits_bal: (existing.credits_bal || 0) + credits,
      updated_at: new Date().toISOString(),
    }).eq('id', existing.id)
  } else {
    await supabase.from('usage_ledger').insert({
      user_id: userId,
      period_start: periodStart,
      clips_used: 0,
      credits_used: 0,
      credits_bal: credits,
      minutes_uploaded: 0,
      minutes_processed: 0,
    })
  }
}
