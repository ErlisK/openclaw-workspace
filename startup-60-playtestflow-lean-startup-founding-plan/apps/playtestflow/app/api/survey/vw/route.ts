import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

/**
 * POST /api/survey/vw
 * Submit Van Westendorp price sensitivity survey.
 * Auth-required; one response per user per survey_version (idempotent).
 *
 * Body: {
 *   too_cheap: number,       // "so cheap you'd question quality"
 *   cheap: number,           // "good value / bargain"
 *   expensive: number,       // "starting to feel expensive"
 *   too_expensive: number,   // "would not buy at this price"
 *   annual_interest: 'yes' | 'maybe' | 'no',
 *   annual_price_acceptable?: number,
 *   willingness_to_pay?: string,
 *   ab_variant?: string,
 *   plan_context?: string,
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const {
      too_cheap, cheap, expensive, too_expensive,
      annual_interest, annual_price_acceptable,
      willingness_to_pay, ab_variant, plan_context,
    } = body

    // Validate required price points
    const prices = [too_cheap, cheap, expensive, too_expensive]
    if (prices.some(p => typeof p !== 'number' || p <= 0)) {
      return NextResponse.json({ error: 'All four price points are required and must be positive numbers' }, { status: 400 })
    }
    if (!(too_cheap < cheap && cheap < expensive && expensive < too_expensive)) {
      return NextResponse.json({ error: 'Prices must satisfy: too_cheap < cheap < expensive < too_expensive' }, { status: 400 })
    }
    if (annual_interest && !['yes', 'maybe', 'no'].includes(annual_interest)) {
      return NextResponse.json({ error: 'annual_interest must be yes, maybe, or no' }, { status: 400 })
    }

    const svc = createServiceClient()

    // Idempotency check
    const { data: existing } = await svc
      .from('vw_survey_responses')
      .select('id')
      .eq('user_id', user.id)
      .eq('survey_version', '1.0')
      .single()

    if (existing) {
      return NextResponse.json({ ok: true, message: 'Already submitted' })
    }

    const { error } = await svc.from('vw_survey_responses').insert({
      user_id: user.id,
      plan_context: plan_context ?? 'pro',
      too_cheap,
      cheap,
      expensive,
      too_expensive,
      annual_interest: annual_interest ?? null,
      annual_price_acceptable: annual_price_acceptable ?? null,
      willingness_to_pay: willingness_to_pay ?? null,
      ab_variant: ab_variant ?? null,
      survey_version: '1.0',
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Non-throwing: record A/B conversion if user was in annual discount test
    try {
      if (ab_variant && annual_interest === 'yes') {
        const { data: test } = await svc
          .from('ab_tests')
          .select('id')
          .eq('test_name', 'annual_discount_v1')
          .single()

        if (test) {
          await svc.from('ab_assignments')
            .update({ converted: true, converted_at: new Date().toISOString() })
            .eq('test_id', test.id)
            .eq('designer_id', user.id)
        }
      }
    } catch {}

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Survey submission failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET /api/survey/vw
 * Check submission status + get annual A/B variant for current user.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ submitted: false, variant: null })

    const svc = createServiceClient()

    const [surveyCheck, testRow] = await Promise.all([
      svc.from('vw_survey_responses').select('id, annual_interest').eq('user_id', user.id).single(),
      svc.from('ab_tests').select('id').eq('test_name', 'annual_discount_v1').single(),
    ])

    // Assign or get A/B variant for annual discount test
    let variant: 'A' | 'B' | null = null
    if (testRow.data) {
      const { data: assignment } = await svc
        .from('ab_assignments')
        .select('variant')
        .eq('test_id', testRow.data.id)
        .eq('designer_id', user.id)
        .single()

      if (assignment) {
        variant = assignment.variant as 'A' | 'B'
      } else {
        // Assign deterministically by user_id hash
        const hash = user.id.charCodeAt(0) + user.id.charCodeAt(1)
        variant = hash % 2 === 0 ? 'A' : 'B'
        // Record assignment (non-throwing)
        try {
          await svc.from('ab_assignments').insert({
            test_id: testRow.data.id,
            designer_id: user.id,
            visitor_id: user.id,
            variant,
            converted: false,
          })
        } catch {}
      }
    }

    return NextResponse.json({
      submitted: !!surveyCheck.data,
      annual_interest: surveyCheck.data?.annual_interest ?? null,
      variant,
      // Annual pricing based on variant: A=20% off, B=30% off
      annual_price: variant === 'B' ? 27.30 : 31.20,
      annual_savings_pct: variant === 'B' ? 30 : 20,
    })
  } catch {
    return NextResponse.json({ submitted: false, variant: null })
  }
}
