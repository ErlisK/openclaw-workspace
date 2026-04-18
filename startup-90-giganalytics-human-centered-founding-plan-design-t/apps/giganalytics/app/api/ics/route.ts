import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseIcs, inferSessions, type StreamKeywords } from '@/lib/ics'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const previewOnly = formData.get('preview') === 'true'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!file.name.endsWith('.ics') && file.type !== 'text/calendar') {
    return NextResponse.json({ error: 'File must be a .ics calendar file' }, { status: 400 })
  }

  const icsText = await file.text()
  const events = parseIcs(icsText)

  if (events.length === 0) {
    return NextResponse.json({ error: 'No calendar events found in file' }, { status: 400 })
  }

  // Fetch user's streams for keyword matching
  const { data: streams } = await supabase
    .from('streams')
    .select('id, name')
    .eq('user_id', user.id)

  const streamKeywords: StreamKeywords[] = (streams ?? []).map(s => ({
    id: s.id,
    name: s.name,
    keywords: [s.name.toLowerCase().replace(/\s+/g, '')], // simple: stream name as keyword
  }))

  const sessions = inferSessions(events, streamKeywords, {
    minDurationMinutes: 15,
    maxDurationHours: 10,
  })

  // Filter: only medium/high confidence or no skip reason
  const importable = sessions.filter(s => !s.skipReason || s.confidence !== 'low')
  const skipped = sessions.filter(s => s.skipReason && s.confidence === 'low')

  if (previewOnly) {
    return NextResponse.json({
      total: events.length,
      importable: importable.length,
      skipped: skipped.length,
      preview: importable.slice(0, 10).map(s => ({
        summary: s.summary,
        date: s.dtstart.toISOString().split('T')[0],
        durationMinutes: s.durationMinutes,
        streamHint: s.streamHint,
        entryType: s.entryType,
        confidence: s.confidence,
      })),
      skipReasons: skipped.slice(0, 5).map(s => ({ summary: s.summary, reason: s.skipReason })),
    })
  }

  // Import sessions
  if (importable.length === 0) {
    return NextResponse.json({ imported: 0, total: events.length, skipped: skipped.length })
  }

  // Resolve stream IDs
  const streamByName = new Map((streams ?? []).map(s => [s.name.toLowerCase(), s.id]))

  const rows = importable.map(s => {
    const streamId = s.streamHint
      ? streamByName.get(s.streamHint.toLowerCase()) ?? null
      : null
    return {
      user_id: user.id,
      stream_id: streamId,
      started_at: s.dtstart.toISOString(),
      ended_at: s.dtend.toISOString(),
      duration_minutes: s.durationMinutes,
      entry_type: s.entryType,
      note: s.summary,
    }
  })

  const { data, error } = await supabase
    .from('time_entries')
    .insert(rows)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    imported: data?.length ?? rows.length,
    total: events.length,
    skipped: skipped.length,
  })
}
