/**
 * POST /api/ai/explain
 * Plain-English explanation of a pricing recommendation.
 * Input: { suggestion_id } or inline suggestion fields
 * Returns: { explanation: string, key_points: string[], action: string }
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { createRatelimit, checkRateLimit } from '@/lib/ratelimit'

export const maxDuration = 30

const aiLimiter = createRatelimit(20, 60)

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { limited, headers } = await checkRateLimit(aiLimiter, user.id)
  if (limited) return NextResponse.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429, headers })

  const body = await request.json()
  const { suggestion_id } = body

  // Fetch suggestion from DB
  let suggestion = body.suggestion
  if (suggestion_id && !suggestion) {
    const { data } = await supabase
      .from('suggestions')
      .select('*, products(name, current_price_cents)')
      .eq('id', suggestion_id)
      .eq('user_id', user.id)
      .single()
    suggestion = data
  }

  if (!suggestion) {
    return NextResponse.json({ error: 'No suggestion provided' }, { status: 422 })
  }

  const productName = suggestion.products?.name || suggestion.product_name || 'your product'
  const currentPrice = (suggestion.current_price_cents / 100).toFixed(2)
  const suggestedPrice = (suggestion.suggested_price_cents / 100).toFixed(2)
  const conf = suggestion.confidence_score
    ? `${Math.round(suggestion.confidence_score * 100)}%`
    : 'uncertain'
  const lift = suggestion.proj_monthly_lift_p50
    ? `$${(suggestion.proj_monthly_lift_p50 / 100).toFixed(0)}/month`
    : 'unknown'

  const prompt = `You are PricePilot, a pricing coach for solo creators and micro-SaaS founders. 
Explain this pricing recommendation in plain English for a non-technical founder.

Product: ${productName}
Current price: $${currentPrice}
Recommended test price: $${suggestedPrice}
Confidence: ${conf} that this will increase revenue
Projected monthly lift: ${lift} (median estimate)
Engine rationale: ${suggestion.rationale || 'Bayesian elasticity analysis of sales history'}
Caveats: ${(suggestion.caveats || []).join('; ') || 'none'}

Write for someone who is smart but not a statistician.
Use plain language. No jargon. 3-4 sentences max.
Then provide exactly 3 key bullet points.
Format as JSON: { "explanation": "...", "key_points": ["...", "...", "..."], "action": "one clear next step sentence" }
Output ONLY valid JSON.`

  try {
    const { createGateway } = await import('@ai-sdk/gateway')
    const { generateText } = await import('ai')
    const gateway = createGateway()
    const { text } = await generateText({
      model: gateway('anthropic/claude-haiku-4-5'),
      prompt,
      maxOutputTokens: 300,
      temperature: 0.3,
    })
    const parsed = JSON.parse(text.trim())
    return NextResponse.json(parsed)
  } catch {
    // Deterministic fallback
    return NextResponse.json({
      explanation: `Your data suggests that buyers of ${productName} aren't very price-sensitive — when you charged slightly more, the number of sales didn't drop much. That means you're likely leaving money on the table at $${currentPrice}. Testing $${suggestedPrice} could add roughly ${lift} to your monthly revenue with ${conf} confidence.`,
      key_points: [
        `Your demand is relatively inelastic — price increases don't chase buyers away`,
        `The engine analyzed your sales history and found the $${suggestedPrice} point maximizes expected revenue`,
        `This is a test, not a permanent change — you can roll back in one click`,
      ],
      action: `Create a 2-week A/B experiment comparing $${currentPrice} vs $${suggestedPrice} to confirm the lift.`,
    })
  }
}
