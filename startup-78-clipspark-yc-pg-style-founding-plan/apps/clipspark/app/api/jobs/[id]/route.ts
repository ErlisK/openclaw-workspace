import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('processing_jobs')
    .select(`
      *,
      media_assets(*),
      clip_outputs(*)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const allowed = ['status', 'error_message', 'worker_id', 'transcription_cost_usd', 'render_cost_usd', 'ai_cost_usd']
  const updates: Record<string, unknown> = {}

  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  // Auto-timestamps
  const now = new Date().toISOString()
  if (body.status === 'transcribing') updates.started_at = now
  if (body.status === 'preview_ready') updates.preview_ready_at = now
  if (body.status === 'done') updates.done_at = now

  const { data, error } = await supabase
    .from('processing_jobs')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
