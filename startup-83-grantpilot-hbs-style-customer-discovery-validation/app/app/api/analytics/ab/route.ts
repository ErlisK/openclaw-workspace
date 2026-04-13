import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'

/**
 * GET /api/analytics/ab?experiment=hero_headline&session_id=xxx
 * Returns the variant for the current user/session.
 * Assignment is deterministic (stored in ab_assignments).
 */
export async function GET(req: NextRequest) {
  const experimentKey = req.nextUrl.searchParams.get('experiment')
  const sessionId = req.nextUrl.searchParams.get('session_id')

  if (!experimentKey) return NextResponse.json({ error: 'experiment required' }, { status: 400 })

  const admin = createAdminClient()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Check existing assignment
  const assignQuery = user
    ? admin.from('ab_assignments').select('variant').eq('experiment_key', experimentKey).eq('user_id', user.id).maybeSingle()
    : sessionId
      ? admin.from('ab_assignments').select('variant').eq('experiment_key', experimentKey).eq('session_id', sessionId).maybeSingle()
      : Promise.resolve({ data: null, error: null })

  const { data: existing } = await assignQuery

  if (existing?.variant) {
    return NextResponse.json({ variant: existing.variant, existing: true })
  }

  // Fetch experiment config
  const { data: exp } = await admin.from('ab_experiments').select('*').eq('experiment_key', experimentKey).eq('is_active', true).single()
  if (!exp) return NextResponse.json({ variant: 'control', reason: 'experiment_not_found' })

  const variants = exp.variants as string[]
  const weights = exp.weights as number[]

  // Assign variant based on weighted random
  const rand = Math.random()
  let cumulative = 0
  let assignedVariant = variants[0]
  for (let i = 0; i < variants.length; i++) {
    cumulative += weights[i] || (1 / variants.length)
    if (rand < cumulative) {
      assignedVariant = variants[i]
      break
    }
  }

  // Save assignment
  await admin.from('ab_assignments').insert({
    experiment_key: experimentKey,
    user_id: user?.id ?? null,
    session_id: sessionId,
    variant: assignedVariant,
  }).catch(() => {}) // ok if duplicate

  // Track assignment event
  await admin.from('analytics_events').insert({
    user_id: user?.id ?? null,
    session_id: sessionId,
    event_name: 'ab_variant_assigned',
    properties: { experiment: experimentKey, variant: assignedVariant },
    ab_variant: assignedVariant,
  }).catch(() => {})

  return NextResponse.json({ variant: assignedVariant, existing: false })
}
