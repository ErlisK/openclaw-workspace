/**
 * GET /api/audit
 * Returns the audit log for the authenticated user.
 * Query params: entity_type, entity_id, action, limit (default 50)
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const entityType = searchParams.get('entity_type')
  const entityId   = searchParams.get('entity_id')
  const action     = searchParams.get('action')
  const limit      = Math.min(Number(searchParams.get('limit') ?? 50), 200)

  let q = supabase
    .from('audit_log')
    .select('*')
    .eq('user_id', user.id)
    .order('occurred_at', { ascending: false })
    .limit(limit)

  if (entityType) q = q.eq('entity_type', entityType)
  if (entityId)   q = q.eq('entity_id', entityId)
  if (action)     q = q.eq('action', action)

  const { data, error } = await q

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    count: data?.length ?? 0,
    entries: data ?? [],
  })
}

/**
 * POST /api/audit
 * Write a manual audit event (e.g. from the frontend).
 * Body: { entity_type, entity_id?, action, old_value?, new_value? }
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { entity_type, entity_id, action, old_value, new_value } = body

  if (!entity_type || !action) {
    return NextResponse.json({ error: 'entity_type and action are required' }, { status: 400 })
  }

  const { data, error } = await supabase.from('audit_log').insert({
    user_id: user.id,
    entity_type,
    entity_id: entity_id ?? null,
    action,
    old_value: old_value ?? null,
    new_value: new_value ?? null,
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, id: data?.id })
}
