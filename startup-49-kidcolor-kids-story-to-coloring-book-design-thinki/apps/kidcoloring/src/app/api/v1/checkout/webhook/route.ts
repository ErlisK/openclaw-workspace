import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { isStripeConfigured } from '@/lib/stripe'

export const maxDuration = 30

/**
 * POST /api/v1/checkout/webhook
 *
 * Stripe webhook handler. Verifies signature, then:
 *
 * checkout.session.completed
 *   → update orders.status = 'paid'
 *   → update profiles.is_subscribed (for subscriptions)
 *   → send receipt email via Agentmail
 *   → log payment_completed event
 *
 * payment_intent.payment_failed
 *   → update orders.status = 'failed'
 *   → log payment_failed event
 *
 * customer.subscription.updated / deleted
 *   → update subscriptions table
 *   → update profiles.is_subscribed
 *
 * WEBHOOK SETUP:
 *   1. Stripe Dashboard → Developers → Webhooks → Add endpoint
 *   2. URL: https://kidcoloring-research.vercel.app/api/v1/checkout/webhook
 *   3. Events to listen: 
 *      - checkout.session.completed
 *      - payment_intent.payment_failed
 *      - customer.subscription.updated
 *      - customer.subscription.deleted
 *   4. Copy Signing secret → STRIPE_WEBHOOK_SECRET env var
 */

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function sendReceiptEmail(params: {
  email:       string
  name?:       string
  amountTotal: number
  currency:    string
  priceId:     string
  sessionId?:  string
  orderId?:    string
  testMode:    boolean
}): Promise<void> {
  const key = process.env.AGENTMAIL_API_KEY
  if (!key || !params.email) return

  const amount = (params.amountTotal / 100).toFixed(2)
  const product = params.priceId === 'subscription'
    ? 'KidColoring Monthly Subscription'
    : 'KidColoring Personalized Coloring Book'

  const body = {
    to:      params.email,
    subject: `${params.testMode ? '[TEST] ' : ''}Your KidColoring receipt 🎨`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
  <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <h1 style="color: #7c3aed; margin: 0 0 8px;">🎨 Thank you for your order!</h1>
    <p style="color: #6b7280; margin: 0 0 24px;">Your personalized coloring book is ready.</p>
    
    <div style="background: #f5f3ff; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <h2 style="margin: 0 0 12px; color: #374151; font-size: 16px;">${product}</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0; color: #6b7280; font-size: 14px;">Amount paid</td>
          <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #374151;">
            $${amount} ${params.currency.toUpperCase()}
          </td>
        </tr>
        ${params.orderId ? `
        <tr>
          <td style="padding: 4px 0; color: #6b7280; font-size: 14px;">Order reference</td>
          <td style="padding: 4px 0; text-align: right; font-size: 12px; font-family: monospace; color: #374151;">
            ${params.orderId.slice(-8).toUpperCase()}
          </td>
        </tr>` : ''}
        ${params.testMode ? `
        <tr>
          <td colspan="2" style="padding: 8px 0; color: #f59e0b; font-size: 12px;">
            ⚠️ This is a test-mode receipt. No real charge was made.
          </td>
        </tr>` : ''}
      </table>
    </div>
    
    ${params.sessionId ? `
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="https://kidcoloring-research.vercel.app/create/preview/${params.sessionId}"
         style="display: inline-block; background: #7c3aed; color: white; font-weight: bold;
                padding: 14px 28px; border-radius: 12px; text-decoration: none; font-size: 16px;">
        Download my coloring book →
      </a>
    </div>` : ''}
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 16px;">
      <p style="color: #9ca3af; font-size: 13px; margin: 0;">
        Questions? Reply to this email or contact us at 
        <a href="mailto:hello@kidcoloring.app" style="color: #7c3aed;">hello@kidcoloring.app</a>
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0;">
        KidColoring — Personalized coloring books for kids
      </p>
    </div>
  </div>
</body>
</html>`,
  }

  await fetch('https://api.agentmail.to/v0/inboxes/scide-founder/messages', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(8_000),
  }).catch(err => console.error('[webhook] receipt email failed:', err))
}

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const stripe = new Stripe(stripeKey, { apiVersion: '2025-05-28.basil' })

  const rawBody = await req.text()
  const sig = req.headers.get('stripe-signature')

  let event: Stripe.Event

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
    } else {
      // Dev: parse without signature (only in test mode)
      console.warn('[webhook] No webhook secret — skipping signature verification')
      event = JSON.parse(rawBody) as Stripe.Event
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[webhook] signature failed:', msg)
    return NextResponse.json({ error: `Webhook signature: ${msg}` }, { status: 400 })
  }

  const sb = admin()
  const testMode = event.livemode === false

  try {
    switch (event.type) {

      // ── Payment completed ─────────────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const meta    = session.metadata ?? {}
        const kidSessionId = meta.kidcoloring_session_id || null
        const priceId  = meta.price_id || 'per_book_999'
        const userId   = meta.user_id || null

        // Update order to paid
        const { data: order } = await sb.from('orders')
          .update({
            status:    'paid',
            paid_at:   new Date().toISOString(),
            stripe_payment_intent: session.payment_intent as string ?? null,
            stripe_customer_id:    session.customer as string ?? null,
            tax_amount_cents:      session.total_details?.amount_tax ?? 0,
            country:               session.customer_details?.address?.country ?? null,
            receipt_email:         session.customer_email ?? null,
          })
          .eq('stripe_session_id', session.id)
          .select('id')
          .single()

        // For subscriptions: upsert subscriptions table + update profile
        if (session.mode === 'subscription' && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string)
          await sb.from('subscriptions').upsert({
            stripe_subscription_id: sub.id,
            stripe_customer_id:     sub.customer as string,
            user_id:                userId,
            price_id:               priceId,
            status:                 sub.status,
            current_period_start:   new Date(((sub as unknown) as { current_period_start: number }).current_period_start * 1000).toISOString(),
            current_period_end:     new Date(((sub as unknown) as { current_period_end: number }).current_period_end * 1000).toISOString(),
          }, { onConflict: 'stripe_subscription_id' })

          if (userId) {
            await sb.from('profiles').update({
              is_subscribed:           true,
              subscription_tier:       'monthly',
              subscription_started_at: new Date().toISOString(),
            }).eq('id', userId)
          }
        }

        // Send receipt email
        const email = session.customer_email ?? session.customer_details?.email
        if (email) {
          await sendReceiptEmail({
            email,
            amountTotal: session.amount_total ?? 0,
            currency:    session.currency ?? 'usd',
            priceId,
            sessionId:   kidSessionId ?? undefined,
            orderId:     (order as { id?: string } | null)?.id,
            testMode,
          })

          // Mark receipt sent
          if ((order as { id?: string } | null)?.id) {
            await sb.from('orders').update({ receipt_sent: true })
              .eq('id', (order as { id: string }).id)
          }
        }

        // Log event
        await sb.from('events').insert({
          event_name: 'payment_completed',
          session_id: kidSessionId,
          properties: {
            stripe_session_id: session.id,
            price_id:          priceId,
            amount_total:      session.amount_total,
            currency:          session.currency,
            test_mode:         testMode,
            tax_collected:     session.total_details?.amount_tax ?? 0,
          },
        })

        console.log(`[webhook] payment_completed: ${session.id} / $${(session.amount_total ?? 0) / 100}`)
        break
      }

      // ── Payment failed ────────────────────────────────────────────────────
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        await sb.from('orders')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent', pi.id)

        await sb.from('events').insert({
          event_name: 'payment_failed',
          properties: {
            payment_intent_id: pi.id,
            error_code:        pi.last_payment_error?.code,
            error_message:     pi.last_payment_error?.message,
            test_mode:         testMode,
          },
        })
        break
      }

      // ── Subscription updated ──────────────────────────────────────────────
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        await sb.from('subscriptions').upsert({
          stripe_subscription_id: sub.id,
          stripe_customer_id:     sub.customer as string,
          status:                 sub.status,
          current_period_start:   new Date(((sub as unknown) as { current_period_start: number }).current_period_start * 1000).toISOString(),
          current_period_end:     new Date(((sub as unknown) as { current_period_end: number }).current_period_end * 1000).toISOString(),
          cancel_at_period_end:   sub.cancel_at_period_end,
          canceled_at:            sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
        }, { onConflict: 'stripe_subscription_id' })
        break
      }

      // ── Subscription cancelled ────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await sb.from('subscriptions')
          .update({ status: 'canceled', canceled_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id)

        // Find user and downgrade
        const { data: subData } = await sb.from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', sub.id)
          .single()

        if ((subData as { user_id?: string } | null)?.user_id) {
          await sb.from('profiles')
            .update({ is_subscribed: false, subscription_tier: null })
            .eq('id', (subData as { user_id: string }).user_id)
        }
        break
      }

      default:
        // Unknown event — return 200 to prevent Stripe retries
        break
    }
  } catch (err) {
    console.error('[webhook] handler error:', err)
    // Return 200 to prevent Stripe from retrying — log the error instead
    return NextResponse.json({ received: true, error: String(err) })
  }

  return NextResponse.json({ received: true })
}
