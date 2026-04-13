import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

/**
 * POST /api/survey/pmf
 * Submit PMF survey. Auth-required (designer).
 * Body: {
 *   disappointment: 'very_disappointed' | 'somewhat_disappointed' | 'not_disappointed'
 *   main_benefit?: string
 *   benefit_to?: string
 *   improvement?: string
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { disappointment, main_benefit, benefit_to, improvement } = await request.json().catch(() => ({}))

  const valid = ['very_disappointed', 'somewhat_disappointed', 'not_disappointed']
  if (!valid.includes(disappointment)) {
    return NextResponse.json({ error: 'Invalid disappointment value' }, { status: 400 })
  }

  const svc = createServiceClient()
  const { data: profile } = await svc.from('designer_profiles').select('id').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Designer profile not found' }, { status: 404 })

  const { data: existing } = await svc
    .from('pmf_responses')
    .select('id')
    .eq('designer_id', profile.id)
    .eq('survey_version', '1.0')
    .single()

  if (existing) return NextResponse.json({ ok: true, message: 'Already submitted' })

  const { error } = await svc.from('pmf_responses').insert({
    designer_id: profile.id,
    disappointment,
    main_benefit: main_benefit ?? null,
    benefit_to: benefit_to ?? null,
    improvement: improvement ?? null,
    survey_version: '1.0',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

/**
 * GET /api/survey/pmf — check submission status
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ submitted: false })

  const svc = createServiceClient()
  const { data: profile } = await svc.from('designer_profiles').select('id').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ submitted: false })

  const { data: existing } = await svc.from('pmf_responses').select('id, disappointment').eq('designer_id', profile.id).single()
  return NextResponse.json({ submitted: !!existing, disappointment: existing?.disappointment ?? null })
}
