import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSupabaseAdmin } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripe = new (Stripe as any)(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
}) as Stripe

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const db = getSupabaseAdmin()
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err: unknown) {
    console.error('[webhook] signature verification failed:', (err as Error).message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {

      // ── Checkout session completed ─────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const meta = session.metadata ?? {}
        const pi = session.payment_intent as string | null

        // Update deposit: set payment_intent, status = authorized
        await db.from('deposits')
          .update({
            stripe_payment_intent: pi,
            status: session.payment_status === 'paid' ? 'authorized' : 'pending',
            receipt_email: session.customer_email,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_session_id', session.id)

        // Also update project status if applicable
        if (meta.project_id) {
          await db.from('projects')
            .update({ status: 'active', updated_at: new Date().toISOString() } as Record<string, unknown>)
            .eq('id', meta.project_id)
            .then(() => {})
        }

        // Send receipt email via AgentMail
        if (session.customer_email) {
          await sendReceiptEmail({
            email: session.customer_email,
            amountCents: session.amount_total ?? 9900,
            sessionId: session.id,
            projectId: meta.project_id,
          })

          // Mark receipt sent
          await db.from('deposits')
            .update({ receipt_sent_at: new Date().toISOString() })
            .eq('stripe_session_id', session.id)
        }

        console.log('[webhook] checkout.session.completed', session.id)
        break
      }

      // ── Payment intent succeeded (after manual capture) ───────────────────
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        const charge = (pi.latest_charge as string) ?? null

        await db.from('deposits')
          .update({
            status: 'captured',
            stripe_charge_id: charge,
            stripe_receipt_url: null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent', pi.id)

        console.log('[webhook] payment_intent.succeeded', pi.id)
        break
      }

      // ── Refund processed ──────────────────────────────────────────────────
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const piId = charge.payment_intent as string | null

        await db.from('deposits')
          .update({
            status: 'refunded',
            refunded_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent', piId ?? '')

        // Send refund confirmation email
        if (charge.billing_details?.email) {
          await sendRefundEmail({
            email: charge.billing_details.email,
            amountCents: charge.amount_refunded,
          })
        }

        console.log('[webhook] charge.refunded', charge.id)
        break
      }

      // ── Payment failed ────────────────────────────────────────────────────
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        await db.from('deposits')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('stripe_payment_intent', pi.id)
        console.log('[webhook] payment_intent.payment_failed', pi.id)
        break
      }

      // ── Canceled ──────────────────────────────────────────────────────────
      case 'payment_intent.canceled': {
        const pi = event.data.object as Stripe.PaymentIntent
        await db.from('deposits')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('stripe_payment_intent', pi.id)
        console.log('[webhook] payment_intent.canceled', pi.id)
        break
      }

      default:
        console.log('[webhook] unhandled event:', event.type)
    }
  } catch (err) {
    console.error('[webhook] handler error:', err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// ── Email helpers ─────────────────────────────────────────────────────────────

async function sendReceiptEmail({
  email,
  amountCents,
  sessionId,
  projectId,
}: {
  email: string
  amountCents: number
  sessionId: string
  projectId?: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://startup-73-expeditehub-lean-startup.vercel.app'
  const amount = (amountCents / 100).toFixed(2)
  const projectLink = projectId ? `${appUrl}/project/${projectId}` : appUrl

  const body = {
    to: [{ email }],
    from: { email: 'scide-founder@agentmail.to', name: 'ExpediteHub' },
    subject: `Your $${amount} ADU Permit Deposit — ExpediteHub`,
    text: [
      `Hi,`,
      ``,
      `Thanks for your $${amount} deposit! We've reserved your spot in the Austin ADU permit queue.`,
      ``,
      `Here's what happens next:`,
      `1. We match you with a vetted Austin permit expediter (within 24h)`,
      `2. You receive 2-3 quotes with your AI-generated BP-001 packet`,
      `3. Accept a quote → your deposit is applied toward the expediter fee`,
      ``,
      `Your deposit is 100% refundable if no match is made within 5 business days.`,
      ``,
      `Track your project: ${projectLink}`,
      ``,
      `Questions? Reply to this email.`,
      ``,
      `— The ExpediteHub Team`,
      ``,
      `Reference: ${sessionId}`,
    ].join('\n'),
  }

  const key = process.env.AGENTMAIL_API_KEY
  if (!key) return

  await fetch('https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(e => console.error('[webhook] receipt email error:', e))
}

async function sendRefundEmail({
  email,
  amountCents,
}: {
  email: string
  amountCents: number
}) {
  const amount = (amountCents / 100).toFixed(2)
  const body = {
    to: [{ email }],
    from: { email: 'scide-founder@agentmail.to', name: 'ExpediteHub' },
    subject: `Your $${amount} refund from ExpediteHub`,
    text: [
      `Hi,`,
      ``,
      `Your $${amount} deposit has been refunded. It should appear on your statement within 5–10 business days.`,
      ``,
      `We're sorry we couldn't complete your match. If you'd like to try again or share feedback, just reply to this email.`,
      ``,
      `— The ExpediteHub Team`,
    ].join('\n'),
  }

  const key = process.env.AGENTMAIL_API_KEY
  if (!key) return

  await fetch('https://api.agentmail.to/v0/inboxes/scide-founder@agentmail.to/messages/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(e => console.error('[webhook] refund email error:', e))
}
