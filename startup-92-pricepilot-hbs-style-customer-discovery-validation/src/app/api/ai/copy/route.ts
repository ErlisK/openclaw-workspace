/**
 * POST /api/ai/copy
 * Generate experiment landing page copy for an A/B price test.
 * Input: { experiment_id?, product_name, price_a, price_b, description?, audience? }
 * Returns: { headline, subheadline, description, cta_text, variant_a_label, variant_b_label, trust_line }
 */
import { NextResponse } from 'next/server'
import { requirePro } from '@/lib/entitlements'
import { createClient } from '@/lib/supabase'
import { createRatelimit, checkRateLimit } from '@/lib/ratelimit'

export const maxDuration = 30

const aiLimiter = createRatelimit(20, 60)

export async function POST(request: Request) {
  const entResult = await requirePro()
  if (entResult instanceof NextResponse) return entResult
  const user = entResult.user
  const { limited, headers } = await checkRateLimit(aiLimiter, user.id)
  if (limited) return NextResponse.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429, headers })
  const supabase = await createClient()

  const body = await request.json()
  let { product_name, price_a, price_b, description, audience } = body

  // Optionally pull from experiment
  if (body.experiment_id && (!product_name)) {
    const { data: exp } = await supabase
      .from('experiments')
      .select('*, products(name, current_price_cents)')
      .eq('id', body.experiment_id)
      .eq('user_id', user.id)
      .single()
    if (exp) {
      product_name = product_name || exp.products?.name || exp.headline || 'Product'
      price_a = price_a || (exp.variant_a_price_cents / 100).toFixed(2)
      price_b = price_b || (exp.variant_b_price_cents / 100).toFixed(2)
      description = description || exp.description || ''
    }
  }

  if (!product_name) {
    return NextResponse.json({ error: 'product_name is required' }, { status: 422 })
  }

  const priceAStr = price_a ? `$${price_a}` : 'current price'
  const priceBStr = price_b ? `$${price_b}` : 'new price'
  const audienceNote = audience ? `Target audience: ${audience}` : 'Target audience: solo creators, indie makers, micro-SaaS founders'
  const descNote = description ? `Product description: ${description}` : ''

  const prompt = `You are a conversion copywriter helping a solo creator write landing page copy for a pricing experiment.

Product: ${product_name}
Variant A price: ${priceAStr} (control)
Variant B price: ${priceBStr} (test)
${audienceNote}
${descNote}

Write landing page copy that works for BOTH variants (the price will be swapped dynamically).
Focus on value, not price. The copy should feel honest and not pushy.

Format as JSON (ONLY valid JSON, no markdown):
{
  "headline": "compelling headline (max 8 words)",
  "subheadline": "one supporting sentence that reinforces the value",
  "description": "2-3 sentence product description that sells the outcome, not features",
  "cta_text": "action-oriented button text (max 5 words, e.g. Get instant access)",
  "variant_a_label": "short label for the control price (e.g. Founding price)",
  "variant_b_label": "short label for the test price (e.g. Standard price)",
  "trust_line": "one short trust-building line (e.g. 847 makers use this daily)"
}`

  try {
    const { createGateway } = await import('@ai-sdk/gateway')
    const { generateText } = await import('ai')
    const gateway = createGateway()
    const { text } = await generateText({
      model: gateway('anthropic/claude-haiku-4-5'),
      prompt,
      maxOutputTokens: 400,
      temperature: 0.6,
    })
    const parsed = JSON.parse(text.trim())

    // If experiment_id provided, optionally update the experiment with the generated copy
    if (body.experiment_id && body.apply === true) {
      await supabase.from('experiments').update({
        headline: parsed.headline,
        description: parsed.description,
        cta_text: parsed.cta_text,
        variant_a_label: parsed.variant_a_label,
        variant_b_label: parsed.variant_b_label,
      }).eq('id', body.experiment_id).eq('user_id', user.id)
    }

    return NextResponse.json(parsed)
  } catch {
    // Deterministic fallback
    const pName = product_name
    return NextResponse.json({
      headline: `The smarter way to ${pName.toLowerCase().includes('template') ? 'build' : 'grow'}`,
      subheadline: `${pName} helps you move faster and earn more.`,
      description: `${pName} is built for solo founders who want results without complexity. No fluff, no bloat — just the essentials that actually move the needle. Trusted by indie makers worldwide.`,
      cta_text: `Get instant access`,
      variant_a_label: `Founding price`,
      variant_b_label: `Standard price`,
      trust_line: `Join hundreds of makers using ${pName} today`,
    })
  }
}
