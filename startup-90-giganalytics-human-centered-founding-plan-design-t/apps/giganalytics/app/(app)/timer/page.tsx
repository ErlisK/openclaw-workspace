'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Stream { id: string; name: string; color: string }
interface TimeEntry { id: string; started_at: string; ended_at?: string; duration_minutes?: number; entry_type: string; note?: string; streams?: { name: string; color: string } }

function formatDuration(ms: number) {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function TimerPage() {
  const [streams, setStreams] = useState<Stream[]>([])
  const [selectedStream, setSelectedStream] = useState('')
  const [running, setRunning] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [entryType, setEntryType] = useState('billable')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('streams').select('id,name,color').then(({ data }) => {
      setStreams(data ?? [])
      if (data?.[0]) setSelectedStream(data[0].id)
    })
    // Restore from localStorage
    const saved = localStorage.getItem('ga_timer')
    if (saved) {
      const { startTime: st, streamId } = JSON.parse(saved)
      setStartTime(st)
      setRunning(true)
      setSelectedStream(streamId)
    }
    fetchEntries()
  }, [])

  useEffect(() => {
    if (running && startTime) {
      intervalRef.current = setInterval(() => setElapsed(Date.now() - startTime), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, startTime])

  async function fetchEntries() {
    const res = await fetch('/api/timer')
    if (res.ok) {
      const { entries } = await res.json()
      setEntries(entries ?? [])
    }
  }

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
    const durationMs = endTime - startTime
    const durationMinutes = Math.round(durationMs / 60000)
    if (durationMinutes < 1) {
      setStartTime(null)
      return
    }

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
        streamId: fd.get('streamId') as string || null,
        startedAt: start.toISOString(),
        endedAt: now.toISOString(),
        durationMinutes: total,
        entryType: fd.get('entryType') as string,
        note: fd.get('note') as string || null,
      }),
    })
    setSaving(false)
    form.reset()
    fetchEntries()
  }

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Timer</h1>
      <p className="text-gray-500 text-sm mb-6">Track time per income stream.</p>

      {/* Timer */}
      <div className={`rounded-xl border-2 p-5 mb-4 ${running ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center gap-3 mb-3">
          <select
            value={selectedStream}
            onChange={e => setSelectedStream(e.target.value)}
            disabled={running}
            className="border rounded-lg px-3 py-2 text-sm flex-1 disabled:opacity-60"
          >
            <option value="">-- select stream --</option>
            {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {running ? (
            <button
              onClick={handleStop}
              className="bg-red-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-red-700"
            >■ Stop</button>
          ) : (
            <button
              onClick={handleStart}
              disabled={!selectedStream}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >▶ Start</button>
          )}
        </div>
        {running && (
          <div className="text-center">
            <div className="font-mono text-4xl font-bold text-red-700">{formatDuration(elapsed)}</div>
            <div className="text-sm text-gray-600 mt-1">
              {streams.find(s => s.id === selectedStream)?.name ?? 'Unknown stream'}
            </div>
            <select
              value={entryType}
              onChange={e => setEntryType(e.target.value)}
              className="border rounded px-2 py-1 text-xs mt-2 mr-2"
            >
              <option value="billable">Billable</option>
              <option value="proposal">Proposal</option>
              <option value="admin">Admin</option>
              <option value="revision">Revision</option>
            </select>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="border rounded px-2 py-1 text-xs mt-2 w-40"
            />
          </div>
        )}
      </div>

      {/* Quick log */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <h3 className="font-medium text-gray-800 mb-3">+ Log time (retroactive)</h3>
        <form onSubmit={handleManualLog} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Stream</label>
              <select name="streamId" className="w-full border rounded px-2 py-1.5 text-sm">
                {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Duration</label>
              <div className="flex gap-1 items-center">
                <input name="hours" type="number" min="0" placeholder="2" className="border rounded px-2 py-1.5 text-sm w-14" />
                <span className="text-xs text-gray-400">h</span>
                <input name="minutes" type="number" min="0" max="59" placeholder="30" className="border rounded px-2 py-1.5 text-sm w-14" />
                <span className="text-xs text-gray-400">m</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <select name="entryType" className="border rounded px-2 py-1.5 text-sm">
              <option value="billable">Billable</option>
              <option value="proposal">Proposal</option>
              <option value="admin">Admin</option>
              <option value="revision">Revision</option>
            </select>
            <input name="note" placeholder="Note (optional)" className="flex-1 border rounded px-2 py-1.5 text-sm" />
            <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium disabled:opacity-50">
              {saving ? '…' : 'Save'}
            </button>
          </div>
        </form>
      </div>

      {/* Recent entries */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-medium text-gray-800 mb-3">Recent entries</h3>
        {entries.length === 0 ? (
          <p className="text-gray-400 text-sm">No entries yet. Start a timer or log time above.</p>
        ) : (
          <div className="space-y-2">
            {entries.map(e => (
              <div key={e.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                <div className="font-medium text-gray-800">{e.streams?.name ?? 'Unknown'}</div>
                <div className="text-gray-500">{e.duration_minutes ?? '?'} min</div>
                <div className="text-xs">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                    e.entry_type === 'billable' ? 'bg-green-100 text-green-700' :
                    e.entry_type === 'proposal' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{e.entry_type}</span>
                </div>
                <div className="text-gray-400 text-xs">{e.note}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
