/**
 * Agent API v1 — /api/v1/jobs/[id]
 *
 * GET    — get job status and results
 * PATCH  — update a draft job or submit it (status: "pending")
 * DELETE — cancel a pending/draft job
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/agent-auth'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await authenticateApiKey(req.headers.get('Authorization'))
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = await createClient()

  const { data: job, error } = await supabase
    .from('test_jobs')
    .select(`
      *,
      feedback:test_feedback(*),
      sessions:test_sessions(id, status, started_at, completed_at)
    `)
    .eq('id', id)
    .eq('client_id', auth.userId)
    .single()

  if (error || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  return NextResponse.json({ job })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authenticateApiKey(req.headers.get('Authorization'))
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = await createClient()

  // Verify ownership
  const { data: existing, error: fetchErr } = await supabase
    .from('test_jobs')
    .select('id, status')
    .eq('id', id)
    .eq('client_id', auth.userId)
    .single()

  if (fetchErr || !existing) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (!['draft', 'pending'].includes(existing.status)) {
    return NextResponse.json({ error: `Cannot update job in status: ${existing.status}` }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const allowed = ['title', 'url', 'tier', 'instructions', 'status']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  // Only allow status transition draft → pending
  if (updates.status && updates.status !== 'pending') {
    return NextResponse.json({ error: 'Only status "pending" is allowed via PATCH (submits the job)' }, { status: 400 })
  }
  if (updates.status === 'pending' && existing.status !== 'draft') {
    return NextResponse.json({ error: 'Job is already submitted' }, { status: 400 })
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('test_jobs')
    .update(updates)
    .eq('id', id)
    .eq('client_id', auth.userId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ job: data })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await authenticateApiKey(req.headers.get('Authorization'))
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = await createClient()

  const { data: existing, error: fetchErr } = await supabase
    .from('test_jobs')
    .select('id, status')
    .eq('id', id)
    .eq('client_id', auth.userId)
    .single()

  if (fetchErr || !existing) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (!['draft', 'pending'].includes(existing.status)) {
    return NextResponse.json({ error: `Cannot cancel job in status: ${existing.status}` }, { status: 400 })
  }

  const { error } = await supabase
    .from('test_jobs')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('client_id', auth.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: 'Job cancelled' })
}
