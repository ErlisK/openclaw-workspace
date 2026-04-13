/**
 * GET /api/admin/experiments — live results for all experiments
 * PATCH /api/admin/experiments — conclude an experiment / set winner
 */
import { NextRequest, NextResponse } from 'next/server'
import { getExperimentResults } from '@/lib/experiments'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function GET() {
  try {
    const results = await getExperimentResults()

    // CSAT summary (all time)
    const client = sb()
    const { data: csat } = await client
      .from('events')
      .select('properties')
      .eq('event_name', 'csat_submitted')

    const csatCounts = { good: 0, neutral: 0, bad: 0, total: 0 }
    for (const row of csat ?? []) {
      const rating = (row.properties as Record<string, string>)?.rating ?? 'neutral'
      csatCounts[rating as keyof typeof csatCounts] = (csatCounts[rating as keyof typeof csatCounts] || 0) + 1
      csatCounts.total++
    }
    const csatGoodPct = csatCounts.total > 0
      ? Math.round(100 * csatCounts.good / csatCounts.total)
      : null

    // Fake-door pricing summary
    const { data: priceExposures } = await client
      .from('experiment_assignments')
      .select('variant_id')
      .eq('experiment_id', 'upsell_price_v1')

    const { data: priceClicks } = await client
      .from('events')
      .select('session_id, properties')
      .eq('event_name', 'upsell_clicked')

    const priceMap: Record<string, { shown: number; clicked: number }> = {}
    for (const row of priceExposures ?? []) {
      const v = row.variant_id as string
      if (!priceMap[v]) priceMap[v] = { shown: 0, clicked: 0 }
      priceMap[v].shown++
    }
    // Note: click tracking requires joining — simplified here using event properties
    for (const row of priceClicks ?? []) {
      const props = row.properties as Record<string, unknown>
      const v = props?.variant_id as string
      if (v && priceMap[v]) priceMap[v].clicked++
    }

    return NextResponse.json({
      ok: true,
      experiments: results,
      csat: { ...csatCounts, goodPct: csatGoodPct },
      pricingCtr: priceMap,
      generatedAt: new Date().toISOString(),
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as {
      key: string
      status?: string
      winner_variant?: string
      uplift_pct?: number
    }

    const { key, status, winner_variant, uplift_pct } = body
    if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })

    const update: Record<string, unknown> = {}
    if (status)         update.status = status
    if (winner_variant) update.winner_variant = winner_variant
    if (uplift_pct !== undefined) update.uplift_pct = uplift_pct
    if (status === 'concluded' && !update.ended_at) update.ended_at = new Date().toISOString()

    const { error } = await sb().from('experiments').update(update).eq('key', key)
    if (error) throw error

    return NextResponse.json({ ok: true, key, update })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
