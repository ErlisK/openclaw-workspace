import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership
  const { data: exp } = await supabase
    .from('experiments')
    .select('id, product_id, variant_a_price_cents, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!exp) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Update experiment status
  await supabase.from('experiments').update({
    status: 'rolled_back',
    concluded_at: new Date().toISOString(),
    decision: 'rollback_a',
  }).eq('id', id)

  // Revert product price to variant A
  await supabase.from('products').update({
    current_price_cents: exp.variant_a_price_cents,
  }).eq('id', exp.product_id).eq('user_id', user.id)

  // Audit log
  await supabase.from('audit_log').insert({
    user_id: user.id,
    entity_type: 'experiment',
    entity_id: id,
    action: 'rollback_executed',
    old_value: { status: exp.status },
    new_value: { status: 'rolled_back', decision: 'rollback_a' },
  })

  return NextResponse.json({ success: true, message: 'Rolled back to variant A price' })
}
