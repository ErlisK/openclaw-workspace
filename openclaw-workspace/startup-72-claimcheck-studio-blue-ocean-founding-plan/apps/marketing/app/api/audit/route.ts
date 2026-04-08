import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: list audit events with filters
export async function GET(req: NextRequest) {
  const db = sb()
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const entity = searchParams.get('entity')
  const actor_type = searchParams.get('actor_type')
  const event_type = searchParams.get('event_type')
  const org_id = searchParams.get('org_id')
  const since = searchParams.get('since')

  let q = db.from('cc_audit_log_v2')
    .select('id,org_id,actor_type,event_type,entity,entity_id,before_sha,after_sha,event_data,created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (entity) q = q.eq('entity', entity)
  if (actor_type) q = q.eq('actor_type', actor_type)
  if (event_type) q = q.eq('event_type', event_type)
  if (org_id) q = q.eq('org_id', org_id)
  if (since) q = q.gte('created_at', since)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ events: data, count: data?.length })
}

// POST: append new audit event (no update/delete at DB level)
export async function POST(req: NextRequest) {
  const db = sb()
  const body = await req.json()
  const { actor_type, event_type, entity, entity_id, before_sha, after_sha, event_data, org_id, session_id, actor_id } = body

  if (!event_type || !actor_type) {
    return NextResponse.json({ error: 'event_type and actor_type required' }, { status: 400 })
  }

  const { data, error } = await db.from('cc_audit_log_v2').insert({
    actor_type, event_type, entity, entity_id, before_sha, after_sha,
    event_data: event_data || {},
    org_id, session_id, actor_id,
    ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    user_agent: req.headers.get('user-agent')?.slice(0, 255) || null,
  }).select('id,created_at').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
