import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { runFraudScoring } from '@/lib/fraud'
import { isAdmin } from '@/lib/admin'

/**
 * POST /api/fraud/score
 * Trigger full fraud scoring run. Auth-required (admin/designer).
 * Returns summary of scored sessions.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const result = await runFraudScoring()

  return NextResponse.json({
    ok: true,
    ...result,
    scoredAt: new Date().toISOString(),
  })
}

/**
 * GET /api/fraud/score
 * Get current fraud summary statistics.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { createServiceClient } = await import('@/lib/supabase-server')
  const svc = createServiceClient()

  const { data: summary } = await svc.from('global_fraud_summary').select('*').single()
  const { data: topFlagged } = await svc
    .from('session_quality_scores')
    .select('signup_id, session_id, quality_score, flag_reasons, flagged, computed_at')
    .eq('flagged', true)
    .order('quality_score', { ascending: true })
    .limit(20)

  return NextResponse.json({ summary, topFlagged: topFlagged ?? [] })
}
