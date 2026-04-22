import { gateway } from '@ai-sdk/gateway'
import { generateObject } from 'ai'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeROI } from '@/lib/roi'
import { computeWhatIf } from '@/lib/pricing'
import { getUserTier, proRequiredResponse } from '@/lib/pro/gate'
import { captureServerEvent } from '@/lib/posthog/server'

// ─── Response schema ──────────────────────────────────────────────────────────

const InsightSchema = z.object({
  type: z.enum(['weekly_summary', 'price_suggestion', 'schedule_suggestion']),
  title: z.string(),
  body: z.string(),
  metric: z.string().optional(),       // key number, e.g. "$87/hr"
  action: z.string(),                   // concrete next step
  cta_label: z.string().optional(),     // button label
  cta_href: z.string().optional(),      // button href
  confidence: z.enum(['high', 'medium', 'low']),
})

const InsightsResponseSchema = z.object({
  insights: z.array(InsightSchema),
  data_quality: z.enum(['sufficient', 'sparse', 'empty']),
  generated_at: z.string(),
})

type InsightType = z.infer<typeof InsightSchema>

// ─── Deterministic fallbacks (no AI, data-sparse) ────────────────────────────

function deterministicInsights(
  netRevenue: number,
  trueHourlyRate: number,
  billableHours: number,
  topStream: string | null,
  monthlyTarget: number,
  txCount: number
): InsightType[] {
  const insights: InsightType[] = []

  if (netRevenue === 0) {
    insights.push({
      type: 'weekly_summary',
      title: 'Import your first income data',
      body: 'Upload a CSV from Stripe, PayPal, or Upwork to unlock your ROI dashboard, true hourly rate, and personalized AI insights.',
      action: 'Import a CSV file to get started',
      cta_label: 'Import CSV',
      cta_href: '/import',
      confidence: 'high',
    })
    return insights
  }

  // Weekly summary
  insights.push({
    type: 'weekly_summary',
    title: `Your effective rate: $${trueHourlyRate.toFixed(0)}/hr`,
    body: `You earned $${netRevenue.toFixed(0)} net across ${txCount} transactions and logged ${billableHours.toFixed(1)} billable hours. ${topStream ? `"${topStream}" is your top earner by revenue.` : ''}`,
    metric: `$${trueHourlyRate.toFixed(0)}/hr`,
    action: 'Log more time to improve rate accuracy',
    cta_label: 'Log time',
    cta_href: '/timer',
    confidence: 'high',
  })

  // Price suggestion
  if (monthlyTarget > 0 && netRevenue > 0) {
    const monthlyCurrent = netRevenue / 3  // assume 90 day window
    const gap = monthlyTarget - monthlyCurrent
    if (gap > 0) {
      const suggestedRaise = ((gap / monthlyCurrent) * 100).toFixed(0)
      insights.push({
        type: 'price_suggestion',
        title: `Raise rates ~${suggestedRaise}% to hit your $${monthlyTarget.toFixed(0)}/mo target`,
        body: `You're currently averaging $${monthlyCurrent.toFixed(0)}/month — $${gap.toFixed(0)} short of your target. A price increase of ~${suggestedRaise}% across your top stream would close the gap in 1-2 months.`,
        metric: `+${suggestedRaise}%`,
        action: `Experiment: raise your next quote by ${Math.min(parseInt(suggestedRaise), 25)}% and track conversion`,
        cta_label: 'Pricing lab',
        cta_href: '/pricing',
        confidence: 'medium',
      })
    }
  }

  // Schedule suggestion
  insights.push({
    type: 'schedule_suggestion',
    title: 'Track when you do your best work',
    body: 'Log 2 weeks of time entries to unlock the earnings heatmap — it shows which days and hours generate the most revenue per hour, so you can shift capacity toward high-value windows.',
    action: 'Use the one-tap timer or import a calendar file',
    cta_label: 'Open timer',
    cta_href: '/timer',
    confidence: 'medium',
  })

  return insights
}

// ─── Data aggregation helper ─────────────────────────────────────────────────

function buildContextSummary(roi: ReturnType<typeof computeROI>, monthlyTarget: number) {
  const agg = roi.aggregate
  const topStreams = roi.streams.slice(0, 3).map(s => ({
    name: s.name,
    netRevenue: s.netRevenue.toFixed(0),
    trueHourlyRate: s.trueHourlyRate.toFixed(2),
    billableHours: s.billableHours.toFixed(1),
    txCount: s.txCount,
    acquisitionROI: s.acquisitionROI.toFixed(0),
  }))

  // Best heatmap slot
  const bestSlot = roi.heatmap.length > 0
    ? roi.heatmap.reduce((b, c) => c.rate > b.rate ? c : b)
    : null

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return {
    period: roi.dateRange,
    aggregate: {
      grossRevenue: agg.grossRevenue.toFixed(2),
      netRevenue: agg.netRevenue.toFixed(2),
      platformFees: agg.platformFees.toFixed(2),
      acquisitionCosts: agg.acquisitionCosts.toFixed(2),
      totalHours: agg.totalHours.toFixed(1),
      billableHours: agg.billableHours.toFixed(1),
      trueHourlyRate: agg.trueHourlyRate.toFixed(2),
      billableHourlyRate: agg.billableHourlyRate.toFixed(2),
      effectiveHourlyRate: agg.effectiveHourlyRate.toFixed(2),
      netAfterAllCosts: agg.netAfterAllCosts.toFixed(2),
    },
    topStreams,
    monthlyTarget: monthlyTarget > 0 ? monthlyTarget : null,
    bestHeatmapSlot: bestSlot ? {
      day: DAYS[bestSlot.weekday],
      hour: bestSlot.hour,
      rate: bestSlot.rate.toFixed(2),
      minutes: bestSlot.minutes,
    } : null,
    acquisitionBySource: roi.acquisitionBySource.slice(0, 3).map(s => ({
      channel: s.channel,
      spend: s.totalSpend.toFixed(2),
      roi: s.roi.toFixed(0),
      roas: s.roas.toFixed(1),
    })),
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Pro gate — AI insights require a Pro subscription
  const { isPro } = await getUserTier(supabase, user.id)
  if (!isPro) return proRequiredResponse('ai_insights')

  // Rate limiting: max 10 AI calls per hour per user
  const RATE_LIMIT_CALLS = 10
  const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
  const { count: recentCalls } = await supabase
    .from('recommendations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('generated_at', windowStart)
  if ((recentCalls ?? 0) >= RATE_LIMIT_CALLS) {
    const retryAfter = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)
    return NextResponse.json(
      { error: 'rate_limited', message: `AI insights limit: ${RATE_LIMIT_CALLS}/hour. Try again later.` },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  const body = await request.json().catch(() => ({})) as {
    insightType?: 'all' | 'weekly_summary' | 'price_suggestion' | 'schedule_suggestion'
    days?: number
  }
  const insightType = body.insightType ?? 'all'
  const days = body.days ?? 30

  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - days)
  const from = fromDate.toISOString().split('T')[0]
  const to = new Date().toISOString().split('T')[0]

  // Fetch all needed data in parallel
  const [
    { data: streams },
    { data: transactions },
    { data: timeEntries },
    { data: acquisitionCosts },
    { data: goals },
  ] = await Promise.all([
    supabase.from('streams').select('id, name, color, platform').eq('user_id', user.id),
    supabase.from('transactions').select('stream_id, net_amount, amount, fee_amount, transaction_date')
      .eq('user_id', user.id).gte('transaction_date', from),
    supabase.from('time_entries').select('stream_id, duration_minutes, entry_type, started_at')
      .eq('user_id', user.id).gte('started_at', fromDate.toISOString()),
    supabase.from('acquisition_costs').select('stream_id, channel, amount, period_start, period_end')
      .eq('user_id', user.id).gte('period_start', from),
    supabase.from('user_goals').select('monthly_target, hourly_target').eq('user_id', user.id).single(),
  ])

  const roi = computeROI(
    streams ?? [], transactions ?? [], timeEntries ?? [], acquisitionCosts ?? [],
    { from, to }
  )

  const monthlyTarget = goals?.monthly_target ?? 0
  const txCount = transactions?.length ?? 0
  const netRevenue = roi.aggregate.netRevenue
  const trueHourlyRate = roi.aggregate.trueHourlyRate
  const billableHours = roi.aggregate.billableHours

  // Determine data quality
  const dataQuality: 'sufficient' | 'sparse' | 'empty' =
    txCount === 0 ? 'empty'
    : txCount < 3 || billableHours < 1 ? 'sparse'
    : 'sufficient'

  // Use deterministic fallback for empty/sparse data
  if (dataQuality !== 'sufficient') {
    const insights = deterministicInsights(
      netRevenue, trueHourlyRate, billableHours,
      roi.aggregate.topStream, monthlyTarget, txCount
    )
    return NextResponse.json({
      insights,
      data_quality: dataQuality,
      generated_at: new Date().toISOString(),
      fallback: true,
    })
  }

  // Build context for AI
  const ctx = buildContextSummary(roi, monthlyTarget)

  // What-if for price suggestions
  const whatIf = computeWhatIf(monthlyTarget || netRevenue * 1.3, transactions ?? [], timeEntries ?? [])

  const systemPrompt = `You are an expert freelance business advisor for GigAnalytics, a multi-income ROI dashboard.
You have access to a user's real financial and time-tracking aggregates. 
Be specific, use the provided numbers, and give immediately actionable advice.
Do not hallucinate or invent numbers not in the context.
Keep each insight tight: 2-3 sentences max for body, one clear action per insight.`

  const userPrompt = `User's income data for last ${days} days:

${JSON.stringify(ctx, null, 2)}

What-if analysis (target: $${(monthlyTarget || ctx.aggregate.netRevenue).toString()}/mo):
${JSON.stringify(whatIf.suggestions?.slice(0, 2) ?? [], null, 2)}

Generate exactly 3 insights — one of each type: "weekly_summary", "price_suggestion", "schedule_suggestion".

For weekly_summary: Synthesize their performance — what's working, what's not, key number to focus on.
For price_suggestion: Using their actual rates + what-if data, give a specific price recommendation with reasoning. Include the exact $ increase and why it's feasible given their data.
For schedule_suggestion: Using heatmap data (if available) or transaction timing patterns, recommend specific days/hours to prioritize high-value work.

Constraints:
- Every "action" must be a single sentence starting with a verb
- "metric" must be a short value string like "$95/hr" or "+22%" or "Tue 10am"
- "confidence": "high" if grounded in ≥5 data points, "medium" if ≥2, "low" if inferred
- "cta_href" must be one of: /dashboard, /pricing, /timer, /heatmap, /import, /benchmark`

  try {
    const { object } = await generateObject({
      model: gateway('anthropic/claude-haiku-4-5'),
      schema: z.object({ insights: z.array(InsightSchema) }),
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 1200,
    })

    // Filter by requested type
    const filtered = insightType === 'all'
      ? object.insights
      : object.insights.filter(i => i.type === insightType)

    // Fire PostHog event
    captureServerEvent(user.id, 'insights_viewed', {
      insight_type: insightType,
      insight_count: filtered.length,
      data_quality: dataQuality,
      is_ai_generated: true,
      funnel: 'activation',
      funnel_step: 6,
    }).catch(() => {})

    // Persist to recommendations for rate limiting tracking + caching
    supabase.from('recommendations').insert({
      user_id: user.id,
      insight_type: insightType,
      payload: JSON.stringify(filtered),
      generated_at: new Date().toISOString(),
    }).then(() => {}).catch(() => {})

    return NextResponse.json({
      insights: filtered,
      data_quality: dataQuality,
      generated_at: new Date().toISOString(),
      fallback: false,
    })
  } catch (aiError) {
    // AI gateway error — fall back to deterministic
    console.error('AI gateway error:', aiError)
    const insights = deterministicInsights(
      netRevenue, trueHourlyRate, billableHours,
      roi.aggregate.topStream, monthlyTarget, txCount
    )
    return NextResponse.json({
      insights,
      data_quality: dataQuality,
      generated_at: new Date().toISOString(),
      fallback: true,
      fallback_reason: 'ai_unavailable',
    })
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({
    endpoint: '/api/ai/insights',
    description: 'AI-powered insights: weekly_summary, price_suggestion, schedule_suggestion',
    usage: 'POST with { insightType: "all" | "weekly_summary" | "price_suggestion" | "schedule_suggestion", days: 30 }',
    model: 'anthropic/claude-haiku-4-5 via Vercel AI Gateway',
  })
}
