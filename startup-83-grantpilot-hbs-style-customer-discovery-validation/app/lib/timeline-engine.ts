/**
 * Timeline engine — generates milestone dates from a deadline and optional RFP data.
 * Produces ICS calendar files for export.
 */

export type MilestoneType =
  | 'deadline'
  | 'internal_review'
  | 'narrative_draft'
  | 'budget_complete'
  | 'forms_complete'
  | 'checklist_complete'
  | 'board_approval'
  | 'partner_loi'
  | 'submission_window_opens'
  | 'intent_to_apply'
  | 'qa_review'
  | 'submission'
  | 'custom'

export interface Milestone {
  id: string
  application_id: string
  organization_id?: string | null
  title: string
  description: string | null
  milestone_type: MilestoneType
  due_date: string | null        // YYYY-MM-DD
  due_time?: string | null       // HH:MM
  completed_at: string | null
  reminder_days_before: number[]
  sort_order: number
  metadata?: Record<string, unknown>
}

export const MILESTONE_META: Record<MilestoneType, { label: string; icon: string; color: string; description: string }> = {
  deadline:               { label: 'Submission Deadline', icon: '🔴', color: 'bg-red-100 text-red-800 border-red-200',       description: 'Final application submission deadline' },
  submission:             { label: 'Submit Application',  icon: '🚀', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', description: 'Target date to submit finalized application' },
  internal_review:        { label: 'Internal Review',     icon: '🔍', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', description: 'Leadership/stakeholder review of full application' },
  narrative_draft:        { label: 'Narrative Draft Due', icon: '✍️', color: 'bg-blue-100 text-blue-800 border-blue-200',     description: 'All narrative sections completed in draft' },
  budget_complete:        { label: 'Budget Complete',     icon: '💰', color: 'bg-green-100 text-green-800 border-green-200',  description: 'Budget and justification finalized' },
  forms_complete:         { label: 'Forms Complete',      icon: '📋', color: 'bg-purple-100 text-purple-800 border-purple-200', description: 'All required forms filled and reviewed' },
  checklist_complete:     { label: 'Checklist Complete',  icon: '✅', color: 'bg-teal-100 text-teal-800 border-teal-200',    description: 'Compliance checklist fully completed' },
  board_approval:         { label: 'Board Approval',      icon: '🏛️', color: 'bg-orange-100 text-orange-800 border-orange-200', description: 'Board of directors approval/endorsement' },
  partner_loi:            { label: 'Partner LOIs Due',    icon: '🤝', color: 'bg-pink-100 text-pink-800 border-pink-200',    description: 'Letters of intent from partner organizations' },
  submission_window_opens:{ label: 'Submission Window Opens', icon: '📬', color: 'bg-cyan-100 text-cyan-800 border-cyan-200', description: 'Grants portal opens for application submission' },
  intent_to_apply:        { label: 'Intent to Apply',     icon: '📝', color: 'bg-lime-100 text-lime-800 border-lime-200',    description: 'Submit letter of intent or pre-application' },
  qa_review:              { label: 'QA / Specialist Review', icon: '🛡️', color: 'bg-violet-100 text-violet-800 border-violet-200', description: 'Grant specialist final quality assurance pass' },
  custom:                 { label: 'Custom Milestone',    icon: '📌', color: 'bg-gray-100 text-gray-700 border-gray-200',    description: 'Custom project milestone' },
}

// ─── Auto-generate milestones from deadline ────────────────────────────────
export function generateMilestonesFromDeadline(params: {
  application_id: string
  deadline: string                 // YYYY-MM-DD
  has_intent_to_apply?: boolean
  has_board_approval?: boolean
  has_partner_loi?: boolean
  deadline_time?: string           // HH:MM
}): Omit<Milestone, 'id' | 'organization_id'>[] {
  const deadline = new Date(params.deadline + 'T23:59:00')
  const addDays = (d: Date, days: number) => {
    const r = new Date(d)
    r.setDate(r.getDate() + days)
    return r.toISOString().split('T')[0]
  }
  const sub = (days: number) => addDays(deadline, -days)

  const milestones: Omit<Milestone, 'id' | 'organization_id'>[] = []
  let order = 0

  // Intent to Apply (if required, usually 30+ days before)
  if (params.has_intent_to_apply) {
    milestones.push({
      application_id: params.application_id,
      title: 'Submit Letter of Intent / Pre-Application',
      description: 'Many funders require a letter of intent before the full application. Check RFP for specific LOI deadline.',
      milestone_type: 'intent_to_apply',
      due_date: sub(30),
      due_time: '17:00',
      completed_at: null,
      reminder_days_before: [7, 3, 1],
      sort_order: order++,
    })
  }

  // Partner LOIs
  if (params.has_partner_loi) {
    milestones.push({
      application_id: params.application_id,
      title: 'Collect Partner Letters of Support',
      description: 'Gather signed letters from all partner and supporting organizations.',
      milestone_type: 'partner_loi',
      due_date: sub(21),
      due_time: '17:00',
      completed_at: null,
      reminder_days_before: [7, 3, 1],
      sort_order: order++,
    })
  }

  milestones.push(
    {
      application_id: params.application_id,
      title: 'Narrative Drafts Complete',
      description: 'All required narrative sections drafted and internally reviewed.',
      milestone_type: 'narrative_draft',
      due_date: sub(18),
      due_time: '17:00',
      completed_at: null,
      reminder_days_before: [7, 3, 1],
      sort_order: order++,
    },
    {
      application_id: params.application_id,
      title: 'Budget & Justification Complete',
      description: 'Budget builder finalized, cost allocations verified, justification written.',
      milestone_type: 'budget_complete',
      due_date: sub(15),
      due_time: '17:00',
      completed_at: null,
      reminder_days_before: [5, 2, 1],
      sort_order: order++,
    },
    {
      application_id: params.application_id,
      title: 'Required Forms Completed',
      description: 'SF-424, SF-424A, certifications, and any funder-specific forms filled and reviewed.',
      milestone_type: 'forms_complete',
      due_date: sub(12),
      due_time: '17:00',
      completed_at: null,
      reminder_days_before: [5, 2, 1],
      sort_order: order++,
    },
  )

  if (params.has_board_approval) {
    milestones.push({
      application_id: params.application_id,
      title: 'Board of Directors Approval',
      description: 'Board review and formal approval of application and budget.',
      milestone_type: 'board_approval',
      due_date: sub(10),
      due_time: '17:00',
      completed_at: null,
      reminder_days_before: [5, 2, 1],
      sort_order: order++,
    })
  }

  milestones.push(
    {
      application_id: params.application_id,
      title: 'QA / Specialist Review',
      description: 'Grant specialist final review: narrative quality, compliance, budget accuracy.',
      milestone_type: 'qa_review',
      due_date: sub(7),
      due_time: '17:00',
      completed_at: null,
      reminder_days_before: [3, 1],
      sort_order: order++,
    },
    {
      application_id: params.application_id,
      title: 'Compliance Checklist Complete',
      description: 'All required checklist items verified. All attachments collected.',
      milestone_type: 'checklist_complete',
      due_date: sub(5),
      due_time: '17:00',
      completed_at: null,
      reminder_days_before: [3, 1],
      sort_order: order++,
    },
    {
      application_id: params.application_id,
      title: 'Internal Review & Sign-off',
      description: 'Executive Director / AOR final review of complete application package.',
      milestone_type: 'internal_review',
      due_date: sub(3),
      due_time: '17:00',
      completed_at: null,
      reminder_days_before: [2, 1],
      sort_order: order++,
    },
    {
      application_id: params.application_id,
      title: 'Submit Application',
      description: 'Submit through official portal. Confirm receipt/tracking number. Keep copy.',
      milestone_type: 'submission',
      due_date: sub(1),
      due_time: '12:00',
      completed_at: null,
      reminder_days_before: [1],
      sort_order: order++,
    },
    {
      application_id: params.application_id,
      title: '⚠️ Submission Deadline',
      description: `Hard deadline set by funder. Late submissions are typically not accepted.`,
      milestone_type: 'deadline',
      due_date: params.deadline,
      due_time: params.deadline_time || '23:59',
      completed_at: null,
      reminder_days_before: [14, 7, 3, 1],
      sort_order: order++,
    },
  )

  return milestones
}

// ─── Days until / days overdue ──────────────────────────────────────────────
export function daysUntil(due_date: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(due_date + 'T00:00:00'); d.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function milestoneStatus(m: Milestone): 'complete' | 'overdue' | 'upcoming' | 'soon' | 'future' {
  if (m.completed_at) return 'complete'
  if (!m.due_date) return 'future'
  const days = daysUntil(m.due_date)
  if (days < 0) return 'overdue'
  if (days <= 3) return 'soon'
  if (days <= 14) return 'upcoming'
  return 'future'
}

// ─── ICS export ─────────────────────────────────────────────────────────────
function escapeICS(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function foldLine(line: string): string {
  // ICS spec: max 75 octets per line, fold with CRLF + space
  const result: string[] = []
  while (line.length > 75) {
    result.push(line.slice(0, 75))
    line = ' ' + line.slice(75)
  }
  result.push(line)
  return result.join('\r\n')
}

export function generateICS(milestones: Milestone[], appTitle: string): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  const events = milestones
    .filter(m => m.due_date)
    .map(m => {
      const dateStr = m.due_date!.replace(/-/g, '')
      const uid = `grantpilot-${m.application_id}-${m.id}@grantpilot.app`
      const meta = MILESTONE_META[m.milestone_type]
      const summary = `[GrantPilot] ${m.title} — ${appTitle}`
      const description = [m.description || '', `\nType: ${meta.label}`, `\nApplication: ${appTitle}`].join('')

      // For all-day events we use DATE format, for timed events DATETIME
      let dtstart, dtend
      if (m.due_time && m.due_time !== '23:59') {
        const t = m.due_time.replace(':', '') + '00'
        dtstart = `DTSTART:${dateStr}T${t}`
        dtend   = `DTEND:${dateStr}T${t}`
      } else {
        dtstart = `DTSTART;VALUE=DATE:${dateStr}`
        dtend   = `DTEND;VALUE=DATE:${dateStr}`
      }

      const alarms = (m.reminder_days_before || [7, 3, 1]).map(days => [
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:Reminder: ${escapeICS(m.title)} in ${days} day${days === 1 ? '' : 's'}`,
        `TRIGGER:-P${days}D`,
        'END:VALARM',
      ].join('\r\n'))

      return [
        'BEGIN:VEVENT',
        foldLine(`UID:${uid}`),
        `DTSTAMP:${now}`,
        dtstart,
        dtend,
        foldLine(`SUMMARY:${escapeICS(summary)}`),
        foldLine(`DESCRIPTION:${escapeICS(description)}`),
        m.completed_at ? 'STATUS:COMPLETED' : 'STATUS:CONFIRMED',
        `CATEGORIES:${escapeICS(meta.label)}`,
        ...alarms,
        'END:VEVENT',
      ].join('\r\n')
    })

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GrantPilot//Grant Application Timeline//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:GrantPilot — ${escapeICS(appTitle)}`,
    'X-WR-CALDESC:Grant application milestones generated by GrantPilot',
    'X-WR-TIMEZONE:America/New_York',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')
}

// ─── Gantt positioning helpers ──────────────────────────────────────────────
export interface GanttItem {
  milestone: Milestone
  leftPct: number
  widthPct: number
  status: ReturnType<typeof milestoneStatus>
  daysUntilDue: number | null
}

export function buildGanttItems(milestones: Milestone[]): { items: GanttItem[]; startDate: Date; endDate: Date } {
  const withDates = milestones.filter(m => m.due_date)
  if (withDates.length === 0) return { items: [], startDate: new Date(), endDate: new Date() }

  const dates = withDates.map(m => new Date(m.due_date!))
  const minD = new Date(Math.min(...dates.map(d => d.getTime())))
  const maxD = new Date(Math.max(...dates.map(d => d.getTime())))

  // Pad 3 days on each side
  minD.setDate(minD.getDate() - 3)
  maxD.setDate(maxD.getDate() + 3)

  const totalMs = maxD.getTime() - minD.getTime()

  const items: GanttItem[] = withDates.map(m => {
    const d = new Date(m.due_date!)
    const leftMs = d.getTime() - minD.getTime()
    const leftPct = totalMs > 0 ? (leftMs / totalMs) * 100 : 0
    return {
      milestone: m,
      leftPct: Math.max(0, Math.min(96, leftPct)),
      widthPct: 4,
      status: milestoneStatus(m),
      daysUntilDue: m.due_date ? daysUntil(m.due_date) : null,
    }
  })

  return { items, startDate: minD, endDate: maxD }
}
