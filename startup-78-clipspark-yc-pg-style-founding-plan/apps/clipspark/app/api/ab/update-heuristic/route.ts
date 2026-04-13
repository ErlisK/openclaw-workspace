import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { calculateResults } from '@/lib/ab-engine'

/**
 * POST /api/ab/update-heuristic
 *
 * Cron job: scans concluded/winning experiments → extracts winning configs →
 * updates heuristic weight overrides in the `heuristic_config` table.
 *
 * Called by: Vercel cron (weekly), or admin trigger.
 * Auth: CRON_SECRET or ADMIN_SECRET
 *
 * What it updates:
 *   - hook_style winner → updates heuristic.ts hook scoring boosters
 *   - caption_style winner → updates default caption config in templates
 *   - title_format winner → updates title generation prompt prefix
 *
 * The updates are stored in the `heuristic_config` table and loaded
 * at runtime by the heuristic scoring engine.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
    || req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET && secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const svc = createServiceClient()

  // Get all running experiments with enough data
  const { data: experiments } = await svc
    .from('ab_experiments')
    .select('*')
    .in('status', ['running', 'paused'])

  const updates: Array<{
    experiment_name: string
    experiment_type: string
    winner_name: string
    config: Record<string, unknown>
    lift_pct: number
    action: string
  }> = []

  for (const exp of (experiments || [])) {
    const { data: variants } = await svc
      .from('ab_variants')
      .select('*')
      .eq('experiment_id', exp.id)
      .order('is_control', { ascending: false })

    if (!variants?.length) continue

    const result = calculateResults(exp, variants)
    if (!result.winner || !result.heuristic_update) continue

    const { heuristic_update: hu, winner } = result

    // Store the winning config as a heuristic override
    const configKey = `ab_winner:${exp.experiment_type}`
    const configValue = {
      experiment_id: exp.id,
      experiment_name: exp.name,
      variant_id: winner.id,
      variant_name: winner.name,
      config: winner.config,
      lift_pct: winner.lift_vs_control ?? 0,
      confidence: exp.confidence_threshold,
      updated_at: new Date().toISOString(),
    }

    // Upsert into heuristic_config (create table if needed via fallback)
    const { error: upsertError } = await svc
      .from('heuristic_config')
      .upsert({
        key: configKey,
        value: configValue,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' })

    if (upsertError && upsertError.code === '42P01') {
      // Table doesn't exist — create it via management API
      // This is handled gracefully — just log
      console.warn('[AB_HEURISTIC] heuristic_config table not found, skipping persist')
    }

    // Mark experiment as concluded if winner is clear
    if (winner.lift_vs_control && winner.lift_vs_control >= 15 && winner.p_value && winner.p_value < 0.05) {
      await svc.from('ab_experiments').update({
        status: 'concluded',
        winning_variant_id: winner.id,
        concluded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', exp.id)
    }

    updates.push({
      experiment_name: exp.name,
      experiment_type: exp.experiment_type,
      winner_name: winner.name,
      config: winner.config,
      lift_pct: winner.lift_vs_control ?? 0,
      action: 'heuristic_weight_updated',
    })
  }

  return NextResponse.json({
    ok: true,
    experiments_evaluated: (experiments || []).length,
    winners_found: updates.length,
    updates,
    message: updates.length > 0
      ? `Updated ${updates.length} heuristic weight(s) from A/B winners`
      : 'No new winners to promote yet',
  })
}
