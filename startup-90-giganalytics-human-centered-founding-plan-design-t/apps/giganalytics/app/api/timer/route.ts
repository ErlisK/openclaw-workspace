import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: entries } = await supabase
    .from('time_entries')
    .select('id, started_at, ended_at, duration_minutes, entry_type, note, stream_id, streams(name, color)')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ entries: entries ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { action, streamId, startedAt, endedAt, durationMinutes, entryType, note } = body

  if (action !== 'log') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      user_id: user.id,
      stream_id: streamId || null,
      started_at: startedAt,
      ended_at: endedAt,
      duration_minutes: durationMinutes,
      entry_type: entryType ?? 'billable',
      note: note ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, durationMinutes, note, entryType, streamId } = body

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (durationMinutes !== undefined) updates.duration_minutes = durationMinutes
  if (note !== undefined) updates.note = note
  if (entryType !== undefined) updates.entry_type = entryType
  if (streamId !== undefined) updates.stream_id = streamId

  const { error } = await supabase
    .from('time_entries')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('time_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
