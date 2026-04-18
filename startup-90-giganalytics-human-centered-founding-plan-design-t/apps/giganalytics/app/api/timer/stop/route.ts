import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { captureServerEvent } from '@/lib/posthog/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch { /* empty body ok */ }

  const { entryId, endedAt } = body as Record<string, string | undefined>
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
  if (!entry) return NextResponse.json({ error: 'no_active_timer' }, { status: 400 })

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

  if (uErr) return NextResponse.json({ error: 'could_not_stop' }, { status: 400 })

  captureServerEvent(user.id, 'timer_stopped', { duration_minutes: duration }).catch(() => {})
  return NextResponse.json({ ok: true, entry: updated })
}
