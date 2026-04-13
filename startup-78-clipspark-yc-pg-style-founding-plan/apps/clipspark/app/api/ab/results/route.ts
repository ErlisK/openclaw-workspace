import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { calculateResults } from '@/lib/ab-engine'

/**
 * GET /api/ab/results
 *
 * Returns experiment results with statistical significance analysis.
 * Params: ?name=hook-style-v1 OR ?type=hook_style OR (all running)
 * Requires: x-admin-secret header or ?secret= param for detailed results
 * Public mode: returns summary stats only (no p-values)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const name = searchParams.get('name')
  const type = searchParams.get('type')
  const secret = req.headers.get('x-admin-secret') || searchParams.get('secret')
  const isAdmin = secret === process.env.ADMIN_SECRET || secret === process.env.CRON_SECRET
  const showAll = searchParams.get('all') === '1'

  const svc = createServiceClient()

  let query = svc
    .from('ab_experiments')
    .select('*')

  if (name) {
    query = query.eq('name', name)
  } else if (type) {
    query = query.eq('experiment_type', type)
  } else if (!showAll) {
    query = query.in('status', ['running', 'paused'])
  }

  const { data: experiments, error } = await query.order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results = []
  for (const exp of (experiments || [])) {
    const { data: variants } = await svc
      .from('ab_variants')
      .select('*')
      .eq('experiment_id', exp.id)
      .order('is_control', { ascending: false })

    if (!variants?.length) continue

    const result = calculateResults(exp, variants)

    // Public mode: strip statistical details
    if (!isAdmin) {
      results.push({
        id: exp.id,
        name: exp.name,
        experiment_type: exp.experiment_type,
        status: exp.status,
        total_impressions: variants.reduce((s, v) => s + v.impressions, 0),
        variant_count: variants.length,
        is_significant: result.is_significant,
        recommendation_summary: result.is_significant
          ? `Winner found: ${result.winner?.name}`
          : 'Still collecting data',
      })
    } else {
      results.push(result)
    }
  }

  return NextResponse.json({ results, count: results.length })
}
