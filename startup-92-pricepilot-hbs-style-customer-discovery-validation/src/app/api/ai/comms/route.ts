/**
 * POST /api/ai/comms
 * Generate roll-out communication templates for a price change.
 * Input: { suggestion_id?, product_name, old_price, new_price, seller_name?, context? }
 * Returns: { email: string, tweet: string, blog_intro: string }
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
  let { product_name, old_price, new_price, seller_name, context } = body

  // Optionally pull from suggestion
  if (body.suggestion_id && (!product_name || !new_price)) {
    const { data: s } = await supabase
      .from('suggestions')
      .select('*, products(name, current_price_cents)')
      .eq('id', body.suggestion_id)
      .eq('user_id', user.id)
      .single()
    if (s) {
      product_name = product_name || s.products?.name || 'Product'
      old_price = old_price || (s.current_price_cents / 100).toFixed(2)
      new_price = new_price || (s.suggested_price_cents / 100).toFixed(2)
    }
  }

  if (!product_name || !new_price) {
    return NextResponse.json({ error: 'product_name and new_price are required' }, { status: 422 })
  }

  const oldPriceStr = old_price ? `$${old_price}` : 'the current price'
  const newPriceStr = `$${new_price}`
  const sellerByline = seller_name ? ` from ${seller_name}` : ''
  const contextNote = context ? `Additional context: ${context}` : ''

  const prompt = `You are a copywriter helping a solo creator communicate a price change to their audience.

Product: ${product_name}${sellerByline}
Old price: ${oldPriceStr}
New price: ${newPriceStr}
${contextNote}

Write 3 distinct communication templates:
1. A short announcement email (subject + 3-4 sentence body). Warm, honest, no-BS. Acknowledge the change, explain the value, no fake urgency.
2. A tweet/X post (max 280 chars). Confident, casual, not salesy.  
3. A blog post intro paragraph (4-5 sentences). Conversational, transparent about the pricing decision.

Format as JSON:
{
  "email": { "subject": "...", "body": "..." },
  "tweet": "...",
  "blog_intro": "..."
}
Output ONLY valid JSON. No markdown.`

  try {
    const { createGateway } = await import('@ai-sdk/gateway')
    const { generateText } = await import('ai')
    const gateway = createGateway()
    const { text } = await generateText({
      model: gateway('anthropic/claude-haiku-4-5'),
      prompt,
      maxOutputTokens: 600,
      temperature: 0.7,
    })
    const parsed = JSON.parse(text.trim())
    return NextResponse.json(parsed)
  } catch {
    // Deterministic fallback
    const pName = product_name
    return NextResponse.json({
      email: {
        subject: `${pName} pricing update`,
        body: `Hi there,\n\nI'm updating the price of ${pName} from ${oldPriceStr} to ${newPriceStr}. This reflects the growing value I've been adding and helps me continue investing in improvements.\n\nIf you've been on the fence, now is a great time to grab it at the current price before the change goes live.\n\nThanks for your support — it means everything.\n\n— ${seller_name || 'The founder'}`,
      },
      tweet: `${pName} is going from ${oldPriceStr} → ${newPriceStr}. If you've been thinking about it, now's your moment. 🚀 [link]`,
      blog_intro: `Pricing is one of the hardest decisions for a solo creator. After months of watching how people buy ${pName}, I've decided to raise the price from ${oldPriceStr} to ${newPriceStr}. This isn't a decision I took lightly — I ran a proper A/B test and the data consistently showed buyers valued it more than I was charging. Here's what I learned.`,
    })
  }
}
