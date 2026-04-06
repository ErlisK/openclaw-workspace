'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Role { id: string; name: string; description: string; required: boolean }
interface TimingBlock { id: string; label: string; duration_minutes: number; description: string; facilitator_notes: string }
interface ScriptedTask { id: string; label: string; timing_block_id: string; description: string; expected_outcome: string; metrics_to_capture: string[] }

interface Props {
  projects: Array<{ id: string; name: string; game_type: string }>
  existing?: {
    id: string
    project_id: string
    name: string
    description?: string
    duration_minutes: number
    max_testers: number
    roles: Role[]
    timing_blocks: TimingBlock[]
    scripted_tasks: ScriptedTask[]
  }
}

const uid = () => Math.random().toString(36).slice(2, 9)

const METRIC_OPTIONS = ['time_to_decide', 'confusion_flag', 'rule_lookup', 'discussion_needed', 'failed_action', 'completed_action']

export default function TemplateBuilder({ projects, existing }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [projectId, setProjectId] = useState(existing?.project_id ?? projects[0]?.id ?? '')
  const [name, setName] = useState(existing?.name ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [durationMinutes, setDurationMinutes] = useState(existing?.duration_minutes ?? 90)
  const [maxTesters, setMaxTesters] = useState(existing?.max_testers ?? 6)
  const [roles, setRoles] = useState<Role[]>(existing?.roles ?? [])
  const [timingBlocks, setTimingBlocks] = useState<TimingBlock[]>(existing?.timing_blocks ?? [])
  const [tasks, setTasks] = useState<ScriptedTask[]>(existing?.scripted_tasks ?? [])
  const [activeTab, setActiveTab] = useState<'roles' | 'timing' | 'tasks'>('roles')

  // ── Roles ────────────────────────────────────────────────────────────────────
  const addRole = () => setRoles(r => [...r, { id: uid(), name: '', description: '', required: false }])
  const updateRole = (id: string, patch: Partial<Role>) =>
    setRoles(r => r.map(x => x.id === id ? { ...x, ...patch } : x))
  const removeRole = (id: string) => setRoles(r => r.filter(x => x.id !== id))

  // ── Timing Blocks ─────────────────────────────────────────────────────────────
  const addBlock = () => setTimingBlocks(b => [...b, { id: uid(), label: '', duration_minutes: 15, description: '', facilitator_notes: '' }])
  const updateBlock = (id: string, patch: Partial<TimingBlock>) =>
    setTimingBlocks(b => b.map(x => x.id === id ? { ...x, ...patch } : x))
  const removeBlock = (id: string) => setTimingBlocks(b => b.filter(x => x.id !== id))

  // ── Tasks ─────────────────────────────────────────────────────────────────────
  const addTask = () => setTasks(t => [...t, { id: uid(), label: '', timing_block_id: timingBlocks[0]?.id ?? '', description: '', expected_outcome: '', metrics_to_capture: [] }])
  const updateTask = (id: string, patch: Partial<ScriptedTask>) =>
    setTasks(t => t.map(x => x.id === id ? { ...x, ...patch } : x))
  const removeTask = (id: string) => setTasks(t => t.filter(x => x.id !== id))
  const toggleMetric = (taskId: string, metric: string) => {
    setTasks(t => t.map(x => x.id === taskId
      ? { ...x, metrics_to_capture: x.metrics_to_capture.includes(metric)
          ? x.metrics_to_capture.filter(m => m !== metric)
          : [...x.metrics_to_capture, metric] }
      : x
    ))
  }

  async function handleSave() {
    if (!name.trim()) { setError('Template name is required'); return }
    if (!projectId) { setError('Select a project'); return }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const endpoint = '/api/templates'
      const method = existing ? 'PATCH' : 'POST'
      const body = {
        ...(existing ? { id: existing.id } : {}),
        project_id: projectId,
        name: name.trim(),
        description: description.trim() || null,
        duration_minutes: durationMinutes,
        max_testers: maxTesters,
        roles,
        timing_blocks: timingBlocks,
        scripted_tasks: tasks,
      }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!data.success) throw new Error(data.error ?? 'Save failed')

      setSuccess(existing ? 'Template updated!' : 'Template created!')
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const totalDuration = timingBlocks.reduce((s, b) => s + b.duration_minutes, 0)

  return (
    <div className="bg-white/4 border border-white/10 rounded-2xl p-6 space-y-6">
      {/* Basic info */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Project *</label>
          <select
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Template name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Standard Alpha Playtest"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            placeholder="What is this template for?"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm resize-none"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Duration (minutes)</label>
          <input
            type="number"
            value={durationMinutes}
            onChange={e => setDurationMinutes(Number(e.target.value))}
            min={15} max={480}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Max testers</label>
          <input
            type="number"
            value={maxTesters}
            onChange={e => setMaxTesters(Number(e.target.value))}
            min={1} max={20}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex gap-1 mb-5 bg-white/4 p-1 rounded-lg w-fit">
          {(['roles', 'timing', 'tasks'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                activeTab === tab ? 'bg-orange-500 text-white font-semibold' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'roles' ? `🎭 Roles (${roles.length})` :
               tab === 'timing' ? `⏱ Timing (${timingBlocks.length})` :
               `✅ Tasks (${tasks.length})`}
            </button>
          ))}
        </div>

        {/* Roles tab */}
        {activeTab === 'roles' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">Define player roles — e.g. "Attacker", "Support", "Solo player", "GM", etc.</p>
            {roles.map(role => (
              <div key={role.id} className="bg-white/4 border border-white/8 rounded-xl p-4 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={role.name}
                    onChange={e => updateRole(role.id, { name: e.target.value })}
                    placeholder="Role name"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-gray-400 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={role.required}
                      onChange={e => updateRole(role.id, { required: e.target.checked })}
                      className="accent-orange-500"
                    />
                    Required
                  </label>
                  <button onClick={() => removeRole(role.id)} className="text-red-400/70 hover:text-red-400 text-xs px-2">✕</button>
                </div>
                <input
                  type="text"
                  value={role.description}
                  onChange={e => updateRole(role.id, { description: e.target.value })}
                  placeholder="Role description (optional)"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
            ))}
            <button onClick={addRole} className="text-orange-400 hover:text-orange-300 text-sm flex items-center gap-1">
              + Add role
            </button>
          </div>
        )}

        {/* Timing tab */}
        {activeTab === 'timing' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">Break the session into timed phases — onboarding, main play, debrief, etc.</p>
              {totalDuration > 0 && (
                <span className="text-xs text-gray-500">Total: {totalDuration}m</span>
              )}
            </div>
            {timingBlocks.map((block, i) => (
              <div key={block.id} className="bg-white/4 border border-white/8 rounded-xl p-4 space-y-2">
                <div className="flex gap-2">
                  <span className="text-xs text-gray-600 bg-white/5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <input
                    type="text"
                    value={block.label}
                    onChange={e => updateBlock(block.id, { label: e.target.value })}
                    placeholder="Phase label (e.g. Rules walkthrough)"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    value={block.duration_minutes}
                    onChange={e => updateBlock(block.id, { duration_minutes: Number(e.target.value) })}
                    min={1} max={180}
                    className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-center"
                    title="minutes"
                  />
                  <span className="text-xs text-gray-600 self-center">min</span>
                  <button onClick={() => removeBlock(block.id)} className="text-red-400/70 hover:text-red-400 text-xs px-2">✕</button>
                </div>
                <div className="pl-8 space-y-1">
                  <input
                    type="text"
                    value={block.description}
                    onChange={e => updateBlock(block.id, { description: e.target.value })}
                    placeholder="Description for testers"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm"
                  />
                  <input
                    type="text"
                    value={block.facilitator_notes}
                    onChange={e => updateBlock(block.id, { facilitator_notes: e.target.value })}
                    placeholder="Facilitator notes (private)"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-400"
                  />
                </div>
              </div>
            ))}
            <button onClick={addBlock} className="text-orange-400 hover:text-orange-300 text-sm flex items-center gap-1">
              + Add timing block
            </button>
          </div>
        )}

        {/* Tasks tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">Define specific things testers should do — and what metrics to capture for each.</p>
            {tasks.map(task => (
              <div key={task.id} className="bg-white/4 border border-white/8 rounded-xl p-4 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={task.label}
                    onChange={e => updateTask(task.id, { label: e.target.value })}
                    placeholder="Task label (e.g. Complete first turn)"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm"
                  />
                  {timingBlocks.length > 0 && (
                    <select
                      value={task.timing_block_id}
                      onChange={e => updateTask(task.id, { timing_block_id: e.target.value })}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs max-w-[140px]"
                    >
                      <option value="">No phase</option>
                      {timingBlocks.map(b => (
                        <option key={b.id} value={b.id}>{b.label || 'Unnamed block'}</option>
                      ))}
                    </select>
                  )}
                  <button onClick={() => removeTask(task.id)} className="text-red-400/70 hover:text-red-400 text-xs px-2">✕</button>
                </div>
                <input
                  type="text"
                  value={task.description}
                  onChange={e => updateTask(task.id, { description: e.target.value })}
                  placeholder="What should the tester do?"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm"
                />
                <input
                  type="text"
                  value={task.expected_outcome}
                  onChange={e => updateTask(task.id, { expected_outcome: e.target.value })}
                  placeholder="Expected outcome"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm"
                />
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Metrics to capture:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {METRIC_OPTIONS.map(m => (
                      <button
                        key={m}
                        onClick={() => toggleMetric(task.id, m)}
                        className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                          task.metrics_to_capture.includes(m)
                            ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                            : 'border-white/10 text-gray-500 hover:border-white/20'
                        }`}
                      >
                        {m.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addTask} className="text-orange-400 hover:text-orange-300 text-sm flex items-center gap-1">
              + Add task
            </button>
            {timingBlocks.length === 0 && tasks.length === 0 && (
              <p className="text-xs text-gray-600 italic">
                Add timing blocks first to organize tasks into session phases.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Summary bar */}
      <div className="bg-white/4 border border-white/8 rounded-xl px-4 py-3 flex flex-wrap gap-4 text-xs text-gray-400">
        <span>🎭 {roles.length} roles</span>
        <span>⏱ {timingBlocks.length} timing blocks ({totalDuration}m total)</span>
        <span>✅ {tasks.length} scripted tasks</span>
        <span>👥 max {maxTesters} testers</span>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {success && <p className="text-green-400 text-sm">{success}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
      >
        {saving ? 'Saving...' : existing ? 'Update Template' : 'Create Template'}
      </button>
    </div>
  )
}
