import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { trackActivation, getActivationStatus, type ActivationStep } from '@/lib/activation'

const VALID_STEPS: ActivationStep[] = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6']

/**
 * POST /api/activation
 * Track a designer activation event from client-side code.
 * 
 * Body: { step: 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6', session_id?, project_id?, metadata? }
 * Auth: designer session required
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { step, session_id, project_id, metadata } = body

  if (!step || !VALID_STEPS.includes(step)) {
    return NextResponse.json(
      { error: `step must be one of: ${VALID_STEPS.join(', ')}` },
      { status: 400 }
    )
  }

  await trackActivation({
    designerId: user.id,
    step: step as ActivationStep,
    sessionId: session_id,
    projectId: project_id,
    metadata: metadata ?? {},
  })

  return NextResponse.json({ ok: true, step, designer_id: user.id })
}

/**
 * GET /api/activation
 * Return current activation status for the authenticated designer.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = await getActivationStatus(user.id)
  const completed = Object.entries(status).filter(([, v]) => v !== null).map(([k]) => k)

  return NextResponse.json({
    designer_id: user.id,
    steps: status,
    completed_count: completed.length,
    completed_steps: completed,
    next_step: (['A1', 'A2', 'A3', 'A4', 'A5', 'A6'] as ActivationStep[]).find(s => !status[s]) ?? null,
  })
}
