import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase'
import Stripe from 'stripe'
import { trackServer } from '@/lib/analytics.server'

export const dynamic = 'force-dynamic'

async function grantEntitlements(
  userId: string,
  orgId: string | null,
  tier: string,
  extras: {
    stripeCustomerId?: string
    stripeSubscriptionId?: string
    stripeCheckoutSessionId?: string
    packCredits?: number
    currentPeriodEnd?: Date | null
  }
) {
  const admin = createAdminClient()
  const now = new Date().toISOString()

  // Upsert entitlement by user_id (using organization_id as fallback key for old rows)
  const row = {
    user_id: userId,
    organization_id: orgId,
    tier,
    status: 'active',
    stripe_customer_id: extras.stripeCustomerId,
    stripe_subscription_id: extras.stripeSubscriptionId,
    stripe_checkout_session_id: extras.stripeCheckoutSessionId,
    pack_credits: extras.packCredits ?? 0,
    current_period_end: extras.currentPeriodEnd?.toISOString() ?? null,
    updated_at: now,
    granted_at: now,
  }

  const { error } = await admin
    .from('entitlements')
    .upsert(row, { onConflict: 'user_id' })

  if (error) {
    console.error('[WEBHOOK] entitlement upsert error:', error.message)
  }

  // Log a usage event for the purchase
  await admin.from('usage_events').insert({
    user_id: userId,
    organization_id: orgId,
    event_type: 'purchase',
    resource_type: 'entitlement',
    metadata: { tier, stripe_checkout_session_id: extras.stripeCheckoutSessionId },
  })
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
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
    const message = err instanceof Error ? err.message : 'Signature verification failed'
    console.error('[WEBHOOK] Sig verification failed:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const admin = createAdminClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id
      const tier = session.metadata?.tier || 'deliverable_pack'
      const customerId = typeof session.customer === 'string' ? session.customer : null

      console.log(`[WEBHOOK] checkout.session.completed: ${session.id}, user: ${userId}, tier: ${tier}`)

      if (!userId) {
        console.warn('[WEBHOOK] No user_id in session metadata, skipping entitlement')
        break
      }

      // Get org for user
      const { data: profile } = await admin
        .from('profiles')
        .select('current_organization_id')
        .eq('id', userId)
        .single()

      const orgId = profile?.current_organization_id ?? null

      if (tier === 'pipeline_pro' && session.subscription) {
        const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
        let periodEnd: Date | null = null
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId) as unknown as { id: string; current_period_end: number }
          periodEnd = new Date(sub.current_period_end * 1000)
        }
        await grantEntitlements(userId, orgId, 'pipeline_pro', {
          stripeCustomerId: customerId ?? undefined,
          stripeSubscriptionId: subId ?? undefined,
          stripeCheckoutSessionId: session.id,
          packCredits: 5,
          currentPeriodEnd: periodEnd,
        })
      } else {
        // deliverable_pack — add 1 credit
        const { data: existing } = await admin
          .from('entitlements')
          .select('pack_credits')
          .eq('user_id', userId)
          .maybeSingle()

        const currentCredits = existing?.pack_credits ?? 0
        await grantEntitlements(userId, orgId, existing ? 'deliverable_pack' : tier, {
          stripeCustomerId: customerId ?? undefined,
          stripeCheckoutSessionId: session.id,
          packCredits: currentCredits + 1,
        })

        // Auto-create order with escrow fields + AI Pilot auto-assignment
        const aiPilotId = await (async () => {
          const { data } = await admin.from('providers').select('id').eq('is_ai_pilot', true).maybeSingle()
          return data?.id ?? null
        })()

        const deliverables = [
          { key: 'rfp_parse',  label: 'RFP Analysis',       status: 'pending' },
          { key: 'narrative',  label: 'Narrative Draft',    status: 'pending' },
          { key: 'budget',     label: 'Budget Build',       status: 'pending' },
          { key: 'forms',      label: 'Forms & Checklist',  status: 'pending' },
          { key: 'qa',         label: 'QA Review',          status: 'pending' },
          { key: 'export',     label: 'Submission Package', status: 'pending' },
        ]

        await admin.from('orders').insert({
          organization_id: orgId,
          user_id: userId,
          provider_id: aiPilotId,
          ordered_by: userId,
          created_by: userId,
          order_type: 'deliverable_pack',
          status: 'active',
          price_usd: 299,
          price_model: 'fixed',
          escrow_status: 'pending',
          escrow_conditions: { qa_passed: false, export_generated: false },
          current_step: 'rfp_parse',
          progress_pct: 10,
          deliverables,
          sla_deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
          status_history: [{
            status: 'active',
            step: 'rfp_parse',
            timestamp: new Date().toISOString(),
            note: 'Order created via Stripe checkout. AI Pilot assigned. Escrow pending QA + export.',
            actor: 'system',
          }],
          metadata: { tier, stripe_session: session.id },
        })
      }
      // Analytics: checkout_succeeded
      trackServer('checkout_succeeded', userId, orgId, {
        tier,
        session_id: session.id,
        amount: session.amount_total,
        currency: session.currency,
      }).catch(() => {})
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription & { current_period_end: number }
      await admin.from('entitlements')
        .update({
          status: sub.status === 'active' ? 'active' : 'inactive',
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', sub.id)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await admin.from('entitlements')
        .update({ tier: 'free', status: 'active', stripe_subscription_id: null, pack_credits: 0, updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', sub.id)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      console.warn(`[WEBHOOK] Payment failed: invoice ${invoice.id}`)
      break
    }

    default:
      console.log(`[WEBHOOK] Unhandled event: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
