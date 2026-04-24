import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('experiments')
    .select('*, products(name, current_price_cents)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

// PATCH /api/experiments/[id] — activate, conclude, or update fields
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership
  const { data: existing } = await supabase
    .from('experiments')
    .select('id, status, slug')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const allowedFields = [
    'status', 'headline', 'description', 'cta_text', 'cta_url',
    'variant_a_label', 'variant_b_label', 'split_pct_b', 'decision',
  ]

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const f of allowedFields) {
    if (body[f] !== undefined) patch[f] = body[f]
  }

  if (patch.status === 'active' && existing.status === 'draft') {
    patch.started_at = new Date().toISOString()
  }
  if (patch.status === 'concluded') {
    patch.concluded_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('experiments')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log to audit log
  await supabase.from('audit_log').insert({
    user_id: user.id,
    action: `experiment_${patch.status || 'updated'}`,
    entity_type: 'experiment',
    entity_id: id,
    metadata: patch,
  }).then(() => {})

  return NextResponse.json({ experiment: data, slug: existing.slug })
}
