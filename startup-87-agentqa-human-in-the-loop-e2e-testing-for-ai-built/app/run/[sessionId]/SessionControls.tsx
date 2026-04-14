'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// Tier → duration mapping (matches pricing: quick=$5/10min, standard=$10/20min, deep=$15/30min)
export const TIER_DURATION_MS: Record<string, number> = {
  quick: 10 * 60 * 1000,     // 10 minutes
  standard: 20 * 60 * 1000,  // 20 minutes
  deep: 30 * 60 * 1000,      // 30 minutes
}

export type SessionPhase = 'idle' | 'running' | 'paused' | 'complete' | 'abandoned' | 'timed_out'

interface Props {
  sessionId: string
  tier: string
  /** Called when session phase changes so parent can update UI */
  onPhaseChange?: (phase: SessionPhase) => void
  /** Called when session is complete/abandoned with the final notes */
  onComplete?: (notes: string, reason: 'complete' | 'abandoned' | 'timed_out') => void
}

function fmt(ms: number): string {
  if (ms <= 0) return '00:00'
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60).toString().padStart(2, '0')
  const s = (total % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function SessionControls({ sessionId, tier, onPhaseChange, onComplete }: Props) {
  const durationMs = TIER_DURATION_MS[tier] ?? TIER_DURATION_MS.quick

  const [phase, setPhase] = useState<SessionPhase>('idle')
  const [elapsed, setElapsed] = useState(0)    // ms elapsed while running
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const startedAtRef = useRef<number | null>(null)  // wall-clock ms when last started
  const elapsedAtPauseRef = useRef<number>(0)       // elapsed accumulated before current run
  const rafRef = useRef<number | null>(null)
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Patch session in DB ───────────────────────────────────
  const patchSession = useCallback(async (updates: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setErrorMsg((err as { error?: string }).error ?? `HTTP ${res.status}`)
        return false
      }
      return true
    } catch (e) {
      setErrorMsg(String(e))
      return false
    }
  }, [sessionId])

  // ─── RAF timer ────────────────────────────────────────────
  const tick = useCallback(() => {
    if (startedAtRef.current === null) return
    const now = Date.now()
    const total = elapsedAtPauseRef.current + (now - startedAtRef.current)
    setElapsed(total)
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const stopAutoTimeout = useCallback(() => {
    if (autoStopRef.current !== null) {
      clearTimeout(autoStopRef.current)
      autoStopRef.current = null
    }
  }, [])

  // ─── Auto-timeout handler ─────────────────────────────────
  const handleTimeout = useCallback(async () => {
    stopRaf()
    stopAutoTimeout()
    elapsedAtPauseRef.current = durationMs
    setElapsed(durationMs)
    setPhase('timed_out')
    setShowNotes(true)
    onPhaseChange?.('timed_out')
    await patchSession({
      status: 'complete',
      ended_at: new Date().toISOString(),
      end_reason: 'timed_out',
    })
  }, [durationMs, patchSession, stopRaf, stopAutoTimeout, onPhaseChange])

  // ─── Start ────────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    if (phase !== 'idle' && phase !== 'paused') return
    setErrorMsg(null)
    const now = Date.now()
    const isResume = phase === 'paused'

    if (!isResume) {
      // First start — set started_at in DB and schedule timeout
      const timeoutAt = new Date(now + durationMs).toISOString()
      const ok = await patchSession({
        status: 'active',
        started_at: new Date(now).toISOString(),
        timeout_at: timeoutAt,
      })
      if (!ok) return
    }

    startedAtRef.current = now
    setPhase('running')
    onPhaseChange?.('running')

    // Schedule auto-timeout for remaining time
    const remaining = durationMs - elapsedAtPauseRef.current
    autoStopRef.current = setTimeout(handleTimeout, remaining)
    rafRef.current = requestAnimationFrame(tick)
  }, [phase, durationMs, elapsedAtPauseRef, patchSession, tick, handleTimeout, onPhaseChange])

  // ─── Pause ────────────────────────────────────────────────
  const handlePause = useCallback(() => {
    if (phase !== 'running') return
    stopRaf()
    stopAutoTimeout()
    if (startedAtRef.current !== null) {
      elapsedAtPauseRef.current += Date.now() - startedAtRef.current
      startedAtRef.current = null
    }
    setPhase('paused')
    onPhaseChange?.('paused')
  }, [phase, stopRaf, stopAutoTimeout, onPhaseChange])

  // ─── Stop (end session) ───────────────────────────────────
  const handleStop = useCallback(async (reason: 'complete' | 'abandoned' = 'complete') => {
    if (phase === 'complete' || phase === 'abandoned' || phase === 'timed_out') return
    stopRaf()
    stopAutoTimeout()
    if (startedAtRef.current !== null) {
      elapsedAtPauseRef.current += Date.now() - startedAtRef.current
      startedAtRef.current = null
    }
    setPhase(reason)
    setShowNotes(true)
    onPhaseChange?.(reason)
    await patchSession({
      status: reason,
      ended_at: new Date().toISOString(),
      end_reason: reason,
      notes: notes.trim() || null,
    })
  }, [phase, notes, patchSession, stopRaf, stopAutoTimeout, onPhaseChange])

  // ─── Save notes ───────────────────────────────────────────
  const handleSaveNotes = useCallback(async () => {
    if (!notes.trim()) return
    setSaving(true)
    const ok = await patchSession({ notes: notes.trim() })
    setSaving(false)
    if (ok) {
      onComplete?.(notes, phase as 'complete' | 'abandoned' | 'timed_out')
    }
  }, [notes, phase, patchSession, onComplete])

  // ─── Cleanup on unmount ───────────────────────────────────
  useEffect(() => {
    return () => {
      stopRaf()
      stopAutoTimeout()
    }
  }, [stopRaf, stopAutoTimeout])

  // ─── Derived values ───────────────────────────────────────
  const remaining = Math.max(0, durationMs - elapsed)
  const pct = Math.min(100, (elapsed / durationMs) * 100)
  const isTerminal = ['complete', 'abandoned', 'timed_out'].includes(phase)
  const warning = remaining < 120_000 && remaining > 0 && phase === 'running' // < 2 min

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-2" data-testid="session-controls">
      {/* Timer + progress bar */}
      <div className="flex items-center gap-3">
        {/* Elapsed / remaining */}
        <div className="flex flex-col items-center min-w-[56px]">
          <span
            className={`text-lg font-mono font-bold tabular-nums ${
              warning ? 'text-red-400 animate-pulse' : phase === 'running' ? 'text-white' : 'text-gray-400'
            }`}
            data-testid="timer-remaining"
          >
            {fmt(remaining)}
          </span>
          <span className="text-[10px] text-gray-500">left</span>
        </div>

        {/* Progress bar */}
        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden" data-testid="timer-bar">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isTerminal ? 'bg-gray-500' :
              warning ? 'bg-red-500' :
              'bg-indigo-500'
            }`}
            style={{ width: `${pct}%` }}
            data-testid="timer-progress"
          />
        </div>

        {/* Elapsed */}
        <div className="flex flex-col items-center min-w-[48px]">
          <span className="text-xs font-mono text-gray-500 tabular-nums" data-testid="timer-elapsed">
            {fmt(elapsed)}
          </span>
          <span className="text-[10px] text-gray-600">used</span>
        </div>
      </div>

      {/* Phase badge + buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Phase pill */}
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            phase === 'running' ? 'bg-green-900 text-green-300' :
            phase === 'paused' ? 'bg-yellow-900 text-yellow-300' :
            phase === 'complete' ? 'bg-blue-900 text-blue-300' :
            phase === 'abandoned' ? 'bg-red-900 text-red-300' :
            phase === 'timed_out' ? 'bg-orange-900 text-orange-300' :
            'bg-gray-800 text-gray-400'
          }`}
          data-testid="session-phase"
        >
          {phase === 'idle' ? 'Not started' :
           phase === 'running' ? 'Running' :
           phase === 'paused' ? 'Paused' :
           phase === 'complete' ? 'Complete' :
           phase === 'abandoned' ? 'Abandoned' :
           'Timed out'}
        </span>

        {/* Action buttons */}
        {phase === 'idle' && (
          <button
            onClick={handleStart}
            className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium transition-colors"
            data-testid="btn-start"
          >
            ▶ Start
          </button>
        )}

        {phase === 'running' && (
          <>
            <button
              onClick={handlePause}
              className="px-3 py-1 text-xs bg-yellow-700 hover:bg-yellow-600 text-white rounded font-medium transition-colors"
              data-testid="btn-pause"
            >
              ⏸ Pause
            </button>
            <button
              onClick={() => handleStop('complete')}
              className="px-3 py-1 text-xs bg-green-700 hover:bg-green-600 text-white rounded font-medium transition-colors"
              data-testid="btn-complete"
            >
              ✓ Complete
            </button>
            <button
              onClick={() => handleStop('abandoned')}
              className="px-3 py-1 text-xs bg-red-900 hover:bg-red-800 text-gray-300 rounded transition-colors"
              data-testid="btn-abandon"
            >
              ✕ Abandon
            </button>
          </>
        )}

        {phase === 'paused' && (
          <>
            <button
              onClick={handleStart}
              className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium transition-colors"
              data-testid="btn-resume"
            >
              ▶ Resume
            </button>
            <button
              onClick={() => handleStop('complete')}
              className="px-3 py-1 text-xs bg-green-700 hover:bg-green-600 text-white rounded font-medium transition-colors"
              data-testid="btn-complete"
            >
              ✓ Complete
            </button>
          </>
        )}

        {(phase === 'timed_out') && (
          <span className="text-xs text-orange-400">Time's up — add notes below</span>
        )}
      </div>

      {/* Error */}
      {errorMsg && (
        <p className="text-xs text-red-400" data-testid="session-error">{errorMsg}</p>
      )}

      {/* End-state notes */}
      {(showNotes || isTerminal) && (
        <div className="flex flex-col gap-1.5 mt-1" data-testid="notes-panel">
          <label className="text-xs text-gray-400 font-medium">
            End-state notes <span className="text-gray-600">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="What did you test? Any bugs found? Overall impression?"
            rows={4}
            className="w-full text-xs bg-gray-800 border border-gray-700 rounded p-2 text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500"
            data-testid="notes-textarea"
            disabled={saving}
          />
          <button
            onClick={handleSaveNotes}
            disabled={saving || !notes.trim()}
            className="self-end px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded font-medium transition-colors"
            data-testid="btn-save-notes"
          >
            {saving ? 'Saving…' : 'Save notes'}
          </button>
        </div>
      )}
    </div>
  )
}
