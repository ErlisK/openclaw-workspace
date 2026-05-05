/**
 * AI-powered narrative generator for pricing suggestions.
 * Uses Vercel AI Gateway (auto-OIDC — no API key needed).
 * Falls back gracefully if model is unavailable (e.g., local dev).
 */

interface NarrativeInput {
  productName: string
  currentPrice: number
  tiers: Array<{
    price: number
    confidence: number
    confidence_label: string
    roi_p50_cents: number
    tier_tag: string
    action: string
  }>
  elasticityMean: number | null
  nObservations: number
  action: string
}

export async function generateNarrative(input: NarrativeInput): Promise<string> {
  // Only proceed if we have actionable data
  if (input.action === 'insufficient_data' || input.tiers.length === 0) {
    return `Not enough data yet to generate a recommendation for ${input.productName}.`
  }

  const bestTier = input.tiers[0]
  const liftUsd = (bestTier.roi_p50_cents / 100).toFixed(0)
  const elasticityStr = input.elasticityMean
    ? `Price elasticity: ε ≈ ${input.elasticityMean.toFixed(2)} (${input.elasticityMean > -1 ? 'inelastic' : 'elastic'} demand).`
    : ''

  const prompt = `You are PricingSim, a pricing advisor for solo creators and micro-SaaS founders. 
Write a concise, confident 2-3 sentence pricing recommendation narrative.

Product: ${input.productName}
Current price: $${input.currentPrice.toFixed(2)}
Recommended test price: $${bestTier.price.toFixed(2)} (${bestTier.tier_tag})
Projected monthly revenue lift: ~$${liftUsd} (p50 estimate)
Confidence: ${bestTier.confidence_label} (${(bestTier.confidence * 100).toFixed(0)}%)
Data points: ${input.nObservations} price windows
${elasticityStr}

Write in a warm, direct tone. Mention the specific numbers. End with a single clear action.
No bullet points. Max 60 words.`

  try {
    // Dynamic import so build succeeds even without the SDK installed locally
    const { createGateway } = await import('@ai-sdk/gateway')
    const { generateText } = await import('ai')

    const gateway = createGateway()
    const { text } = await generateText({
      model: gateway('anthropic/claude-haiku-4-5'),
      prompt,
      maxOutputTokens: 120,
      temperature: 0.4,
    })
    return text.trim()
  } catch {
    // Fallback: deterministic narrative (works in local dev and if AI is unavailable)
    return fallbackNarrative(input)
  }
}

function fallbackNarrative(input: NarrativeInput): string {
  const tier = input.tiers[0]
  const lift = (tier.roi_p50_cents / 100).toFixed(0)
  const ε = input.elasticityMean
  const elasticNote = ε
    ? ` Demand appears ${Math.abs(ε) < 1 ? 'inelastic' : 'elastic'} (ε≈${ε.toFixed(1)}).`
    : ''

  return `Based on ${input.nObservations} price observation windows, testing **$${tier.price.toFixed(2)}** for ${input.productName} is projected to lift monthly revenue by ~$${lift} (${tier.confidence_label}).${elasticNote} Run this as a 2-week A/B split experiment to confirm the lift before making the change permanent.`
}
