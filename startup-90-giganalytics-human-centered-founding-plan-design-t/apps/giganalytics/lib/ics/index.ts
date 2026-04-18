/**
 * ICS / iCal parser + session inference for GigAnalytics
 *
 * Parses .ics files and applies heuristics to classify calendar events
 * as billable work sessions tied to income streams.
 */

export interface CalendarEvent {
  uid: string
  summary: string
  description?: string
  dtstart: Date
  dtend: Date
  durationMinutes: number
}

export interface InferredSession {
  uid: string
  summary: string
  dtstart: Date
  dtend: Date
  durationMinutes: number
  streamHint: string | null   // matched stream name / keyword
  entryType: 'billable' | 'proposal' | 'admin' | 'revision'
  confidence: 'high' | 'medium' | 'low'
  skipReason?: string
}

// ─── ICS Parser ──────────────────────────────────────────────────────────────

function parseIcsDate(value: string): Date | null {
  // DATE-TIME: 20240115T103000Z or 20240115T103000
  const dt = value.replace(/^.*:/, '').trim()
  if (dt.length >= 15) {
    const y = dt.slice(0, 4), mo = dt.slice(4, 6), d = dt.slice(6, 8)
    const h = dt.slice(9, 11), m = dt.slice(11, 13), s = dt.slice(13, 15)
    const iso = `${y}-${mo}-${d}T${h}:${m}:${s}${dt.endsWith('Z') ? 'Z' : ''}`
    const parsed = new Date(iso)
    return isNaN(parsed.getTime()) ? null : parsed
  }
  // DATE only: 20240115
  if (dt.length === 8) {
    const parsed = new Date(`${dt.slice(0,4)}-${dt.slice(4,6)}-${dt.slice(6,8)}`)
    return isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

function parseDuration(value: string): number {
  // DURATION:PT1H30M or P1DT2H
  const match = value.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/)
  if (!match) return 0
  const days = parseInt(match[1] ?? '0')
  const hours = parseInt(match[2] ?? '0')
  const mins = parseInt(match[3] ?? '0')
  return days * 1440 + hours * 60 + mins
}

export function parseIcs(icsText: string): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const blocks = icsText.split('BEGIN:VEVENT')
  
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i]
    const get = (key: string): string | undefined => {
      const re = new RegExp(`^${key}[;:][^\r\n]+`, 'm')
      const m = block.match(re)
      if (!m) return undefined
      // Handle line folding
      return m[0].replace(/^[^:]+:/, '').trim()
    }

    const uid = get('UID') ?? `ics-${i}`
    const summary = get('SUMMARY') ?? '(untitled)'
    const description = get('DESCRIPTION')
    const dtStartRaw = block.match(/^DTSTART[;:][^\r\n]+/m)?.[0]
    const dtEndRaw = block.match(/^DTEND[;:][^\r\n]+/m)?.[0]
    const durationRaw = get('DURATION')

    if (!dtStartRaw) continue
    const dtstart = parseIcsDate(dtStartRaw)
    if (!dtstart) continue

    let dtend: Date
    let durationMinutes: number

    if (dtEndRaw) {
      const parsed = parseIcsDate(dtEndRaw)
      dtend = parsed ?? new Date(dtstart.getTime() + 60 * 60000)
      durationMinutes = Math.round((dtend.getTime() - dtstart.getTime()) / 60000)
    } else if (durationRaw) {
      durationMinutes = parseDuration(durationRaw)
      dtend = new Date(dtstart.getTime() + durationMinutes * 60000)
    } else {
      // All-day assumed 8h
      dtend = new Date(dtstart.getTime() + 8 * 60 * 60000)
      durationMinutes = 480
    }

    events.push({ uid, summary, description, dtstart, dtend, durationMinutes })
  }
  return events
}

// ─── Session Inference ────────────────────────────────────────────────────────

const WORK_KEYWORDS = [
  // Billable work
  'client', 'project', 'design', 'dev', 'develop', 'code', 'meeting',
  'call', 'consult', 'review', 'deliverable', 'sprint', 'standup',
  'invoice', 'brief', 'workshop', 'interview', 'session', 'work',
  // Proposal / pitch
  'proposal', 'pitch', 'quote', 'estimate', 'scope', 'discovery',
  // Admin
  'admin', 'email', 'invoice', 'accounting', 'followup', 'follow up',
  // Revision
  'revision', 'feedback', 'amend', 'update', 'tweak', 'fix',
]

const NON_WORK_KEYWORDS = [
  'lunch', 'dinner', 'breakfast', 'gym', 'workout', 'yoga', 'sleep',
  'commute', 'birthday', 'anniversary', 'vacation', 'holiday', 'pto',
  'out of office', 'busy', 'personal', 'family', 'dentist', 'doctor',
  'haircut', 'shopping', 'movie', 'date night',
]

const PROPOSAL_KEYWORDS = ['proposal', 'pitch', 'quote', 'estimate', 'discovery', 'scope']
const ADMIN_KEYWORDS = ['admin', 'accounting', 'invoice', 'email', 'follow', 'plan']
const REVISION_KEYWORDS = ['revision', 'feedback', 'amend', 'update', 'tweak', 'fix', 'review']

function classify(summary: string, desc?: string): 'billable' | 'proposal' | 'admin' | 'revision' {
  const text = `${summary} ${desc ?? ''}`.toLowerCase()
  if (REVISION_KEYWORDS.some(k => text.includes(k))) return 'revision'
  if (PROPOSAL_KEYWORDS.some(k => text.includes(k))) return 'proposal'
  if (ADMIN_KEYWORDS.some(k => text.includes(k))) return 'admin'
  return 'billable'
}

export interface StreamKeywords {
  id: string
  name: string
  keywords: string[]  // e.g. ['acme', 'stripe', 'coaching']
}

export function inferSessions(
  events: CalendarEvent[],
  streams: StreamKeywords[],
  options: {
    minDurationMinutes?: number   // skip events shorter than this (default 15)
    maxDurationHours?: number     // skip all-day+ events (default 12)
  } = {}
): InferredSession[] {
  const minDur = options.minDurationMinutes ?? 15
  const maxDur = (options.maxDurationHours ?? 12) * 60

  return events.map(ev => {
    const text = `${ev.summary} ${ev.description ?? ''}`.toLowerCase()

    // Duration filter
    if (ev.durationMinutes < minDur) {
      return { ...ev, streamHint: null, entryType: 'billable' as const, confidence: 'low' as const, skipReason: `too_short (${ev.durationMinutes}m)` }
    }
    if (ev.durationMinutes > maxDur) {
      return { ...ev, streamHint: null, entryType: 'admin' as const, confidence: 'low' as const, skipReason: `too_long (${ev.durationMinutes}m)` }
    }

    // Non-work filter
    if (NON_WORK_KEYWORDS.some(k => text.includes(k))) {
      return { ...ev, streamHint: null, entryType: 'admin' as const, confidence: 'low' as const, skipReason: 'personal_event' }
    }

    // Stream matching
    let streamHint: string | null = null
    let confidence: 'high' | 'medium' | 'low' = 'low'

    for (const s of streams) {
      const allKw = [s.name.toLowerCase(), ...s.keywords.map(k => k.toLowerCase())]
      const matched = allKw.filter(k => k && text.includes(k))
      if (matched.length > 0) {
        streamHint = s.name
        confidence = matched.length >= 2 ? 'high' : 'medium'
        break
      }
    }

    // Work keyword check for confidence boost
    if (!streamHint) {
      const hasWorkKw = WORK_KEYWORDS.some(k => text.includes(k))
      if (hasWorkKw) {
        confidence = 'medium'
      } else {
        return { ...ev, streamHint: null, entryType: 'billable' as const, confidence: 'low' as const, skipReason: 'no_work_keywords' }
      }
    }

    const entryType = classify(ev.summary, ev.description)
    return { ...ev, streamHint, entryType, confidence }
  })
}
