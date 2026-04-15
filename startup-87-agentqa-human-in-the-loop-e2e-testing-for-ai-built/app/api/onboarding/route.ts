import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ONBOARDING_STEPS } from '@/lib/onboarding/steps'

/**
 * GET /api/onboarding
 * Returns the current user's onboarding progress.
 * Response: { steps: { [stepId]: completed_at | null }, completed: number, total: number }
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: rows } = await supabase
    .from('onboarding_progress')
    .select('step, completed_at')
    .eq('user_id', user.id)

  const progress: Record<string, string | null> = {}
  for (const step of ONBOARDING_STEPS) {
    progress[step.id] = null
  }
  for (const row of rows ?? []) {
    if (progress.hasOwnProperty(row.step)) {
      progress[row.step] = row.completed_at
    }
  }

  const completed = Object.values(progress).filter(Boolean).length

  return NextResponse.json({
    steps: progress,
    completed,
    total: ONBOARDING_STEPS.length,
    all_done: completed === ONBOARDING_STEPS.length,
  })
}

/**
 * POST /api/onboarding
 * Mark a step as complete.
 * Body: { step: string }
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { step } = await req.json()
  if (!step || !ONBOARDING_STEPS.find(s => s.id === step)) {
    return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
  }

  const { error } = await supabase
    .from('onboarding_progress')
    .upsert({ user_id: user.id, step, completed_at: new Date().toISOString() })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, step })
}

/**
 * DELETE /api/onboarding
 * Reset all onboarding progress (for testing).
 */
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase.from('onboarding_progress').delete().eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
