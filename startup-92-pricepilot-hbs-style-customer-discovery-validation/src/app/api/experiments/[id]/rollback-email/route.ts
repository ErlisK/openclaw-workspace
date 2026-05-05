/**
 * POST /api/experiments/[id]/rollback-email
 *
 * Generate an AI-written customer notification email for a price rollback.
 * Claude Haiku writes a short, honest email the founder can send to their customers
 * explaining the rollback and optionally including a goodwill offer.
 *
 * Body:
 *   tone            'casual' | 'professional' | 'apologetic'  (default: 'casual')
 *   include_offer   boolean   — add a coupon/goodwill gesture line (default: false)
 *   offer_detail    string    — description of the offer, e.g. "10% off next purchase"
 *   product_url     string    — link back to the product
 *   send            boolean   — if true, send via AgentMail to founder's own inbox
 *
 * Returns:
 *   { subject, body, tone, experiment_id, preview_only: boolean }
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { generateText } from 'ai'
import { gateway } from '@ai-sdk/gateway'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: experimentId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const tone: 'casual' | 'professional' | 'apologetic' = body.tone ?? 'casual'
  const includeOffer: boolean = body.include_offer ?? false
  const offerDetail: string = body.offer_detail ?? '10% off your next purchase'
  const productUrl: string = body.product_url ?? ''
  const shouldSend: boolean = body.send ?? false

  // ── Fetch the experiment ──────────────────────────────────────────────
  const { data: exp, error: expErr } = await supabase
    .from('experiments')
    .select('*, products(name, current_price_cents)')
    .eq('id', experimentId)
    .eq('user_id', user.id)
    .single()

  if (expErr || !exp) {
    return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
  }

  const productName = exp.products?.name ?? 'our product'
  const priceA = (exp.variant_a_price_cents / 100).toFixed(0)
  const priceB = (exp.variant_b_price_cents / 100).toFixed(0)
  const currentPrice = (exp.products?.current_price_cents / 100).toFixed(0) ?? priceA

  // ── Generate with Claude Haiku ────────────────────────────────────────
  const toneInstructions = {
    casual:       'Write in a warm, conversational, founder-to-customer tone. Use "Hey" or "Hi" and be genuine.',
    professional: 'Write in a clear, professional tone. Use "Dear" or "Hello" and keep it formal but friendly.',
    apologetic:   'Write in a genuinely apologetic tone. Acknowledge any confusion the price change may have caused and thank the customer for their patience.',
  }

  const prompt = `You are a solo indie founder who just ran a pricing experiment and decided to roll back the price.

Product: "${productName}"
Test price (Variant B): $${priceB}
Reverted to: $${priceA}${productUrl ? `\nProduct URL: ${productUrl}` : ''}
${includeOffer ? `Goodwill offer to include: ${offerDetail}` : ''}

Write a short customer notification email (100-150 words max in the body) in a ${tone} tone.
${toneInstructions[tone]}

The email should:
1. Briefly explain that you tested a higher price and decided it wasn't right
2. Confirm the price is back to $${priceA}
3. Thank them for being a customer
${includeOffer ? `4. Mention the goodwill offer: ${offerDetail}` : ''}
${productUrl ? `5. Include a link: ${productUrl}` : ''}

Be honest and human. Do NOT be overly sales-y or use marketing buzzwords.

Respond with ONLY valid JSON: { "subject": "...", "body": "..." }
Subject max 60 chars. Body is plain text with line breaks as \\n.`

  let subject = `Quick update on ${productName} pricing`
  let emailBody = `Hi,\n\nWe recently tested a new price for ${productName} but decided it wasn't the right fit. We've reverted back to $${priceA}.\n\nThank you for being a customer — we appreciate your support.\n\nBest,\nThe Founder`

  try {
    const result = await generateText({
      model: gateway('anthropic/claude-haiku-4-5'),
      prompt,
      maxRetries: 0,
    })

    const cleaned = result.text.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    if (parsed.subject) subject = parsed.subject
    if (parsed.body) emailBody = parsed.body
  } catch {
    // Use fallback template — already set above
  }

  // ── Write to audit log ────────────────────────────────────────────────
  await supabase.from('audit_log').insert({
    user_id: user.id,
    entity_type: 'experiment',
    entity_id: experimentId,
    action: 'rollback_email_generated',
    new_value: {
      tone,
      subject,
      include_offer: includeOffer,
      preview_only: !shouldSend,
    },
  })

  // ── Optionally send via AgentMail ─────────────────────────────────────
  let sent = false
  let sendError: string | null = null

  if (shouldSend && process.env.AGENTMAIL_API_KEY) {
    try {
      const fromEmail = 'scide-founder@agentmail.to'
      const toEmail = user.email ?? fromEmail  // Send to founder's own inbox as a draft/preview

      const resp = await fetch(`https://api.agentmail.to/v0/inboxes/${fromEmail}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AGENTMAIL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: [{ email: toEmail }],
          from: { email: fromEmail, name: 'PricingSim (via your account)' },
          subject,
          text: emailBody,
        }),
      })

      if (resp.ok) {
        sent = true
        await supabase.from('audit_log').insert({
          user_id: user.id,
          entity_type: 'experiment',
          entity_id: experimentId,
          action: 'rollback_email_sent',
          new_value: { to: toEmail, subject },
        })
      } else {
        const err = await resp.json().catch(() => ({}))
        sendError = err.error ?? `HTTP ${resp.status}`
      }
    } catch (e) {
      sendError = String(e)
    }
  }

  return NextResponse.json({
    experiment_id: experimentId,
    product_name: productName,
    old_price: Number(priceB),
    new_price: Number(priceA),
    subject,
    body: emailBody,
    tone,
    include_offer: includeOffer,
    preview_only: !shouldSend,
    sent,
    send_error: sendError,
  })
}
