'use client'

import { useState } from 'react'

interface Props {
  sessionId: string
  token: string | null
  testerName: string
  testerEmail: string
  slots: string[] // ISO timestamps
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtHour(d: Date) {
  const h = d.getUTCHours()
  if (h === 0) return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

function groupByDay(slots: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {}
  for (const s of slots) {
    const d = new Date(s)
    const key = d.toISOString().slice(0, 10)
    if (!groups[key]) groups[key] = []
    groups[key].push(s)
  }
  return groups
}

export default function AvailabilityPicker({ sessionId, token, testerName, testerEmail, slots }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [name, setName] = useState(testerName)
  const [email, setEmail] = useState(testerEmail)
  const [tz, setTz] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [dragMode, setDragMode] = useState<'select' | 'deselect'>('select')

  const grouped = groupByDay(slots)
  const days = Object.keys(grouped).sort()

  function toggleSlot(slot: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(slot)) next.delete(slot)
      else next.add(slot)
      return next
    })
  }

  function handleMouseDown(slot: string) {
    setIsDragging(true)
    const isSelected = selected.has(slot)
    setDragMode(isSelected ? 'deselect' : 'select')
    setSelected(prev => {
      const next = new Set(prev)
      if (isSelected) next.delete(slot)
      else next.add(slot)
      return next
    })
  }

  function handleMouseEnter(slot: string) {
    if (!isDragging) return
    setSelected(prev => {
      const next = new Set(prev)
      if (dragMode === 'select') next.add(slot)
      else next.delete(slot)
      return next
    })
  }

  async function handleSubmit() {
    if (!token && !email) { setError('Please enter your email'); return }
    if (selected.size === 0) { setError('Please select at least one time slot'); return }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          token: token ?? undefined,
          tester_email: token ? undefined : email,
          tester_name: name || email?.split('@')[0],
          available_slots: Array.from(selected),
          timezone: tz,
          notes: notes || undefined,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? 'Submission failed')
      setSubmitted(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-xl font-bold mb-2">Availability submitted!</h2>
        <p className="text-gray-400 text-sm">
          Thanks {name || 'for sharing'}! You submitted <strong className="text-white">{selected.size} time slots</strong>.
          The organiser will confirm a time and send you a calendar invite.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6" onMouseUp={() => setIsDragging(false)}>
      {/* Name/email (if no token) */}
      {!token && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Your name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Alex"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Email *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-blue-300">
        Click (or click + drag) to select times you're available. Green = you're free.
        <span className="text-xs text-blue-400/70 ml-2">Selected: {selected.size} slots</span>
      </div>

      {/* Timezone selector */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>Timezone:</span>
        <select
          value={tz}
          onChange={e => setTz(e.target.value)}
          className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-gray-300"
        >
          {Intl.supportedValuesOf?.('timeZone').map(z => (
            <option key={z} value={z}>{z}</option>
          )) ?? <option value={tz}>{tz}</option>}
        </select>
        <span className="text-gray-600">(Times shown in UTC)</span>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Day headers */}
          <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: `80px repeat(${days.length}, 1fr)` }}>
            <div />
            {days.map(day => {
              const d = new Date(day + 'T00:00:00Z')
              return (
                <div key={day} className="text-center text-xs text-gray-400">
                  <div className="font-medium">{DAYS[d.getUTCDay()]}</div>
                  <div className="text-gray-600">{MONTHS[d.getUTCMonth()]} {d.getUTCDate()}</div>
                </div>
              )
            })}
          </div>

          {/* Rows by hour */}
          {Array.from({ length: 14 }, (_, i) => i + 8).map(hour => (
            <div
              key={hour}
              className="grid gap-1 mb-0.5"
              style={{ gridTemplateColumns: `80px repeat(${days.length}, 1fr)` }}
            >
              <div className="text-xs text-gray-600 text-right pr-3 flex items-center justify-end h-8">
                {fmtHour(new Date(`2000-01-01T${String(hour).padStart(2, '0')}:00:00Z`))}
              </div>
              {days.map(day => {
                const slot = `${day}T${String(hour).padStart(2, '0')}:00:00.000Z`
                const isSelected = selected.has(slot)
                return (
                  <div
                    key={slot}
                    className={`h-8 rounded cursor-pointer transition-colors border ${
                      isSelected
                        ? 'bg-green-500/40 border-green-500/60 hover:bg-green-500/50'
                        : 'bg-white/4 border-white/8 hover:bg-white/8 hover:border-white/15'
                    }`}
                    onMouseDown={() => handleMouseDown(slot)}
                    onMouseEnter={() => handleMouseEnter(slot)}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Notes (optional)</label>
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="e.g. Prefer weekend mornings, unavailable after 8pm"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting || selected.size === 0}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-colors"
      >
        {submitting ? 'Submitting…' : `Submit Availability (${selected.size} slots selected)`}
      </button>
    </div>
  )
}
