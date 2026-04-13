import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'
import { computeTotals } from '@/lib/budget-engine'
import type { BudgetState } from '@/lib/budget-engine'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: member } = await admin.from('organization_members').select('organization_id').eq('user_id', user.id).single()
    if (!member) return NextResponse.json({ error: 'No organization' }, { status: 400 })
    const orgId = member.organization_id

    const body = await req.json() as { state: BudgetState; budget_id?: string }
    const { state, budget_id } = body
    if (!state?.application_id) return NextResponse.json({ error: 'application_id required' }, { status: 400 })

    const totals = computeTotals(state)

    const payload = {
      application_id: state.application_id,
      organization_id: orgId,
      version: (state.version || 0) + 1,
      total_direct_usd: totals.total_direct,
      total_indirect_usd: totals.indirect_amount,
      total_usd: totals.grand_total,
      indirect_rate_pct: state.indirect_rate_pct,
      indirect_method: state.indirect_method,
      period_months: state.period_months * state.periods,
      line_items: state.line_items,
      assumptions: { periods: state.periods, period_months: state.period_months, indirect_base_custom: state.indirect_base_custom },
      updated_at: new Date().toISOString(),
    }

    let savedId = budget_id
    if (budget_id) {
      await admin.from('budgets').update(payload).eq('id', budget_id)
    } else {
      const { data } = await admin.from('budgets').insert({ ...payload, created_at: new Date().toISOString() }).select('id').single()
      savedId = data?.id
    }

    // Update application ask amount
    await admin.from('grant_applications').update({ ask_amount_usd: totals.grand_total }).eq('id', state.application_id)

    // Audit log
    await admin.from('audit_log').insert({
      organization_id: orgId, user_id: user.id,
      event_type: 'budget_edit', table_name: 'budgets', record_id: savedId,
      metadata: { total: totals.grand_total, line_items_count: state.line_items.length, indirect_rate: state.indirect_rate_pct },
    })

    return NextResponse.json({ id: savedId, totals, version: (state.version || 0) + 1 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
