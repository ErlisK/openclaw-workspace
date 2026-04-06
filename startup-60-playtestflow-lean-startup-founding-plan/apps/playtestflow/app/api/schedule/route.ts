import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase-server'

// ─── Helpers ────────────────────────────────────────────────────────────────

function icsEscape(s: string) {
  return (s ?? '').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

function icsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function googleCalendarUrl(params: {
  title: string
  start: Date
  end: Date
  description: string
  location: string
}) {
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z')
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: params.title,
    dates: `${fmt(params.start)}/${fmt(params.end)}`,
    details: params.description,
    location: params.location,
  })
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

function outlookCalendarUrl(params: {
  title: string
  start: Date
  end: Date
  description: string
  location: string
}) {
  const p = new URLSearchParams({
    subject: params.title,
    startdt: params.start.toISOString(),
    enddt: params.end.toISOString(),
    body: params.description,
    location: params.location,
    path: '/calendar/action/compose',
    rru: 'addevent',
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p.toString()}`
}

function buildICS(params: {
  uid: string
  title: string
  description: string
  location: string
  start: Date
  end: Date
  organizer: string
  attendees?: string[]
}): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PlaytestFlow//PlaytestFlow 1.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${params.uid}`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(params.start)}`,
    `DTEND:${icsDate(params.end)}`,
    `SUMMARY:${icsEscape(params.title)}`,
    `DESCRIPTION:${icsEscape(params.description)}`,
    `LOCATION:${icsEscape(params.location)}`,
    `ORGANIZER:MAILTO:${params.organizer}`,
    ...(params.attendees ?? []).map(a => `ATTENDEE;RSVP=TRUE;ROLE=REQ-PARTICIPANT:MAILTO:${a}`),
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:PlaytestFlow session starting in 1 hour',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:PlaytestFlow session starting in 15 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.join('\r\n')
}

// ─── POST /api/schedule — get calendar links for a session ──────────────────

/**
 * POST /api/schedule
 * Body: { session_id, token? }
 * Returns: ICS content, Google Calendar link, Outlook link
 * Public endpoint — token used to personalize but not required.
 */
export async function POST(request: NextRequest) {
  const { session_id, token } = await request.json()

  if (!session_id) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: session } = await supabase
    .from('playtest_sessions')
    .select(`
      id, title, description, scheduled_at, duration_minutes, platform,
      meeting_url, max_testers,
      projects ( name, game_type )
    `)
    .eq('id', session_id)
    .single()

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  let testerEmail: string | null = null
  let testerName: string | null = null

  if (token) {
    const { data: signup } = await supabase
      .from('session_signups')
      .select('tester_name, tester_email')
      .eq('consent_token', token)
      .single()
    testerEmail = signup?.tester_email ?? null
    testerName = signup?.tester_name ?? null
  }

  const project = session.projects as any
  const start = session.scheduled_at ? new Date(session.scheduled_at) : new Date()
  const duration = session.duration_minutes || 90
  const end = new Date(start.getTime() + duration * 60000)

  const title = `${project?.name ?? 'PlaytestFlow'}: ${session.title}`
  const location = session.meeting_url || session.platform || 'Online'
  const description = [
    `You're confirmed for a playtest session!`,
    ``,
    `Game: ${project?.name}`,
    `Session: ${session.title}`,
    `Platform: ${session.platform || 'Online'}`,
    session.meeting_url ? `Join: ${session.meeting_url}` : '',
    ``,
    `Powered by PlaytestFlow — https://playtestflow.vercel.app`,
  ].filter(Boolean).join('\n')

  const ics = buildICS({
    uid: `ptf-${session.id}@playtestflow.vercel.app`,
    title,
    description,
    location,
    start,
    end,
    organizer: 'noreply@playtestflow.vercel.app',
    attendees: testerEmail ? [testerEmail] : [],
  })

  const googleLink = googleCalendarUrl({ title, description, location, start, end })
  const outlookLink = outlookCalendarUrl({ title, description, location, start, end })

  return NextResponse.json({
    ics,
    googleCalendarUrl: googleLink,
    outlookCalendarUrl: outlookLink,
    session: {
      id: session.id,
      title: session.title,
      start: start.toISOString(),
      end: end.toISOString(),
      duration_minutes: duration,
      platform: session.platform,
      meeting_url: session.meeting_url,
    },
  })
}

/**
 * GET /api/schedule?session_id=<id>&token=<consent_token>
 * Download ICS file directly (for <a href> links).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')
  const token = searchParams.get('token')

  if (!sessionId) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 })
  }

  const res = await POST(new NextRequest(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, token }),
  }))

  const data = await res.json()
  if (!data.ics) {
    return NextResponse.json({ error: 'ICS generation failed' }, { status: 500 })
  }

  return new NextResponse(data.ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="playtest-${sessionId.slice(0, 8)}.ics"`,
      'Cache-Control': 'no-store',
    },
  })
}
