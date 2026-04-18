import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { captureServerEvent } from '@/lib/posthog/server'

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
  const { action, streamId, startedAt, endedAt, durationMinutes, entryType, note, entryId } = body

  const json = (data: unknown, status = 200) =>
    NextResponse.json(data, { status })

  switch (action) {
    case 'start': {
      const sa = startedAt ?? new Date().toISOString()
      const { error, data } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          stream_id: streamId ?? null,
          started_at: sa,
          entry_type: entryType ?? 'billable',
          status: 'in_progress',
        })
        .select()
        .single()
      if (error) return json({ error: 'could_not_start' }, 400)
      captureServerEvent(user.id, 'timer_started', { stream_id: streamId ?? null, funnel: 'activation', funnel_step: 5 }).catch(() => {})
      return json({ ok: true, entry: data })
    }

    case 'stop': {
      const ea = endedAt ?? new Date().toISOString()
      let entryQuery
      if (entryId) {
        entryQuery = supabase
          .from('time_entries')
          .select('*')
          .eq('id', entryId)
          .eq('user_id', user.id)
          .eq('status', 'in_progress')
          .single()
      } else {
        entryQuery = supabase
          .from('time_entries')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'in_progress')
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      }
      const { data: entry } = await entryQuery
      if (!entry) return json({ error: 'no_active_timer' }, 400)
      const duration = Math.max(
        1,
        Math.ceil(
          (new Date(ea).getTime() - new Date(entry.started_at).getTime()) / 60000
        )
      )
      const { error: uErr, data: updated } = await supabase
        .from('time_entries')
        .update({ ended_at: ea, duration_minutes: duration, status: 'completed' })
        .eq('id', entry.id)
        .select()
        .single()
      if (uErr) return json({ error: 'could_not_stop' }, 400)
      captureServerEvent(user.id, 'timer_stopped', { duration_minutes: duration }).catch(() => {})
      return json({ ok: true, entry: updated })
    }

    case 'log': {
      const duration = Number(durationMinutes)
      if (!duration || duration <= 0)
        return json({ error: 'durationMinutes_required' }, 400)
      const sa = startedAt ?? new Date(Date.now() - duration * 60000).toISOString()
      const ea = endedAt ?? new Date().toISOString()
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          stream_id: streamId ?? null,
          started_at: sa,
          ended_at: ea,
          duration_minutes: duration,
          entry_type: entryType ?? 'billable',
          note: note ?? null,
        })
        .select('id')
        .single()
      if (error) return json({ error: 'could_not_log' }, 400)
      captureServerEvent(user.id, 'timer_session', {
        funnel: 'activation',
        funnel_step: 5,
        duration_minutes: duration,
        entry_type: entryType ?? 'billable',
        stream_id: streamId ?? null,
      }).catch(() => {})
      return json({ ok: true, entry: data })
    }

    default:
      return json({ error: 'invalid_action' }, 400)
  }
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
