import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

/**
 * POST /api/survey/nps
 * Submit NPS survey. Auth-required (designer).
 * Body: { score: number (0–10), reason?: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { score, reason } = await request.json().catch(() => ({}))

  if (typeof score !== 'number' || score < 0 || score > 10) {
    return NextResponse.json({ error: 'score must be 0–10' }, { status: 400 })
  }

  const svc = createServiceClient()

  // Get designer profile
  const { data: profile } = await svc
    .from('designer_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Designer profile not found' }, { status: 404 })

  // Prevent duplicate (one NPS per designer per survey version)
  const { data: existing } = await svc
    .from('nps_responses')
    .select('id')
    .eq('designer_id', profile.id)
    .eq('survey_version', '1.0')
    .single()

  if (existing) {
    return NextResponse.json({ ok: true, message: 'Already submitted' })
  }

  const { error } = await svc.from('nps_responses').insert({
    designer_id: profile.id,
    nps_score: score,
    reason: reason ?? null,
    survey_version: '1.0',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

/**
 * GET /api/survey/nps
 * Check if current designer has already submitted NPS.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ submitted: false })

  const svc = createServiceClient()
  const { data: profile } = await svc.from('designer_profiles').select('id').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ submitted: false })

  const { data: existing } = await svc.from('nps_responses').select('id, nps_score').eq('designer_id', profile.id).single()
  return NextResponse.json({ submitted: !!existing, score: existing?.nps_score ?? null })
}
