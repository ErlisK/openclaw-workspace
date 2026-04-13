'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { CHECKLIST_STEPS } from '@/lib/onboarding'

interface StepState {
  id: string
  completed: boolean
  skipped: boolean
}

interface ChecklistState {
  steps: StepState[]
  completed_count: number
  total_steps: number
  completion_pct: number
  all_done: boolean
}

export function OnboardingChecklist({ collapsed: initCollapsed = false }: { collapsed?: boolean }) {
  const [state, setState] = useState<ChecklistState | null>(null)
  const [collapsed, setCollapsed] = useState(initCollapsed)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/onboarding/checklist')
      if (res.ok) setState(await res.json())
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function markStep(step: string, action: 'complete' | 'skip') {
    setActing(step)
    try {
      const res = await fetch('/api/onboarding/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, action }),
      })
      if (res.ok) await load()
    } catch { /* ignore */ }
    setActing(null)
  }

  if (loading) return null
  if (!state) return null
  if (state.all_done) return null  // Hide once complete

  const stepMap = new Map(state.steps.map(s => [s.id, s]))

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${
      collapsed ? 'border-gray-800' : 'border-indigo-700/40 bg-indigo-950/10'
    }`}>
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold text-white">
            🚀 Get started — {state.completed_count}/{state.total_steps} steps done
          </div>
          <div className="h-1.5 w-24 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${state.completion_pct}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{state.completion_pct}%</span>
        </div>
        <span className="text-gray-600 text-sm">{collapsed ? '▼' : '▲'}</span>
      </button>

      {/* Steps */}
      {!collapsed && (
        <div className="divide-y divide-gray-800/60 px-5 pb-4">
          {CHECKLIST_STEPS.map(step => {
            const s = stepMap.get(step.id)
            const done = s?.completed || false
            const skipped = s?.skipped || false
            const isActing = acting === step.id

            return (
              <div
                key={step.id}
                className={`py-4 flex items-start gap-4 ${done || skipped ? 'opacity-60' : ''}`}
              >
                {/* Status indicator */}
                <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  done ? 'bg-green-600 text-white' :
                  skipped ? 'bg-gray-700 text-gray-500' :
                  'border-2 border-indigo-600 text-indigo-400'
                }`}>
                  {done ? '✓' : skipped ? '–' : ''}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${done ? 'line-through text-gray-500' : 'text-white'}`}>
                    {step.label}
                  </div>
                  {!done && !skipped && (
                    <>
                      <div className="text-xs text-gray-400 mt-0.5">{step.desc}</div>
                      {step.tip && (
                        <div className="text-xs text-indigo-400/80 mt-1">{step.tip}</div>
                      )}
                    </>
                  )}
                </div>

                {/* Actions */}
                {!done && !skipped && (
                  <div className="flex items-center gap-2 shrink-0">
                    {step.cta_href ? (
                      <Link
                        href={step.cta_href}
                        onClick={() => markStep(step.id, 'complete')}
                        className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                      >
                        {step.cta}
                      </Link>
                    ) : (
                      <button
                        onClick={() => markStep(step.id, 'complete')}
                        disabled={isActing}
                        className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {isActing ? '...' : step.cta}
                      </button>
                    )}
                    {step.skippable && (
                      <button
                        onClick={() => markStep(step.id, 'skip')}
                        disabled={isActing}
                        className="text-xs text-gray-600 hover:text-gray-400 px-2 py-1.5 transition-colors"
                      >
                        Skip
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
