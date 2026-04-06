'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface TestRun {
  id: string
  status: string
  started_at: string | null
  ended_at: string | null
  tester_count: number
  attended_count: number
  feedback_count: number
  avg_overall_rating: number | null
  show_up_rate: number | null
  survey_completion_rate: number | null
  facilitator_notes: string | null
  session_templates?: { name: string } | null
  rule_versions?: { version_label: string } | null
}

interface Props {
  sessionId: string
  designerId: string
  existingRuns: TestRun[]
  templates: Array<{ id: string; name: string }>
  ruleVersions: Array<{ id: string; version_label: string }>
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  running: 'text-green-400 bg-green-500/10 border-green-500/20',
  completed: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  cancelled: 'text-gray-500 bg-gray-500/10 border-gray-500/20',
}

export default function TestRunManager({ sessionId, designerId, existingRuns, templates, ruleVersions }: Props) {
  const router = useRouter()
  const [runs, setRuns] = useState<TestRun[]>(existingRuns)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]?.id ?? '')
  const [selectedRuleVersion, setSelectedRuleVersion] = useState(ruleVersions[0]?.id ?? '')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  async function createRun() {
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/test-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          template_id: selectedTemplate || null,
          rule_version_id: selectedRuleVersion || null,
          facilitator_notes: notes || null,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? 'Failed')
      setRuns(prev => [data.test_run, ...prev])
      setShowForm(false)
      setNotes('')
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  async function updateStatus(runId: string, status: string) {
    const res = await fetch('/api/test-runs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: runId, status }),
    })
    const data = await res.json()
    if (data.success) {
      setRuns(prev => prev.map(r => r.id === runId ? data.test_run : r))
      router.refresh()
    }
  }

  const activeRun = runs.find(r => r.status === 'running')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Test Runs</h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-orange-400 hover:text-orange-300 text-sm"
          >
            + New run
          </button>
        )}
      </div>

      {/* Create run form */}
      {showForm && (
        <div className="bg-white/4 border border-white/10 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-medium">Create Test Run</h4>
          {templates.length > 0 && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">Template (optional)</label>
              <select
                value={selectedTemplate}
                onChange={e => setSelectedTemplate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">No template</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          {ruleVersions.length > 0 && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">Rule version</label>
              <select
                value={selectedRuleVersion}
                onChange={e => setSelectedRuleVersion(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">No version</option>
                {ruleVersions.map(v => <option key={v.id} value={v.id}>{v.version_label}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Facilitator notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any notes for this run…"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={createRun}
              disabled={creating}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              {creating ? 'Creating…' : 'Create Run'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white text-sm px-4 py-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Run list */}
      {runs.length === 0 ? (
        <div className="text-center text-gray-600 text-sm py-8 bg-white/4 border border-white/10 rounded-xl">
          No test runs yet. Create one to track a live session.
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map(run => (
            <div key={run.id} className="bg-white/4 border border-white/10 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[run.status] ?? STATUS_COLORS.pending}`}>
                      {run.status}
                    </span>
                    {run.session_templates?.name && (
                      <span className="text-xs text-gray-500">{run.session_templates.name}</span>
                    )}
                    {run.rule_versions?.version_label && (
                      <span className="text-xs text-gray-600 font-mono">{run.rule_versions.version_label}</span>
                    )}
                  </div>
                  {run.facilitator_notes && (
                    <p className="text-xs text-gray-500 mt-1">{run.facilitator_notes}</p>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {run.status === 'pending' && (
                    <button
                      onClick={() => updateStatus(run.id, 'running')}
                      className="text-xs bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/30 px-2 py-1 rounded-lg"
                    >
                      Start
                    </button>
                  )}
                  {run.status === 'running' && (
                    <button
                      onClick={() => updateStatus(run.id, 'completed')}
                      className="text-xs bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 px-2 py-1 rounded-lg"
                    >
                      Complete
                    </button>
                  )}
                  {run.status !== 'cancelled' && run.status !== 'completed' && (
                    <button
                      onClick={() => updateStatus(run.id, 'cancelled')}
                      className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Metrics */}
              {run.status === 'completed' && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pt-3 border-t border-white/5">
                  {[
                    { label: 'Testers', value: run.tester_count ?? 0 },
                    { label: 'Attended', value: run.attended_count ?? 0 },
                    { label: 'Feedback', value: run.feedback_count ?? 0 },
                    { label: 'Show-up', value: run.show_up_rate != null ? `${Math.round(run.show_up_rate)}%` : '—' },
                    { label: 'Avg rating', value: run.avg_overall_rating != null ? `★ ${Number(run.avg_overall_rating).toFixed(1)}` : '—' },
                  ].map(m => (
                    <div key={m.label} className="text-center">
                      <div className="text-sm font-bold">{m.value}</div>
                      <div className="text-[10px] text-gray-500">{m.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {run.status === 'running' && (
                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-green-400">Session in progress</span>
                  <a
                    href={`/api/events?session_id=${sessionId}`}
                    target="_blank"
                    className="text-xs text-gray-500 hover:text-gray-300 ml-auto"
                  >
                    View events feed →
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
