import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

/**
 * POST /api/test-runs
 * Create a test run for a session (links session + template + rule version).
 * 
 * PATCH /api/test-runs — update status and computed metrics.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { session_id, template_id, rule_version_id, facilitator_notes } = await request.json()

  if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 })

  // Verify session ownership
  const { data: session } = await supabase
    .from('playtest_sessions')
    .select('id, rule_version_id')
    .eq('id', session_id)
    .eq('designer_id', user.id)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const { data, error } = await supabase.from('test_runs').insert({
    session_id,
    template_id: template_id ?? null,
    rule_version_id: rule_version_id ?? session.rule_version_id ?? null,
    designer_id: user.id,
    status: 'pending',
    facilitator_notes: facilitator_notes ?? null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, test_run: data })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, status, facilitator_notes, ...metrics } = body

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // If completing a run, compute metrics from live data
  let computedMetrics: Record<string, any> = {}
  if (status === 'completed') {
    const svc = createServiceClient()

    // Get the run to find session_id
    const { data: run } = await supabase
      .from('test_runs')
      .select('session_id')
      .eq('id', id)
      .eq('designer_id', user.id)
      .single()

    if (run) {
      const { data: signups } = await svc
        .from('session_signups')
        .select('id, status')
        .eq('session_id', run.session_id)

      const { data: feedback } = await svc
        .from('session_feedback')
        .select('overall_rating, clarity_rating, fun_rating')
        .eq('session_id', run.session_id)

      const total = signups?.length ?? 0
      const attended = signups?.filter((s: any) => s.status === 'attended').length ?? 0
      const fbCount = feedback?.length ?? 0

      const avgRating = (field: string) => {
        const vals = (feedback ?? []).map((f: any) => f[field]).filter((v: any) => v != null)
        return vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null
      }

      computedMetrics = {
        tester_count: total,
        attended_count: attended,
        feedback_count: fbCount,
        avg_overall_rating: avgRating('overall_rating'),
        avg_clarity_rating: avgRating('clarity_rating'),
        avg_fun_rating: avgRating('fun_rating'),
        show_up_rate: total > 0 ? (attended / total) * 100 : 0,
        survey_completion_rate: attended > 0 ? (fbCount / attended) * 100 : 0,
        ended_at: new Date().toISOString(),
      }
    }
  }

  const patch: Record<string, any> = {
    ...(status && { status }),
    ...(status === 'running' && { started_at: new Date().toISOString() }),
    ...(facilitator_notes !== undefined && { facilitator_notes }),
    ...computedMetrics,
  }

  const { data, error } = await supabase
    .from('test_runs')
    .update(patch)
    .eq('id', id)
    .eq('designer_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, test_run: data })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')

  let query = supabase
    .from('test_runs')
    .select('*, session_templates(name), rule_versions(version_label)')
    .eq('designer_id', user.id)
    .order('created_at', { ascending: false })

  if (sessionId) query = query.eq('session_id', sessionId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ test_runs: data ?? [] })
}
