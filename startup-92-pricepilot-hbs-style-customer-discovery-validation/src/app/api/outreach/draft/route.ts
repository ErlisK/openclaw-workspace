/**
 * POST /api/outreach/draft
 * Generate personalized outreach emails using the Vercel AI Gateway (Claude).
 * Takes a target ID (or batch), generates subject + body, and saves to DB.
 *
 * Body: { target_id: string } | { batch: true, limit?: number }
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { gateway } from '@ai-sdk/gateway'

const BASE_URL = 'https://pricingsim.com'
const FROM_NAME = 'PricingSim'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function generateEmailForTarget(target: {
  id: string
  site_name: string
  site_url: string
  contact_name: string | null
  contact_email: string | null
  category: string
  relevance_reason: string
  suggested_guide: string
  suggested_url: string
}): Promise<{ subject: string; body: string }> {
  const firstName = target.contact_name?.split(' ')[0] ?? 'there'
  const guideUrl = target.suggested_url || `${BASE_URL}/guides/${target.suggested_guide}`

  const guideLabels: Record<string, string> = {
    'micro-seller-pricing-experiments': "The Solo Seller's Complete Guide to Pricing Experiments",
    'gumroad-pricing-updates-and-churn-risk': 'How to Update Your Gumroad Price Without Losing Customers',
    'stripe-price-testing-without-code': "Stripe Price Testing Without Code: A Founder's Guide",
    'cohort-aware-simulations-explained': 'Cohort-Aware Price Simulations: Why They Matter for Indie Founders',
  }

  const guideTitle = guideLabels[target.suggested_guide] ?? target.suggested_guide

  const prompt = `You are the founder of PricingSim, a tool that helps solo founders run safe Bayesian pricing experiments. You are writing a personalized outreach email to get a backlink from ${target.site_name}.

Context about the target:
- Site: ${target.site_name} (${target.site_url})
- Contact: ${target.contact_name ?? 'Editor/Owner'}
- Category: ${target.category}
- Why relevant: ${target.relevance_reason}
- Guide to pitch: "${guideTitle}" at ${guideUrl}

Write a short, genuine outreach email (150-200 words max in the body). The email must:
1. Open with a specific, non-generic compliment about their work (reference their category/focus area naturally)
2. Introduce PricingSim in one sentence: "I built PricingSim — a free tool for solo founders to run safe Bayesian pricing experiments on Stripe/Gumroad/Shopify data."
3. Pitch the specific guide as something genuinely useful for their audience, explaining why in 1-2 sentences
4. Make a concrete, low-friction ask: a link mention, resource roundup inclusion, or article embed
5. Sign off as "Erlis, Founder @ PricingSim"

Format your response as JSON with exactly two fields: "subject" (email subject line, 50 chars max) and "body" (plain text email body, no markdown).

The subject line should be specific and reference their site or content, not generic.`

  const result = await generateText({
    model: gateway('anthropic/claude-haiku-4-5'),
    prompt,
    maxRetries: 0,
  })

  try {
    const jsonText = result.text.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(jsonText)
    return { subject: parsed.subject ?? 'Relevant pricing resource for your audience', body: parsed.body ?? '' }
  } catch {
    // Fallback template if AI parse fails
    return {
      subject: `Pricing resource for ${target.site_name} audience`,
      body: `Hi ${firstName},\n\nI follow ${target.site_name} closely — the content on ${target.category} is genuinely useful for indie founders.\n\nI built PricingSim — a free tool for solo founders to run safe Bayesian pricing experiments on Stripe/Gumroad/Shopify data.\n\nI recently published a guide that I think would genuinely help your readers: "${guideTitle}" at ${guideUrl}.\n\nWould you be open to linking to it in a relevant post or resource roundup? Happy to share more context.\n\nBest,\nErlis, Founder @ PricingSim\n${BASE_URL}`,
    }
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const supabase = getSupabaseAdmin()

  if (body.target_id) {
    // Single target
    const { data: target, error } = await supabase
      .from('outreach_targets')
      .select('*')
      .eq('id', body.target_id)
      .single()

    if (error || !target) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 })
    }

    const { subject, body: emailBody } = await generateEmailForTarget(target)

    await supabase
      .from('outreach_targets')
      .update({ email_subject: subject, email_body: emailBody, status: 'drafted', updated_at: new Date().toISOString() })
      .eq('id', body.target_id)

    return NextResponse.json({ id: body.target_id, subject, preview: emailBody.slice(0, 200) })

  } else if (body.batch) {
    // Batch draft for pending targets
    const limit = Math.min(body.limit ?? 10, 20)
    const { data: targets, error } = await supabase
      .from('outreach_targets')
      .select('*')
      .eq('status', 'pending')
      .limit(limit)

    if (error || !targets?.length) {
      return NextResponse.json({ drafted: 0, message: 'No pending targets' })
    }

    const results = []
    for (const target of targets) {
      try {
        const { subject, body: emailBody } = await generateEmailForTarget(target)
        await supabase
          .from('outreach_targets')
          .update({ email_subject: subject, email_body: emailBody, status: 'drafted', updated_at: new Date().toISOString() })
          .eq('id', target.id)
        results.push({ id: target.id, site_name: target.site_name, subject })
      } catch (err) {
        results.push({ id: target.id, site_name: target.site_name, error: String(err) })
      }
    }

    return NextResponse.json({ drafted: results.filter(r => !r.error).length, results })
  }

  return NextResponse.json({ error: 'Provide target_id or batch:true' }, { status: 400 })
}
