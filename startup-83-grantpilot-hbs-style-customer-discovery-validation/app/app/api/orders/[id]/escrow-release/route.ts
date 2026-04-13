import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'

/**
 * POST /api/orders/[id]/escrow-release
 *
 * Marks an order's escrow as released and marks it complete.
 * Can be called:
 *   - Automatically: by the QA route (qa_passed) and export route (export_generated)
 *     when both conditions are satisfied
 *   - Manually: by the buyer/admin to force-release
 *
 * Body: { source: 'qa' | 'export' | 'manual', note?: string }
 *
 * Auto-release fires when BOTH qa_passed AND export_generated are true.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const body = await req.json().catch(() => ({}))
    const source: string = body.source || 'manual'
    const note: string = body.note || ''

    // Fetch current order
    const { data: order, error: fetchErr } = await admin
      .from('orders')
      .select('id, status, escrow_status, escrow_conditions, price_usd, organization_id, provider_id, user_id, deliverables, status_history')
      .eq('id', id)
      .single()

    if (fetchErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.escrow_status === 'released') {
      return NextResponse.json({ released: true, already: true, order })
    }

    // Merge condition update
    const conditions: Record<string, boolean> = {
      qa_passed: false,
      export_generated: false,
      ...(order.escrow_conditions as Record<string, boolean> || {}),
    }

    if (source === 'qa') conditions.qa_passed = true
    if (source === 'export') conditions.export_generated = true
    if (source === 'manual') {
      conditions.qa_passed = true
      conditions.export_generated = true
    }

    const bothMet = conditions.qa_passed && conditions.export_generated
    const now = new Date().toISOString()

    // Update deliverables if QA or export just completed
    const deliverables = (order.deliverables as Array<{ key: string; label: string; status: string }> || []).map(d => {
      if (source === 'qa' && d.key === 'qa') return { ...d, status: 'complete' }
      if (source === 'export' && d.key === 'export') return { ...d, status: 'complete' }
      return d
    })

    const history = (order.status_history as unknown[] || [])

    if (source === 'qa' && !conditions.export_generated) {
      // QA passed but export not yet — move order to qa_review step
      history.push({
        status: 'qa_review',
        step: 'qa',
        timestamp: now,
        note: note || 'QA passed. Awaiting export generation to release escrow.',
        actor: 'system',
      })
      await admin.from('orders').update({
        escrow_conditions: conditions,
        status: 'qa_review',
        current_step: 'export',
        progress_pct: 80,
        deliverables,
        status_history: history,
        updated_at: now,
      }).eq('id', id)

      await admin.from('audit_log').insert({
        organization_id: order.organization_id,
        user_id: user.id,
        event_type: 'escrow_condition_met',
        table_name: 'orders',
        record_id: id,
        new_value: { source, conditions },
      }).catch(() => {})

      return NextResponse.json({ released: false, conditions, message: 'QA condition met. Export required to release escrow.' })
    }

    if (!bothMet) {
      // Just update conditions + deliverables, no release yet
      await admin.from('orders').update({
        escrow_conditions: conditions,
        deliverables,
        updated_at: now,
      }).eq('id', id)

      return NextResponse.json({ released: false, conditions, message: 'Condition recorded. Both QA and export required for escrow release.' })
    }

    // Both conditions met — RELEASE ESCROW + complete order
    history.push({
      status: 'complete',
      step: 'escrow_release',
      timestamp: now,
      note: note || `Escrow released automatically. Conditions met: QA passed + export generated. Source: ${source}.`,
      actor: 'system',
    })

    const completedDeliverables = deliverables.map(d => ({ ...d, status: 'complete' }))

    const { data: updated, error: updateErr } = await admin.from('orders').update({
      escrow_status: 'released',
      escrow_released_at: now,
      escrow_released_amount_usd: order.price_usd,
      escrow_conditions: conditions,
      status: 'complete',
      current_step: 'complete',
      progress_pct: 100,
      sla_met: true,
      deliverables: completedDeliverables,
      status_history: history,
      updated_at: now,
    }).eq('id', id).select().single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Audit log
    await admin.from('audit_log').insert({
      organization_id: order.organization_id,
      user_id: user.id,
      event_type: 'escrow_released',
      table_name: 'orders',
      record_id: id,
      new_value: {
        escrow_status: 'released',
        released_at: now,
        amount_usd: order.price_usd,
        conditions,
        source,
      },
    }).catch(() => {})

    // Usage event
    await admin.from('usage_events').insert({
      user_id: user.id,
      organization_id: order.organization_id,
      event_type: 'order_complete',
      resource_type: 'order',
      resource_id: id,
      metadata: { escrow_released: true, amount_usd: order.price_usd, source },
    }).catch(() => {})

    return NextResponse.json({
      released: true,
      escrow_released_at: now,
      amount_usd: order.price_usd,
      order: updated,
    })
  } catch (err) {
    console.error('[ESCROW RELEASE]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

/**
 * GET /api/orders/[id]/escrow-release
 * Returns current escrow status for an order
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('orders')
    .select('id, status, escrow_status, escrow_released_at, escrow_conditions, escrow_released_amount_usd, price_usd')
    .eq('id', id).single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}
