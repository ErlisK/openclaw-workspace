/**
 * GET  /api/onboarding          — fetch all steps + completion status for current user
 * POST /api/onboarding          — mark a step complete/skipped { step, action: 'complete'|'skip'|'reset' }
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

const STEPS = [
  { key: 'connect_source', label: 'Connect your store or import a CSV', href: '/settings/connections' },
  { key: 'run_engine',     label: 'Run the pricing engine on your data', href: '/suggestions' },
  { key: 'create_experiment', label: 'Create your first A/B experiment', href: '/experiments' },
  { key: 'preview_rollback',  label: 'Preview your experiment & set a rollback', href: '/experiments' },
  { key: 'upgrade_pro',       label: 'Upgrade to Pro for AI tools & exports', href: '/pricing', optional: true },
]

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: rows } = await supabase
    .from('onboarding_progress')
    .select('*')
    .eq('user_id', user.id)

  const progress = rows ?? []

  const steps = STEPS.map(s => {
    const row = progress.find(r => r.step === s.key)
    return {
      ...s,
      completed: !!row?.completed_at,
      skipped: !!row?.skipped_at,
      completed_at: row?.completed_at ?? null,
    }
  })

  const completedCount = steps.filter(s => s.completed || s.skipped).length
  const totalRequired = STEPS.filter(s => !s.optional).length
  const done = steps.filter(s => !s.optional).every(s => s.completed || s.skipped)

  return NextResponse.json({ steps, completedCount, total: STEPS.length, totalRequired, done })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { step, action = 'complete', meta = {} } = body

  if (!step || !STEPS.find(s => s.key === step)) {
    return NextResponse.json({ error: `Unknown step: ${step}` }, { status: 400 })
  }

  const now = new Date().toISOString()
  const upsertData = {
    user_id: user.id,
    step,
    completed_at: action === 'complete' ? now : null,
    skipped_at: action === 'skip' ? now : null,
    meta,
  }

  if (action === 'reset') {
    await supabase.from('onboarding_progress').delete()
      .eq('user_id', user.id).eq('step', step)
    return NextResponse.json({ step, action: 'reset' })
  }

  const { error: upsertErr } = await supabase
    .from('onboarding_progress')
    .upsert(upsertData, { onConflict: 'user_id,step' })

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })

  return NextResponse.json({ step, action, done: action === 'complete' })
}
