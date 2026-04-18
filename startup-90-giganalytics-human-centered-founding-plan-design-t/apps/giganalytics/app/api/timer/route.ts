import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { action, streamId, startedAt, endedAt, durationMinutes, entryType, note } = body

  if (action === 'log') {
    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        user_id: user.id,
        stream_id: streamId ?? null,
        started_at: startedAt ?? new Date().toISOString(),
        ended_at: endedAt ?? new Date().toISOString(),
        duration_minutes: durationMinutes ?? null,
        entry_type: entryType ?? 'billable',
        note: note ?? null,
      })
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ id: data?.id })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('time_entries')
    .select('*, streams(name, color)')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ entries: data ?? [] })
}
