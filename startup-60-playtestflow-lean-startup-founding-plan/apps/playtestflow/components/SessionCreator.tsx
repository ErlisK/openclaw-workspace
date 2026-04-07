'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface RuleVersion {
  id: string
  version_label: string
  file_name: string
}

export default function SessionCreator({
  projectId,
  ruleVersions,
}: {
  projectId: string
  ruleVersions: RuleVersion[]
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [ruleVersionId, setRuleVersionId] = useState(ruleVersions[0]?.id ?? '')
  const [scheduledAt, setScheduledAt] = useState('')
  const [maxTesters, setMaxTesters] = useState(6)
  const [platform, setPlatform] = useState('Tabletop Simulator')
  const [meetingUrl, setMeetingUrl] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(90)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [upgradeRequired, setUpgradeRequired] = useState(false)
  const router = useRouter()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setUpgradeRequired(false)

    // ── Route through API — server-side paywall check ─────────────────────────
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        title,
        rule_version_id: ruleVersionId || null,
        scheduled_at: scheduledAt || null,
        max_testers: maxTesters,
        platform: platform || null,
        meeting_url: meetingUrl || null,
        duration_minutes: durationMinutes,
        status: 'recruiting',
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Failed to create session')
      if (data.upgrade_required) setUpgradeRequired(true)
      setLoading(false)
      return
    }

    setOpen(false)
    setTitle('')
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-white/[0.03] border border-dashed border-white/20 hover:border-orange-500/40 text-gray-400 hover:text-orange-400 py-3 rounded-xl text-sm font-medium transition-colors"
      >
        + New Session
      </button>
    )
  }

  return (
    <form onSubmit={handleCreate} className="bg-white/[0.03] border border-white/10 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium">New Playtest Session</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">
          Session title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="e.g. Blind playtest — combat rules v1.3"
          className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Rules version</label>
          <select
            value={ruleVersionId}
            onChange={(e) => setRuleVersionId(e.target.value)}
            className="w-full bg-[#0d1117] border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
          >
            <option value="">None selected</option>
            {ruleVersions.map((v) => (
              <option key={v.id} value={v.id}>{v.version_label} — {v.file_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Max testers</label>
          <input
            type="number"
            value={maxTesters}
            onChange={(e) => setMaxTesters(parseInt(e.target.value))}
            min={1}
            max={50}
            className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Meeting URL (Zoom, Google Meet, Discord…)</label>
        <input
          type="url"
          value={meetingUrl}
          onChange={(e) => setMeetingUrl(e.target.value)}
          placeholder="https://zoom.us/j/..."
          className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Scheduled date/time</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Platform</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full bg-[#0d1117] border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
          >
            <option>Tabletop Simulator</option>
            <option>Tabletopia</option>
            <option>Screentop.gg</option>
            <option>Roll20</option>
            <option>Zoom + physical</option>
            <option>Discord</option>
            <option>Async / email</option>
            <option>Other</option>
          </select>
        </div>
      </div>

      {error && (
        <div className={`text-xs rounded-lg px-3 py-2 ${upgradeRequired ? 'text-orange-300 bg-orange-500/10 border border-orange-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/20'}`}>
          <div>{error}</div>
          {upgradeRequired && (
            <Link href="/pricing" className="inline-block mt-1 font-semibold underline underline-offset-2">
              Upgrade plan →
            </Link>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !title}
        className="w-full bg-orange-500/20 hover:bg-orange-500/40 border border-orange-500/30 disabled:opacity-40 text-orange-400 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        {loading ? 'Creating…' : 'Create Session'}
      </button>
    </form>
  )
}
