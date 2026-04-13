import { createAdminClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  generateMilestonesFromDeadline,
  MILESTONE_META,
  milestoneStatus,
  daysUntil,
  buildGanttItems,
} from '@/lib/timeline-engine'
import type { Milestone } from '@/lib/timeline-engine'
import TimelineClient from './TimelineClient'

export const dynamic = 'force-dynamic'

interface PageProps { params: Promise<{ id: string }> }

export default async function TimelinePage({ params }: PageProps) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: app } = await admin.from('grant_applications').select('*').eq('id', id).single()
  if (!app) return notFound()

  // Load saved milestones or generate from deadline
  const { data: savedMilestones } = await admin
    .from('timeline_milestones')
    .select('*')
    .eq('application_id', id)
    .order('sort_order', { ascending: true })

  let milestones: Milestone[]

  if (savedMilestones && savedMilestones.length > 0) {
    milestones = savedMilestones as Milestone[]
  } else if (app.deadline) {
    // Auto-generate and save
    const generated = generateMilestonesFromDeadline({
      application_id: id,
      deadline: app.deadline,
      has_board_approval: true,
    })

    const { data: inserted } = await admin
      .from('timeline_milestones')
      .insert(generated.map(m => ({
        ...m,
        organization_id: app.organization_id,
      })))
      .select()

    milestones = (inserted || []) as Milestone[]
  } else {
    milestones = []
  }

  const gantt = buildGanttItems(milestones)

  // Compute quick stats
  const overdue = milestones.filter(m => milestoneStatus(m) === 'overdue').length
  const soon = milestones.filter(m => milestoneStatus(m) === 'soon').length
  const complete = milestones.filter(m => milestoneStatus(m) === 'complete').length
  const deadline = milestones.find(m => m.milestone_type === 'deadline')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/dashboard" className="hover:text-indigo-600">Dashboard</Link>
            <span>›</span>
            <Link href={`/application/${id}`} className="hover:text-indigo-600">{app.title}</Link>
            <span>›</span>
            <span>Timeline</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Application Timeline</h1>
              <div className="flex gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                {app.funder_name && <span className="text-indigo-700">{app.funder_name}</span>}
                {deadline?.due_date && (
                  <span className={`font-medium ${daysUntil(deadline.due_date) < 7 ? 'text-red-600' : 'text-gray-600'}`}>
                    ⏰ Deadline: {deadline.due_date} ({daysUntil(deadline.due_date)} days)
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link href={`/export/${id}`} className="text-sm border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50">
                Export Bundle
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Milestones', value: milestones.length, color: 'text-gray-900', bg: 'bg-white' },
            { label: 'Complete', value: complete, color: 'text-green-700', bg: 'bg-green-50' },
            { label: 'Due Soon (≤3d)', value: soon, color: 'text-yellow-700', bg: soon > 0 ? 'bg-yellow-50' : 'bg-white' },
            { label: 'Overdue', value: overdue, color: 'text-red-700', bg: overdue > 0 ? 'bg-red-50' : 'bg-white' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl border border-gray-200 p-4 text-center`}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <TimelineClient
          applicationId={id}
          appTitle={app.title}
          appDeadline={app.deadline}
          initialMilestones={milestones}
          ganttData={gantt}
          milestoneMeta={MILESTONE_META}
        />
      </div>
    </div>
  )
}
