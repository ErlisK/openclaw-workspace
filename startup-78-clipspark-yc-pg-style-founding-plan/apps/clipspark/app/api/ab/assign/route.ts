import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { assignVariant } from '@/lib/ab-engine'

/**
 * POST /api/ab/assign
 * 
 * Assigns a user to a variant for one or more experiments.
 * Uses deterministic hash assignment — same user always gets same variant.
 * 
 * Body: { experiment_names?: string[], experiment_types?: string[], clip_id?: string }
 * Returns: { assignments: Record<experimentName, { variant_id, variant_name, config }> }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { experiment_names, experiment_types, clip_id } = body

  const svc = createServiceClient()

  // Load running experiments
  let query = svc
    .from('ab_experiments')
    .select('*')
    .eq('status', 'running')

  if (experiment_names?.length) {
    query = query.in('name', experiment_names)
  } else if (experiment_types?.length) {
    query = query.in('experiment_type', experiment_types)
  }

  const { data: experiments, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const assignments: Record<string, {
    variant_id: string
    variant_name: string
    config: Record<string, unknown>
    experiment_id: string
    is_control: boolean
  }> = {}

  for (const exp of (experiments || [])) {
    const { data: variants } = await svc
      .from('ab_variants')
      .select('*')
      .eq('experiment_id', exp.id)
      .order('is_control', { ascending: false })

    if (!variants?.length) continue

    const assigned = assignVariant(user.id, exp, variants)
    if (!assigned) continue

    // Store/upsert assignment
    await svc.from('ab_assignments').upsert({
      experiment_id: exp.id,
      variant_id: assigned.id,
      user_id: user.id,
      clip_id: clip_id || null,
      context: { experiment_name: exp.name, experiment_type: exp.experiment_type },
    }, { onConflict: 'experiment_id,user_id' })

    // Record impression
    await svc.from('ab_events').insert({
      experiment_id: exp.id,
      variant_id: assigned.id,
      user_id: user.id,
      clip_id: clip_id || null,
      event_type: 'impression',
    })

    // Increment impressions counter
    await svc.from('ab_variants').update({
      impressions: assigned.impressions + 1,
    }).eq('id', assigned.id)

    assignments[exp.name] = {
      variant_id: assigned.id,
      variant_name: assigned.name,
      config: assigned.config,
      experiment_id: exp.id,
      is_control: assigned.is_control,
    }
  }

  return NextResponse.json({ assignments, user_id: user.id })
}

/**
 * GET /api/ab/assign?experiment_name=hook-style-v1
 * Returns existing assignment for a user (no new assignment created)
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const experimentName = searchParams.get('experiment_name')
  if (!experimentName) return NextResponse.json({ error: 'experiment_name required' }, { status: 400 })

  const svc = createServiceClient()

  const { data: experiment } = await svc
    .from('ab_experiments')
    .select('id')
    .eq('name', experimentName)
    .single()

  if (!experiment) return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })

  const { data: assignment } = await svc
    .from('ab_assignments')
    .select('variant_id, ab_variants(id, name, config, is_control)')
    .eq('experiment_id', experiment.id)
    .eq('user_id', user.id)
    .single()

  if (!assignment) return NextResponse.json({ assigned: false })

  return NextResponse.json({
    assigned: true,
    variant_id: assignment.variant_id,
    variant: assignment.ab_variants,
  })
}
