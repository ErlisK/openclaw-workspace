import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/get-client'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params
  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: session, error } = await admin
    .from('test_sessions')
    .select('*, test_jobs(id, title, url, tier, instructions, client_id)')
    .eq('id', sessionId)
    .single()

  if (error || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  // Allow tester or job client
  const job = session.test_jobs as { client_id: string } | null
  const hasAccess = session.tester_id === user.id || job?.client_id === user.id
  if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json({ session })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params
  const supabase = await getSupabaseClient(req)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: session } = await admin
    .from('test_sessions')
    .select('id, tester_id')
    .eq('id', sessionId)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.tester_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const allowed = ['status', 'ended_at', 'recording_url', 'notes', 'timeout_at', 'end_reason']
  const updates: Record<string, unknown> = {}
  for (const k of allowed) { if (k in body) updates[k] = body[k] }

  if (updates.status === 'complete' || updates.status === 'abandoned') {
    updates.ended_at = updates.ended_at ?? new Date().toISOString()
  }
  if (updates.status === 'active' && !updates.started_at) {
    updates.started_at = new Date().toISOString()
  }

  const { data, error } = await admin
    .from('test_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session: data })
}
