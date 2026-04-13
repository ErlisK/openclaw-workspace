import { createServiceClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/sessions/[sessionId]/ics
 * Returns an iCalendar .ics file for the playtest session.
 * Public (anyone with the session ID can download the invite).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const supabase = createServiceClient()

  const { data: session } = await supabase
    .from('playtest_sessions')
    .select(`
      id, title, description, scheduled_at, duration_minutes, platform, meeting_url,
      max_testers,
      projects ( name, game_type )
    `)
    .eq('id', sessionId)
    .single()

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const startDate = session.scheduled_at ? new Date(session.scheduled_at) : new Date()
  const durationMs = (session.duration_minutes || 90) * 60 * 1000
  const endDate = new Date(startDate.getTime() + durationMs)
  const project = session.projects as any

  // Format date to ICS format: 20240415T190000Z
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  const uid = `ptf-${session.id}@playtestflow.vercel.app`
  const now = fmt(new Date())
  const dtstart = fmt(startDate)
  const dtend = fmt(endDate)

  const description = [
    `Playtest session for "${project?.name || 'Game'}"`,
    session.description || '',
    '',
    `Platform: ${session.platform || 'TBD'}`,
    session.meeting_url ? `Join link: ${session.meeting_url}` : '',
    '',
    `Organized by PlaytestFlow — https://playtestflow.vercel.app`,
  ].filter(Boolean).join('\\n')

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PlaytestFlow//Playtest Session//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:Playtest: ${session.title}`,
    `DESCRIPTION:${description}`,
    session.meeting_url ? `URL:${session.meeting_url}` : '',
    session.meeting_url ? `LOCATION:${session.meeting_url}` : `LOCATION:${session.platform || 'Online'}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="playtest-${session.id.slice(0, 8)}.ics"`,
      'Cache-Control': 'no-cache',
    },
  })
}
