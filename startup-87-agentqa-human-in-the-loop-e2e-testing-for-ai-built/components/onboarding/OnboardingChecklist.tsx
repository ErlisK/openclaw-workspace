'use client'
/**
 * components/onboarding/OnboardingChecklist.tsx
 *
 * Floating collapsible checklist that appears for new users.
 * - Fetches progress from /api/onboarding on mount
 * - Marks steps complete via POST /api/onboarding
 * - Dismisses permanently when all steps done
 * - Fires window events for tooltip tour coordination
 */
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ONBOARDING_STEPS, TOTAL_STEPS } from '@/lib/onboarding/steps'

interface Progress {
  steps: Record<string, string | null>
  completed: number
  total: number
  all_done: boolean
}

export default function OnboardingChecklist({
  onAction,
}: {
  onAction?: (action: string) => void
}) {
  const router = useRouter()
  const [progress, setProgress] = useState<Progress | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch('/api/onboarding')
      if (!res.ok) return
      const data: Progress = await res.json()
      setProgress(data)
      if (data.all_done) {
        // Auto-dismiss after 3s when complete
        setTimeout(() => setDismissed(true), 3000)
      }
    } catch {
      // Not logged in or error — don't show checklist
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  // Listen for external step-complete signals
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      markComplete(e.detail.step)
    }
    window.addEventListener('agentqa:step_complete' as never, handler as EventListener)
    return () => window.removeEventListener('agentqa:step_complete' as never, handler as EventListener)
  }, [])

  const markComplete = useCallback(async (stepId: string) => {
    if (progress?.steps[stepId]) return // already done
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: stepId }),
    })
    await fetchProgress()
  }, [progress, fetchProgress])

  const handleStepClick = useCallback(async (stepId: string, href?: string, action?: string) => {
    // Show tooltip briefly
    setActiveTooltip(stepId)
    setTimeout(() => setActiveTooltip(null), 2000)

    if (action) {
      onAction?.(action)
    } else if (href) {
      router.push(href)
    }

    // Mark navigational steps complete immediately
    if (href && !action) {
      await markComplete(stepId)
    }
  }, [router, onAction, markComplete])

  // Don't render if loading, dismissed, or no auth
  if (loading || dismissed || !progress) return null

  // Don't show if already complete and dismissed
  if (progress.all_done && dismissed) return null

  const pct = Math.round((progress.completed / TOTAL_STEPS) * 100)

  return (
    <div
      data-testid="onboarding-checklist"
      className="fixed bottom-6 right-6 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-3 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Getting started</span>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
            {progress.completed}/{TOTAL_STEPS}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {progress.all_done && <span className="text-xs">🎉 All done!</span>}
          <span className="text-white/80 text-xs">{collapsed ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Progress bar */}
      <div className="h-1 bg-indigo-100">
        <div
          className="h-1 bg-indigo-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps */}
      {!collapsed && (
        <div className="divide-y divide-gray-50">
          {ONBOARDING_STEPS.map((step) => {
            const done = !!progress.steps[step.id]
            const isActive = activeTooltip === step.id

            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                  done ? 'bg-green-50/50' : 'hover:bg-gray-50 cursor-pointer'
                } ${isActive ? 'ring-2 ring-inset ring-indigo-300' : ''}`}
                onClick={() => !done && handleStepClick(step.id, step.href, step.action)}
                data-testid={`onboarding-step-${step.id}`}
              >
                {/* Checkbox */}
                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  done
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 text-transparent'
                }`}>
                  {done && <span className="text-[10px]">✓</span>}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {step.icon} {step.title}
                  </div>
                  {!done && (
                    <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      {step.description}
                    </div>
                  )}
                  {!done && (
                    <button className="mt-1.5 text-xs text-indigo-600 font-medium hover:underline">
                      {step.cta} →
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={() => setDismissed(true)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Dismiss
          </button>
          <a
            href="/report/demo"
            className="text-xs text-indigo-600 hover:underline"
          >
            See sample report →
          </a>
        </div>
      )}
    </div>
  )
}
