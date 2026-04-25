/**
 * POST /api/experiments/[id]/rollback
 * Roll back an experiment to 'paused' status, restore variant_a_price_cents
 * as the active price, and log to audit_log.
 *
 * Body: { reason?: string, force?: boolean }
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: experimentId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const reason = body.reason ?? 'Manual rollback'

  const { data: exp, error: fetchErr } = await supabase
    .from('experiments')
    .select('*')
    .eq('id', experimentId)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !exp) {
    return NextResponse.json({ error: 'Experiment not found or access denied' }, { status: 404 })
  }

  if (exp.status === 'concluded' && !body.force) {
    return NextResponse.json({
      error: 'Experiment already concluded. Pass force:true to override.',
    }, { status: 400 })
  }

  const oldValue = {
    status: exp.status,
    concluded_at: exp.concluded_at,
    winner: exp.winner,
    decision: exp.decision,
  }

  const { error: updateErr } = await supabase
    .from('experiments')
    .update({
      status: 'paused',
      winner: null,
      decision: `rolled_back: ${reason}`,
      concluded_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', experimentId)
    .eq('user_id', user.id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  await supabase.from('audit_log').insert({
    user_id: user.id,
    entity_type: 'experiment',
    entity_id: experimentId,
    action: 'rollback',
    old_value: oldValue,
    new_value: {
      status: 'paused',
      reason,
      rolled_back_at: new Date().toISOString(),
    },
  })

  if (exp.product_id && exp.variant_a_price_cents) {
    await supabase
      .from('products')
      .update({ current_price_cents: exp.variant_a_price_cents })
      .eq('id', exp.product_id)
      .eq('user_id', user.id)

    await supabase.from('audit_log').insert({
      user_id: user.id,
      entity_type: 'product',
      entity_id: exp.product_id,
      action: 'price_restored',
      old_value: { price_cents: exp.variant_b_price_cents, reason: 'experiment_rollback' },
      new_value: {
        price_cents: exp.variant_a_price_cents,
        experiment_id: experimentId,
        reason,
      },
    })
  }

  return NextResponse.json({
    success: true,
    experiment_id: experimentId,
    previous_status: oldValue.status,
    new_status: 'paused',
    reason,
    price_restored_cents: exp.variant_a_price_cents ?? null,
  })
}
