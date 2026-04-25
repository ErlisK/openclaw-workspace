import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'

export const maxDuration = 30

// Service-role client (bypasses RLS for webhook writes)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function grantPro(userId: string, customerId: string, subscriptionId: string, periodEnd: number) {
  const supabase = getAdminClient()
  await supabase.from('entitlements').upsert({
    user_id: userId,
    plan: 'pro',
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    plan_expires_at: new Date(periodEnd * 1000).toISOString(),
    experiments_limit: null, // unlimited
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  await supabase.from('audit_log').insert({
    user_id: userId,
    action: 'subscription_activated',
    entity_type: 'entitlement',
    entity_id: subscriptionId,
    metadata: { plan: 'pro', customer_id: customerId },
  }).then(() => {})
}

async function revokePro(userId: string) {
  const supabase = getAdminClient()
  await supabase.from('entitlements').update({
    plan: 'free',
    stripe_subscription_id: null,
    plan_expires_at: null,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)
}

async function getUserFromCustomer(customerId: string): Promise<string | null> {
  const supabase = getAdminClient()
  const { data } = await supabase
    .from('entitlements')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single()
  return data?.user_id || null
}

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret || !sig) {
    console.error('[webhook] Missing stripe-signature or STRIPE_WEBHOOK_SECRET — rejecting')
    return NextResponse.json({ error: 'Webhook verification required' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const userId = session.metadata?.user_id
        const subscriptionId = session.subscription as string
        const customerId = session.customer as string

        if (!userId || !subscriptionId) break

        const sub = await stripe.subscriptions.retrieve(subscriptionId)
        const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end
          ?? Math.floor(Date.now() / 1000) + 30 * 86400
        await grantPro(userId, customerId, subscriptionId, periodEnd)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.user_id || await getUserFromCustomer(sub.customer as string)
        if (!userId) break

        if (sub.status === 'active' || sub.status === 'trialing') {
          const pe = (sub as unknown as { current_period_end?: number }).current_period_end ?? Math.floor(Date.now()/1000) + 30*86400
          await grantPro(userId, sub.customer as string, sub.id, pe)
        } else if (['canceled', 'unpaid', 'past_due'].includes(sub.status)) {
          await revokePro(userId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.user_id || await getUserFromCustomer(sub.customer as string)
        if (userId) await revokePro(userId)
        break
      }

      case 'invoice.payment_failed': {
        // Log but don't immediately revoke — Stripe retries
        const invoice = event.data.object as Stripe.Invoice
        console.warn('[webhook] Payment failed for customer', invoice.customer)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[webhook] Handler error:', err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }
}
