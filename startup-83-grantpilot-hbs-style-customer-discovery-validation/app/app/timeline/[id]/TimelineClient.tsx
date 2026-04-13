'use client'

import { useState } from 'react'
import type { Milestone, MilestoneType, GanttItem } from '@/lib/timeline-engine'
import { MILESTONE_META, milestoneStatus, daysUntil } from '@/lib/timeline-engine'

interface Props {
  applicationId: string
  appTitle: string
  appDeadline: string | null
  initialMilestones: Milestone[]
  ganttData: { items: GanttItem[]; startDate: Date; endDate: Date }
  milestoneMeta: typeof MILESTONE_META
}

const STATUS_STYLES = {
  complete: 'bg-green-500',
  overdue:  'bg-red-500',
  soon:     'bg-yellow-500',
  upcoming: 'bg-indigo-500',
  future:   'bg-gray-300',
}

export default function TimelineClient({ applicationId, appTitle, appDeadline, initialMilestones, ganttData, milestoneMeta }: Props) {
  const [milestones, setMilestones] = useState(initialMilestones)
  const [view, setView] = useState<'list' | 'gantt'>('list')
  const [saving, setSaving] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [newMilestone, setNewMilestone] = useState({ title: '', due_date: '', milestone_type: 'custom' as MilestoneType, description: '' })

  const toggleComplete = async (m: Milestone) => {
    const completed_at = m.completed_at ? null : new Date().toISOString()
    setSaving(m.id)
    const r = await fetch('/api/timeline', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: m.id, completed_at }),
    })
    if (r.ok) setMilestones(prev => prev.map(x => x.id === m.id ? { ...x, completed_at } : x))
    setSaving(null)
  }

  const addMilestone = async () => {
    if (!newMilestone.title || !newMilestone.due_date) return
    setSaving('new')
    const r = await fetch('/api/timeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ application_id: applicationId, ...newMilestone, reminder_days_before: [7, 3, 1] }),
    })
    if (r.ok) {
      const { milestone } = await r.json()
      setMilestones(prev => [...prev, milestone].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))
      setNewMilestone({ title: '', due_date: '', milestone_type: 'custom', description: '' })
      setShowAddModal(false)
    }
    setSaving(null)
  }

  const deleteMilestone = async (id: string) => {
    setSaving(id)
    const r = await fetch('/api/timeline', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (r.ok) setMilestones(prev => prev.filter(m => m.id !== id))
    setSaving(null)
  }

  const downloadICS = async () => {
    setDownloading(true)
    const r = await fetch(`/api/timeline/ics?application_id=${applicationId}`)
    if (r.ok) {
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `grantpilot-${applicationId.slice(0, 8)}.ics`
      a.click()
      URL.revokeObjectURL(url)
    }
    setDownloading(false)
  }

  const regenerate = async () => {
    if (!appDeadline) return
    setSaving('regen')
    const r = await fetch('/api/timeline', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ application_id: applicationId, deadline: appDeadline }),
    })
    if (r.ok) {
      const { milestones: fresh } = await r.json()
      setMilestones(fresh)
    }
    setSaving(null)
  }

  // Recompute gantt in-client after updates
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const withDates = milestones.filter(m => m.due_date)
  const dates = withDates.map(m => new Date(m.due_date!))
  const minD = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date()
  const maxD = dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date()
  minD.setDate(minD.getDate() - 3); maxD.setDate(maxD.getDate() + 3)
  const totalMs = maxD.getTime() - minD.getTime() || 1

  const ganttItems = withDates.map(m => {
    const d = new Date(m.due_date!)
    const leftPct = ((d.getTime() - minD.getTime()) / totalMs) * 100
    const status = milestoneStatus(m)
    return { m, leftPct: Math.max(0, Math.min(95, leftPct)), status }
  })

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {(['list', 'gantt'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === v ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                {v === 'list' ? '📋 List' : '📊 Gantt'}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={downloadICS} disabled={downloading}
              className="flex items-center gap-1.5 text-sm border border-indigo-300 text-indigo-700 px-3 py-2 rounded-lg hover:bg-indigo-50 disabled:opacity-60">
              {downloading ? '⟳' : '📅'} Export ICS
            </button>
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700">
              + Add Milestone
            </button>
            {appDeadline && (
              <button onClick={regenerate} disabled={saving === 'regen'}
                className="text-sm text-gray-500 border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-60">
                {saving === 'regen' ? '⟳' : '↺'} Regenerate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Gantt View */}
      {view === 'gantt' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-sm text-gray-700">Timeline View</h3>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{minD.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              <span>Today</span>
              <span>{maxD.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
          <div className="px-5 py-4 space-y-2.5">
            {/* Today marker */}
            <div className="relative h-0">
              <div className="absolute h-[calc(100%+20px)] w-px bg-blue-400 top-0 -translate-y-0"
                style={{ left: `${Math.max(0, Math.min(100, ((now.getTime() - minD.getTime()) / totalMs) * 100))}%` }}>
                <span className="absolute -top-4 -translate-x-1/2 text-xs text-blue-500 font-medium whitespace-nowrap">Today</span>
              </div>
            </div>
            {ganttItems.map(({ m, leftPct, status }) => {
              const meta = milestoneMeta[m.milestone_type] || milestoneMeta.custom
              return (
                <div key={m.id} className="relative h-7">
                  <div className="absolute left-0 right-0 h-1 bg-gray-100 rounded top-3" />
                  <button
                    onClick={() => toggleComplete(m)}
                    className={`absolute h-7 min-w-[120px] max-w-[220px] rounded-lg px-2 py-1 text-xs font-medium shadow-sm border transition-opacity
                      ${STATUS_STYLES[status]} text-white border-transparent ${saving === m.id ? 'opacity-50' : 'opacity-90 hover:opacity-100'}`}
                    style={{ left: `${leftPct}%` }}
                    title={`${m.title} — ${m.due_date}`}
                  >
                    <span className="mr-1">{meta.icon}</span>
                    <span className="truncate">{m.title.slice(0, 20)}{m.title.length > 20 ? '...' : ''}</span>
                  </button>
                </div>
              )
            })}
          </div>
          {/* Legend */}
          <div className="px-5 py-3 border-t border-gray-100 flex gap-4 text-xs text-gray-500 flex-wrap">
            {Object.entries(STATUS_STYLES).map(([k, cls]) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-full ${cls}`} />{k}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {milestones.length === 0 ? (
              <div className="px-5 py-12 text-center text-gray-400">
                <div className="text-3xl mb-2">📅</div>
                <div className="font-medium">No milestones yet</div>
                <div className="text-sm mt-1">Add a deadline to auto-generate milestones, or add manually</div>
              </div>
            ) : milestones.map(m => {
              const meta = milestoneMeta[m.milestone_type] || milestoneMeta.custom
              const status = milestoneStatus(m)
              const days = m.due_date ? daysUntil(m.due_date) : null

              const statusBadge = {
                complete: 'bg-green-100 text-green-700',
                overdue:  'bg-red-100 text-red-700',
                soon:     'bg-yellow-100 text-yellow-700',
                upcoming: 'bg-indigo-100 text-indigo-700',
                future:   'bg-gray-100 text-gray-500',
              }[status]

              return (
                <div key={m.id} className={`flex items-start gap-3 px-5 py-3.5 ${m.completed_at ? 'bg-gray-50/50' : ''}`}>
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleComplete(m)}
                    disabled={saving === m.id}
                    className={`flex-shrink-0 w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center transition-colors
                      ${m.completed_at ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-indigo-400'}`}
                  >
                    {m.completed_at && <span className="text-xs">✓</span>}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg leading-none">{meta.icon}</span>
                      <span className={`text-sm font-medium ${m.completed_at ? 'line-through text-gray-400' : 'text-gray-900'}`}>{m.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.color}`}>{meta.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge}`}>
                        {status === 'complete' ? 'Complete' :
                          status === 'overdue' ? `${Math.abs(days!)}d overdue` :
                          days === 0 ? 'Due today' :
                          days !== null ? `${days}d` : ''}
                      </span>
                    </div>
                    {m.description && <p className="text-xs text-gray-400 mt-0.5">{m.description}</p>}
                    <div className="flex gap-3 mt-1 text-xs text-gray-400">
                      {m.due_date && <span>📅 {m.due_date}{m.due_time ? ` ${m.due_time}` : ''}</span>}
                      {m.reminder_days_before?.length > 0 && (
                        <span>🔔 Reminders: {m.reminder_days_before.join(', ')}d before</span>
                      )}
                    </div>
                  </div>

                  {/* Delete */}
                  <button onClick={() => deleteMilestone(m.id)} disabled={saving === m.id}
                    className="flex-shrink-0 text-gray-300 hover:text-red-400 disabled:opacity-40 transition-colors">✕</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add Milestone Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Milestone</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Title *</label>
                <input type="text" value={newMilestone.title} onChange={e => setNewMilestone(p => ({ ...p, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  placeholder="e.g. Submit LOI" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Due Date *</label>
                  <input type="date" value={newMilestone.due_date} onChange={e => setNewMilestone(p => ({ ...p, due_date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                  <select value={newMilestone.milestone_type} onChange={e => setNewMilestone(p => ({ ...p, milestone_type: e.target.value as MilestoneType }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400">
                    {Object.entries(milestoneMeta).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notes (optional)</label>
                <textarea value={newMilestone.description} onChange={e => setNewMilestone(p => ({ ...p, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 resize-none" rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowAddModal(false)} className="text-sm px-4 py-2 text-gray-500 hover:text-gray-700">Cancel</button>
              <button onClick={addMilestone} disabled={!newMilestone.title || !newMilestone.due_date || saving === 'new'}
                className="text-sm bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60">
                {saving === 'new' ? 'Adding...' : 'Add Milestone'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
