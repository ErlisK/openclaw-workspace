'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Stream { id: string; name: string; color: string }
interface TimeEntry {
  id: string
  started_at: string
  ended_at?: string
  duration_minutes?: number
  entry_type: string
  note?: string
  stream_id?: string
  streams?: { name: string; color: string }
}
interface IcsPreviewItem {
  summary: string
  date: string
  durationMinutes: number
  streamHint: string | null
  entryType: string
  confidence: string
}

function formatDuration(ms: number) {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatMins(mins: number) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const ENTRY_TYPE_COLORS: Record<string, string> = {
  billable: 'bg-green-100 text-green-700',
  proposal: 'bg-yellow-100 text-yellow-700',
  admin: 'bg-gray-100 text-gray-600',
  revision: 'bg-orange-100 text-orange-700',
}

// ─── Inline Quick-Edit Row ────────────────────────────────────────────────────

function EntryRow({ entry, streams, onUpdate, onDelete }: {
  entry: TimeEntry
  streams: Stream[]
  onUpdate: (id: string, patch: Partial<{ durationMinutes: number; note: string; entryType: string; streamId: string }>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draftMins, setDraftMins] = useState(String(entry.duration_minutes ?? 0))
  const [draftNote, setDraftNote] = useState(entry.note ?? '')
  const [draftType, setDraftType] = useState(entry.entry_type)
  const [draftStream, setDraftStream] = useState(entry.stream_id ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await onUpdate(entry.id, {
      durationMinutes: parseInt(draftMins) || (entry.duration_minutes ?? 0),
      note: draftNote,
      entryType: draftType,
      streamId: draftStream || undefined,
    })
    setSaving(false)
    setEditing(false)
  }

  const streamColor = entry.streams?.color || '#6b7280'
  const date = new Date(entry.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  if (!editing) {
    return (
      <div className="flex items-center gap-3 py-2 border-b last:border-0">
        <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: streamColor }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-800 text-sm truncate">
              {entry.streams?.name ?? 'Unassigned'}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ENTRY_TYPE_COLORS[entry.entry_type] ?? 'bg-gray-100 text-gray-600'}`}>
              {entry.entry_type}
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {date} · {formatMins(entry.duration_minutes ?? 0)}
            {entry.note && ` · ${entry.note}`}
          </div>
        </div>
        <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-blue-600 p-1 text-xs">✏️</button>
        <button onClick={() => onDelete(entry.id)} className="text-gray-300 hover:text-red-500 p-1 text-xs">✕</button>
      </div>
    )
  }

  return (
    <div className="border rounded-xl p-3 mb-2 bg-blue-50 border-blue-200">
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Stream</label>
          <select value={draftStream} onChange={e => setDraftStream(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm">
            <option value="">— unassigned —</option>
            {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Duration (min)</label>
          <input type="number" min="1" value={draftMins}
            onChange={e => setDraftMins(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Type</label>
          <select value={draftType} onChange={e => setDraftType(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm">
            {['billable', 'proposal', 'admin', 'revision'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Note</label>
          <input value={draftNote} onChange={e => setDraftNote(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={() => setEditing(false)} className="text-sm text-gray-500 px-3 py-1.5 rounded hover:bg-gray-100">Cancel</button>
        <button onClick={save} disabled={saving}
          className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded font-medium disabled:opacity-50">
          {saving ? '…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ─── ICS Upload Panel ─────────────────────────────────────────────────────────

function IcsPanel({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ total: number; importable: number; skipped: number; preview: IcsPreviewItem[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number; total: number } | null>(null)
  const [error, setError] = useState('')

  async function handleFile(f: File) {
    setFile(f)
    setPreview(null)
    setResult(null)
    setError('')
    setLoading(true)
    const fd = new FormData()
    fd.append('file', f)
    fd.append('preview', 'true')
    const res = await fetch('/api/ics', { method: 'POST', body: fd })
    const data = await res.json()
    setLoading(false)
    if (res.ok) setPreview(data)
    else setError(data.error ?? 'Failed to parse calendar file')
  }

  async function handleImport() {
    if (!file) return
    setLoading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/ics', { method: 'POST', body: fd })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      setResult(data)
      onImported()
    } else {
      setError(data.error ?? 'Import failed')
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full text-left border border-dashed border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
        📅 Import from calendar (.ics) — optional
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium text-gray-800 text-sm">Import from calendar</div>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
      </div>

      <div
        className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-blue-300 transition-colors mb-3"
        onClick={() => document.getElementById('ics-input')?.click()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onDragOver={e => e.preventDefault()}
      >
        {file ? (
          <div>
            <div className="text-2xl mb-1">📅</div>
            <div className="text-sm font-medium text-gray-700">{file.name}</div>
          </div>
        ) : (
          <div>
            <div className="text-2xl mb-1">📅</div>
            <div className="text-sm text-gray-500">Drop .ics file or click to browse</div>
            <div className="text-xs text-gray-400 mt-1">Google Calendar · Apple Calendar · Outlook</div>
          </div>
        )}
        <input id="ics-input" type="file" accept=".ics" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      </div>

      {loading && <div className="text-sm text-gray-400 text-center">Analyzing calendar…</div>}

      {error && <div className="text-red-600 text-sm mb-3 bg-red-50 rounded p-2">{error}</div>}

      {preview && !result && (
        <div>
          <div className="text-xs text-gray-500 mb-2">
            Found {preview.total} events · {preview.importable} work sessions · {preview.skipped} skipped
          </div>
          <div className="space-y-1 mb-3 max-h-40 overflow-y-auto">
            {preview.preview.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs border-b py-1 last:border-0">
                <span className={`px-1.5 py-0.5 rounded font-medium ${
                  item.confidence === 'high' ? 'bg-green-100 text-green-700' :
                  item.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-500'
                }`}>{item.confidence}</span>
                <span className="truncate text-gray-700">{item.summary}</span>
                <span className="text-gray-400 whitespace-nowrap">{formatMins(item.durationMinutes)}</span>
                {item.streamHint && <span className="text-blue-600 whitespace-nowrap">→ {item.streamHint}</span>}
              </div>
            ))}
          </div>
          <button onClick={handleImport} disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50">
            {loading ? 'Importing…' : `Import ${preview.importable} sessions`}
          </button>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
          ✅ Imported {result.imported} time entries from {result.total} calendar events
        </div>
      )}
    </div>
  )
}

// ─── Main Timer Page ──────────────────────────────────────────────────────────

export default function TimerPage() {
  const [streams, setStreams] = useState<Stream[]>([])
  const [selectedStream, setSelectedStream] = useState('')
  const [running, setRunning] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [entryType, setEntryType] = useState('billable')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [showManualLog, setShowManualLog] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchEntries = useCallback(async () => {
    const res = await fetch('/api/timer')
    if (res.ok) {
      const { entries } = await res.json()
      setEntries(entries ?? [])
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('streams').select('id,name,color').then(({ data }) => {
      setStreams(data ?? [])
      if (data?.[0]) setSelectedStream(data[0].id)
    })
    // Restore running timer from localStorage
    const saved = localStorage.getItem('ga_timer')
    if (saved) {
      try {
        const { startTime: st, streamId } = JSON.parse(saved)
        setStartTime(st)
        setRunning(true)
        setSelectedStream(streamId)
        setElapsed(Date.now() - st)
      } catch {}
    }
    fetchEntries()
  }, [fetchEntries])

  useEffect(() => {
    if (running && startTime) {
      intervalRef.current = setInterval(() => setElapsed(Date.now() - startTime), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, startTime])

  function handleStart() {
    const now = Date.now()
    setStartTime(now)
    setRunning(true)
    setElapsed(0)
    localStorage.setItem('ga_timer', JSON.stringify({ startTime: now, streamId: selectedStream }))
  }

  async function handleStop() {
    if (!startTime) return
    setRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
    localStorage.removeItem('ga_timer')

    const endTime = Date.now()
    const durationMinutes = Math.round((endTime - startTime) / 60000)
    if (durationMinutes < 1) { setStartTime(null); return }

    setSaving(true)
    await fetch('/api/timer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'log',
        streamId: selectedStream || null,
        startedAt: new Date(startTime).toISOString(),
        endedAt: new Date(endTime).toISOString(),
        durationMinutes,
        entryType,
        note: note || null,
      }),
    })
    setSaving(false)
    setStartTime(null)
    setElapsed(0)
    setNote('')
    fetchEntries()
  }

  async function handleManualLog(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const hrs = parseFloat(fd.get('hours') as string) || 0
    const mins = parseFloat(fd.get('minutes') as string) || 0
    const total = Math.round(hrs * 60 + mins)
    if (total < 1) return
    setSaving(true)
    const now = new Date()
    const start = new Date(now.getTime() - total * 60000)
    await fetch('/api/timer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'log',
        streamId: fd.get('streamId') || null,
        startedAt: start.toISOString(),
        endedAt: now.toISOString(),
        durationMinutes: total,
        entryType: fd.get('entryType'),
        note: fd.get('note') || null,
      }),
    })
    setSaving(false)
    form.reset()
    setShowManualLog(false)
    fetchEntries()
  }

  async function handleUpdate(id: string, patch: { durationMinutes?: number; note?: string; entryType?: string; streamId?: string }) {
    await fetch('/api/timer', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    })
    fetchEntries()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/timer?id=${id}`, { method: 'DELETE' })
    fetchEntries()
  }

  const activeStream = streams.find(s => s.id === selectedStream)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Timer</h1>
        <p className="text-gray-500 text-sm mb-5">Track time per income stream.</p>

        {/* ── Big tap target timer ── */}
        <div className={`rounded-2xl border-2 p-6 mb-4 transition-all ${
          running ? 'border-red-300 bg-red-50 shadow-lg' : 'border-gray-200 bg-white shadow-sm'
        }`}>
          {/* Stream selector */}
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">Income stream</label>
            <div className="flex flex-wrap gap-2">
              {streams.map(s => (
                <button
                  key={s.id}
                  onClick={() => !running && setSelectedStream(s.id)}
                  disabled={running}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all disabled:opacity-60 ${
                    selectedStream === s.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                  style={selectedStream === s.id ? { borderColor: s.color } : {}}
                >
                  {s.name}
                </button>
              ))}
              {streams.length === 0 && (
                <div className="text-sm text-gray-400">
                  <a href="/import" className="text-blue-500 hover:underline">Import transactions</a> first to create streams
                </div>
              )}
            </div>
          </div>

          {/* Timer display */}
          {running && (
            <div className="text-center py-4">
              <div className="font-mono text-5xl font-bold text-red-600 tabular-nums">
                {formatDuration(elapsed)}
              </div>
              <div className="text-sm text-gray-500 mt-2 flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span>Recording · {activeStream?.name ?? 'Unknown stream'}</span>
              </div>
            </div>
          )}

          {/* Entry type */}
          {running && (
            <div className="flex gap-2 mt-3 mb-4">
              {['billable', 'proposal', 'admin', 'revision'].map(t => (
                <button
                  key={t}
                  onClick={() => setEntryType(t)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    entryType === t
                      ? ENTRY_TYPE_COLORS[t] + ' border-current'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {running && (
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a note (optional)"
              className="w-full border rounded-xl px-4 py-3 text-sm mb-4 focus:ring-2 focus:ring-blue-200 focus:outline-none"
            />
          )}

          {/* Start / Stop button — big tap target */}
          <button
            onClick={running ? handleStop : handleStart}
            disabled={!running && !selectedStream}
            className={`w-full py-5 rounded-2xl text-xl font-bold transition-all active:scale-95 disabled:opacity-40 ${
              running
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-md'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
            }`}
          >
            {saving ? '…' : running ? '⏹ Stop' : '▶ Start Timer'}
          </button>
        </div>

        {/* ── Quick log toggle ── */}
        <button
          onClick={() => setShowManualLog(!showManualLog)}
          className="w-full text-left text-sm text-gray-500 hover:text-blue-600 px-4 py-2 mb-2 flex items-center gap-2"
        >
          <span className="text-base">{showManualLog ? '▾' : '▸'}</span>
          Log time retroactively
        </button>

        {showManualLog && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <form onSubmit={handleManualLog} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Stream</label>
                  <select name="streamId" className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">— unassigned —</option>
                    {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Duration</label>
                  <div className="flex gap-1 items-center">
                    <input name="hours" type="number" min="0" placeholder="2"
                      className="border rounded-lg px-2 py-2 text-sm w-14" />
                    <span className="text-xs text-gray-400">h</span>
                    <input name="minutes" type="number" min="0" max="59" placeholder="30"
                      className="border rounded-lg px-2 py-2 text-sm w-14" />
                    <span className="text-xs text-gray-400">m</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <select name="entryType" className="border rounded-lg px-2 py-2 text-sm">
                  {['billable', 'proposal', 'admin', 'revision'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input name="note" placeholder="Note (optional)"
                  className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                <button type="submit" disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? '…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── ICS import ── */}
        <div className="mb-4">
          <IcsPanel onImported={fetchEntries} />
        </div>

        {/* ── Recent entries ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Recent entries</h3>
          {entries.length === 0 ? (
            <p className="text-gray-400 text-sm">No entries yet. Start the timer or log time above.</p>
          ) : (
            <div>
              {entries.map(e => (
                <EntryRow
                  key={e.id}
                  entry={e}
                  streams={streams}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
