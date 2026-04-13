import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { ABEventType } from '@/lib/ab-engine'

/**
 * POST /api/ab/record
 *
 * Record A/B experiment events: impressions, exports, publishes, view/completion reports.
 * Increments variant counters + running averages.
 *
 * Body:
 *   { experiment_name: string, event_type: ABEventType, value?: number,
 *     clip_id?: string, metadata?: object }
 *
 * Or batch:
 *   { events: Array<{ experiment_name, event_type, value?, clip_id?, metadata? }> }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const svc = createServiceClient()

  // Normalize to array
  const events: Array<{
    experiment_name: string
    event_type: ABEventType
    value?: number
    clip_id?: string
    metadata?: Record<string, unknown>
  }> = body.events ?? [body]

  if (!events.length) return NextResponse.json({ error: 'No events provided' }, { status: 400 })

  const results = []

  for (const event of events) {
    const { experiment_name, event_type, value, clip_id, metadata } = event

    if (!experiment_name || !event_type) {
      results.push({ ok: false, error: 'experiment_name and event_type required' })
      continue
    }

    // Look up experiment
    const { data: experiment } = await svc
      .from('ab_experiments')
      .select('id, status')
      .eq('name', experiment_name)
      .single()

    if (!experiment || experiment.status === 'concluded') {
      results.push({ ok: false, error: `Experiment ${experiment_name} not found or concluded` })
      continue
    }

    // Look up user's assignment
    const { data: assignment } = await svc
      .from('ab_assignments')
      .select('variant_id')
      .eq('experiment_id', experiment.id)
      .eq('user_id', user.id)
      .single()

    if (!assignment) {
      results.push({ ok: false, error: `No assignment for ${experiment_name}` })
      continue
    }

    // Record event
    await svc.from('ab_events').insert({
      experiment_id: experiment.id,
      variant_id: assignment.variant_id,
      user_id: user.id,
      clip_id: clip_id || null,
      event_type,
      value: value ?? null,
      metadata: metadata ?? null,
    })

    // Update variant counters based on event type
    const { data: variant } = await svc
      .from('ab_variants')
      .select('conversions, impressions, total_views, avg_views, avg_completion_rate')
      .eq('id', assignment.variant_id)
      .single()

    if (variant) {
      const updates: Record<string, number> = {}

      if (event_type === 'export' || event_type === 'publish') {
        // Count as conversion
        updates.conversions = variant.conversions + 1
      }

      if (event_type === 'view_reported' && value !== undefined) {
        // Running average for views
        const newN = variant.conversions + 1
        const newAvg = variant.avg_views + (value - variant.avg_views) / newN
        updates.total_views = (variant.total_views || 0) + value
        updates.avg_views = newAvg
      }

      if (event_type === 'completion_reported' && value !== undefined) {
        // Running average for completion rate (Welford's online algorithm)
        const n = variant.impressions || 1
        const delta = value - variant.avg_completion_rate
        updates.avg_completion_rate = variant.avg_completion_rate + delta / n
      }

      if (Object.keys(updates).length > 0) {
        await svc.from('ab_variants').update(updates).eq('id', assignment.variant_id)
      }
    }

    results.push({ ok: true, experiment_name, event_type, variant_id: assignment.variant_id })
  }

  const allOk = results.every(r => r.ok)
  return NextResponse.json({ ok: allOk, results })
}
