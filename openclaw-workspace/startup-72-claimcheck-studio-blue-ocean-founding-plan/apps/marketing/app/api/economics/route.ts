export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { UNIT_ECONOMICS } from '@/lib/config'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('cc_unit_economics')
    .upsert({
      period: body.period,
      mrr: body.mrr || 0,
      arr: (body.mrr || 0) * 12,
      new_mrr: body.newMrr || 0,
      churned_mrr: body.churnedMrr || 0,
      expansion_mrr: body.expansionMrr || 0,
      active_customers: body.activeCustomers || 0,
      trials: body.trials || 0,
      trial_to_paid_rate: body.trialToPaidRate || 0,
      avg_revenue_per_user: body.activeCustomers > 0 ? (body.mrr / body.activeCustomers) : 0,
      cac: body.cac || 0,
      ltv: body.ltv || 0,
      ltv_cac_ratio: body.cac > 0 ? (body.ltv / body.cac) : 0,
      gross_margin: body.grossMargin || 0,
      notes: body.notes || null,
    }, { onConflict: 'period' })
    .select('period')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ upserted: true, period: data.period })
}

export async function GET() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('cc_unit_economics')
    .select('*')
    .order('period')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const latest = data?.[data.length - 1]
  const targets = UNIT_ECONOMICS

  return NextResponse.json({
    history: data || [],
    latest: latest || null,
    targets,
    health: latest ? {
      ltvCacOk:      latest.ltv_cac_ratio >= targets.targetLTVCACRatio,
      marginOk:      latest.gross_margin >= targets.targetGrossMargin,
      conversionOk:  latest.trial_to_paid_rate >= targets.targetTrialConversion,
      cacBelowTarget:latest.cac <= targets.targetCAC,
    } : null,
  })
}
