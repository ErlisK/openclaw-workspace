import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const db = sb()
  const { searchParams } = new URL(req.url)
  const incidentId = searchParams.get('id')

  if (incidentId) {
    const { data } = await db.from('cc_sla_incidents').select('*').eq('id', incidentId).single()
    return NextResponse.json(data)
  }

  const { data } = await db.from('cc_sla_incidents').select('*').order('started_at', { ascending: false }).limit(50)
  const open = data?.filter(i => i.status !== 'resolved') || []
  const resolved = data?.filter(i => i.status === 'resolved') || []
  return NextResponse.json({ open, resolved, all: data })
}

export async function POST(req: NextRequest) {
  const db = sb()
  const body = await req.json()
  const { incident_type, severity = 'p2', title, description, runbook_url } = body

  const { data, error } = await db.from('cc_sla_incidents').insert({
    incident_type, severity, title, description, runbook_url,
    status: 'open', started_at: new Date().toISOString(),
  }).select('id,created_at').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const db = sb()
  const body = await req.json()
  const { id, status, acknowledged_at, resolved_at, postmortem_url } = body

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const updates: Record<string, unknown> = { status }
  if (acknowledged_at) updates.acknowledged_at = acknowledged_at
  if (resolved_at) updates.resolved_at = resolved_at
  if (postmortem_url) updates.postmortem_url = postmortem_url

  const { data, error } = await db.from('cc_sla_incidents').update(updates).eq('id', id).select('id,status').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
