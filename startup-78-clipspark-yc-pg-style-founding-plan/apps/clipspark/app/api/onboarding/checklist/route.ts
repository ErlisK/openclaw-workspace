import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { STEP_IDS } from '@/lib/onboarding'
import { trackServer } from '@/lib/analytics'

// GET /api/onboarding/checklist — fetch user's checklist state
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: rows } = await supabase
    .from('onboarding_checklist')
    .select('step, completed_at, skipped_at')
    .eq('user_id', user.id)

  const completedSteps = new Set((rows || []).filter(r => r.completed_at).map(r => r.step))
  const skippedSteps = new Set((rows || []).filter(r => r.skipped_at).map(r => r.step))

  const completionPct = Math.round((completedSteps.size / STEP_IDS.length) * 100)

  return NextResponse.json({
    steps: STEP_IDS.map(id => ({
      id,
      completed: completedSteps.has(id),
      skipped: skippedSteps.has(id),
    })),
    completed_count: completedSteps.size,
    total_steps: STEP_IDS.length,
    completion_pct: completionPct,
    all_done: completedSteps.size >= STEP_IDS.length,
  })
}

// POST /api/onboarding/checklist — mark a step completed or skipped
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { step, action } = await request.json()
  if (!step || !STEP_IDS.includes(step)) {
    return NextResponse.json({ error: `Unknown step: ${step}` }, { status: 400 })
  }
  if (!['complete', 'skip'].includes(action)) {
    return NextResponse.json({ error: 'action must be complete or skip' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const upsertData = action === 'complete'
    ? { user_id: user.id, step, completed_at: now }
    : { user_id: user.id, step, skipped_at: now }

  const { error } = await supabase
    .from('onboarding_checklist')
    .upsert(upsertData, { onConflict: 'user_id,step' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fire analytics
  trackServer(user.id, action === 'complete' ? 'checklist_step_completed' : 'checklist_step_skipped', {
    step,
  })

  // Check if all core steps are done (first 4) — trigger activation event
  const { data: rows } = await supabase
    .from('onboarding_checklist')
    .select('step, completed_at')
    .eq('user_id', user.id)

  const completed = new Set((rows || []).filter(r => r.completed_at).map(r => r.step))
  const coreSteps = ['upload_first', 'preview_clip', 'approve_captions', 'publish_clip']
  const coreCompleted = coreSteps.filter(s => completed.has(s)).length

  if (coreCompleted === coreSteps.length && action === 'complete') {
    trackServer(user.id, 'onboarding_core_complete', {
      steps_completed: completed.size,
      total_steps: STEP_IDS.length,
    })

    // Mark user as activated in users table
    const svc = createServiceClient()
    await svc.from('users').update({ onboarding_done: true }).eq('id', user.id)
  }

  return NextResponse.json({
    step,
    action,
    completed_count: completed.size,
    activation_complete: coreCompleted === coreSteps.length,
  })
}
