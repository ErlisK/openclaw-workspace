'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

interface ChangeEntry {
  type: 'added' | 'changed' | 'fixed' | 'removed' | 'balance'
  section: string
  description: string
}

const UID = () => Math.random().toString(36).slice(2, 8)

const TYPE_OPTIONS: Array<{ value: ChangeEntry['type']; label: string; icon: string }> = [
  { value: 'added',   label: 'Added',   icon: '+' },
  { value: 'changed', label: 'Changed', icon: '~' },
  { value: 'fixed',   label: 'Fixed',   icon: '✓' },
  { value: 'removed', label: 'Removed', icon: '−' },
  { value: 'balance', label: 'Balance', icon: '⚖' },
]

const TYPE_COLORS: Record<string, string> = {
  added:   'bg-green-500/15 text-green-300 border-green-500/25',
  changed: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
  fixed:   'bg-purple-500/15 text-purple-300 border-purple-500/25',
  removed: 'bg-red-500/15 text-red-300 border-red-500/25',
  balance: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/25',
}

interface ChangeRow extends ChangeEntry { id: string }

export default function RuleUploader({ projectId }: { projectId: string }) {
  const [versionLabel, setVersionLabel] = useState('')
  const [semver, setSemver] = useState('')
  const [diffSummary, setDiffSummary] = useState('')
  const [isBreaking, setIsBreaking] = useState(false)
  const [notes, setNotes] = useState('')
  const [changelog, setChangelog] = useState<ChangeRow[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [showChangelog, setShowChangelog] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      if (!versionLabel) {
        const base = f.name.replace(/\.[^.]+$/, '')
        const match = base.match(/v?\d+[\.\d]*/i)
        if (match) {
          const raw = match[0].replace(/^v/, '')
          setVersionLabel(`v${raw}`)
          setSemver(raw)
        }
      }
    }
  }

  function handleVersionLabelChange(val: string) {
    setVersionLabel(val)
    const raw = val.replace(/^v/, '')
    if (/^\d+(\.\d+)*$/.test(raw)) setSemver(raw)
  }

  // Changelog row management
  const addRow = () => setChangelog(c => [...c, { id: UID(), type: 'changed', section: '', description: '' }])
  const updateRow = (id: string, patch: Partial<ChangeRow>) =>
    setChangelog(c => c.map(r => r.id === id ? { ...r, ...patch } : r))
  const removeRow = (id: string) => setChangelog(c => c.filter(r => r.id !== id))

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !versionLabel) return
    setUploading(true)
    setError('')
    setProgress(10)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setUploading(false); return }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${user.id}/${projectId}/${versionLabel}/${safeName}`

    setProgress(30)
    const { error: uploadErr } = await supabase.storage
      .from('rule-uploads')
      .upload(storagePath, file, { upsert: true, contentType: file.type })

    if (uploadErr) {
      setError(uploadErr.message)
      setUploading(false)
      setProgress(0)
      return
    }

    setProgress(60)

    // Use the new /api/rule-versions endpoint with changelog data
    const changelogClean = changelog
      .filter(c => c.description.trim())
      .map(({ type, section, description }) => ({ type, section: section.trim(), description: description.trim() }))

    const res = await fetch('/api/rule-versions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        version_label: versionLabel,
        semver: semver || versionLabel.replace(/^v/, ''),
        changelog: changelogClean,
        diff_summary: diffSummary.trim() || (changelogClean.length > 0 ? `${changelogClean.length} change${changelogClean.length > 1 ? 's' : ''}` : null),
        is_breaking_change: isBreaking,
        notes: notes.trim() || null,
        storage_path: storagePath,
        file_name: file.name,
        file_size_bytes: file.size,
      }),
    })

    const data = await res.json()
    if (!data.success) {
      setError(data.error ?? 'Failed to save version')
      setUploading(false)
      setProgress(0)
      return
    }

    setProgress(100)
    setFile(null)
    setVersionLabel('')
    setSemver('')
    setDiffSummary('')
    setIsBreaking(false)
    setNotes('')
    setChangelog([])
    setShowChangelog(false)
    if (fileRef.current) fileRef.current.value = ''
    setTimeout(() => { setProgress(0); router.refresh() }, 500)
  }

  return (
    <form onSubmit={handleUpload} className="bg-white/[0.03] border border-white/10 rounded-xl p-5 space-y-4">
      {/* File + version label */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Version label <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={versionLabel}
            onChange={(e) => handleVersionLabelChange(e.target.value)}
            required
            placeholder="v1.3.0"
            className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">PDF / Image</label>
          <input
            ref={fileRef}
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.png,.jpg,.jpeg"
            required
            className="w-full text-xs text-gray-400 bg-white/5 border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500 file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:bg-orange-500/20 file:text-orange-400 file:text-xs cursor-pointer"
          />
        </div>
      </div>

      {/* Diff summary */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">
          What changed? <span className="text-gray-600">(shown to testers in surveys)</span>
        </label>
        <input
          type="text"
          value={diffSummary}
          onChange={(e) => setDiffSummary(e.target.value)}
          placeholder="e.g. Rebalanced combat actions, fixed ambiguous turn order wording"
          className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
        />
      </div>

      {/* Breaking change flag */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isBreaking}
          onChange={e => setIsBreaking(e.target.checked)}
          className="accent-red-500 w-4 h-4"
        />
        <span className="text-sm text-gray-400">
          ⚠ Breaking change — core mechanics significantly changed
        </span>
      </label>

      {/* Changelog toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowChangelog(!showChangelog)}
          className="text-xs text-orange-400/80 hover:text-orange-400 flex items-center gap-1"
        >
          {showChangelog ? '▼' : '▶'} Structured changelog {changelog.length > 0 ? `(${changelog.length} entries)` : '(optional)'}
        </button>

        {showChangelog && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-gray-500 mb-2">
              Log specific changes — shown as a diff card to testers before and after each session.
            </p>
            {changelog.map(row => (
              <div key={row.id} className="flex gap-2 items-start">
                <select
                  value={row.type}
                  onChange={e => updateRow(row.id, { type: e.target.value as ChangeEntry['type'] })}
                  className={`text-xs px-2 py-1.5 rounded-lg border shrink-0 ${TYPE_COLORS[row.type]} bg-transparent`}
                >
                  {TYPE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.icon} {o.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={row.section}
                  onChange={e => updateRow(row.id, { section: e.target.value })}
                  placeholder="Section (e.g. Combat)"
                  className="w-28 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-300 placeholder-gray-600 shrink-0"
                />
                <input
                  type="text"
                  value={row.description}
                  onChange={e => updateRow(row.id, { description: e.target.value })}
                  placeholder="Describe the change…"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-300 placeholder-gray-600"
                />
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="text-red-400/60 hover:text-red-400 text-xs px-1.5 shrink-0 mt-1"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addRow}
              className="text-orange-400/70 hover:text-orange-400 text-xs flex items-center gap-1 mt-1"
            >
              + Add changelog entry
            </button>
          </div>
        )}
      </div>

      {/* Notes (internal) */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">
          Internal notes <span className="text-gray-600">(not shown to testers)</span>
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. This version is for the Feb cohort — do not share with March group"
          className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
        />
      </div>

      {progress > 0 && progress < 100 && (
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-orange-500 transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
        </div>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <button
        type="submit"
        disabled={uploading || !file || !versionLabel}
        className="w-full bg-orange-500/20 hover:bg-orange-500/40 border border-orange-500/30 disabled:opacity-40 text-orange-400 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        {uploading ? `Uploading… ${progress}%` : '⬆ Upload Rule Version'}
      </button>
    </form>
  )
}
