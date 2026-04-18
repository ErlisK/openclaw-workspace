import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { captureServerEvent } from '@/lib/posthog/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch { /* empty body ok */ }

  const { streamId, startedAt, entryType, note } = body as Record<string, string | undefined>
  const sa = startedAt ?? new Date().toISOString()

  const { error, data } = await supabase
    .from('time_entries')
    .insert({
      user_id: user.id,
      stream_id: streamId ?? null,
      started_at: sa,
      entry_type: entryType ?? 'billable',
      note: note ?? null,
      status: 'in_progress',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'could_not_start' }, { status: 400 })

  captureServerEvent(user.id, 'timer_started', { stream_id: streamId ?? null }).catch(() => {})
  return NextResponse.json({ ok: true, entry: data })
}
