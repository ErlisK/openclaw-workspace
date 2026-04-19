'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ChecklistItem {
  key: string
  label: string
  href: string
  description: string
  icon: string
  done: boolean
}

interface OnboardingChecklistProps {
  progress: Record<string, boolean>
  completed: number
  total: number
  percentage: number
  isDone: boolean
  hasDemoData: boolean
}

// Value milestones shown when a step is incomplete — reduces churn by
// making the benefit of each action concrete and measurable.
const VALUE_HINTS: Record<string, string> = {
  has_streams_2: 'Users with 2+ streams find a 23% higher earner on average',
  has_import: 'Importing data unlocks your true hourly rate calculation',
  has_timer: 'Time-tracked users earn 18% more per hour after 30 days',
  has_viewed_heatmap: 'See which hours & days generate 80% of your income',
  has_viewed_roi: 'Know exactly which gig to drop and which to double down on',
}

export default function OnboardingChecklist({
  progress,
  completed,
  total,
  percentage,
  isDone,
  hasDemoData,
}: OnboardingChecklistProps) {
  const [loading, setLoading] = useState(false)
  const [demoLoaded, setDemoLoaded] = useState(hasDemoData)
  const [demoError, setDemoError] = useState('')
  const [dismissed, setDismissed] = useState(false)

  if (isDone || dismissed) return null

  const remainingSteps = total - completed
  const isClose = completed >= total - 1

  const items: ChecklistItem[] = [
    {
      key: 'has_streams_2',
      label: 'Add 2 income streams',
      href: '/import',
      description: 'Import from Stripe, PayPal, Upwork, or add manually',
      icon: '💼',
      done: progress.has_streams_2,
    },
    {
      key: 'has_import',
      label: 'Upload a CSV',
      href: '/import',
      description: 'Drop a Stripe balance export or generic invoice CSV',
      icon: '📥',
      done: progress.has_import,
    },
    {
      key: 'has_timer',
      label: 'Start & stop the timer',
      href: '/timer',
      description: 'Log your first hour of work — unlocks true hourly rate',
      icon: '⏱',
      done: progress.has_timer,
    },
    {
      key: 'has_viewed_heatmap',
      label: 'View the earnings heatmap',
      href: '/heatmap',
      description: 'Discover your best times to accept work',
      icon: '🔥',
      done: progress.has_viewed_heatmap,
    },
    {
      key: 'has_viewed_roi',
      label: 'Check your ROI dashboard',
      href: '/dashboard',
      description: 'See your true hourly rate and top-performing stream',
      icon: '📊',
      done: progress.has_viewed_roi,
    },
  ]

  async function loadDemo() {
    setLoading(true)
    setDemoError('')
    try {
      const res = await fetch('/api/onboarding/demo-data', { method: 'POST' })
      const body = await res.json()
      if (res.ok) {
        setDemoLoaded(true)
        window.location.reload()
      } else {
        setDemoError(body.message ?? body.error ?? 'Something went wrong')
      }
    } catch {
      setDemoError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`rounded-2xl p-5 mb-6 shadow-sm border ${isClose ? 'bg-amber-50 border-amber-200' : 'bg-white border-blue-200'}`}>
      {/* Header with urgency messaging */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-lg font-bold text-gray-900">
              {isClose ? '🎯 Almost there!' : '🚀 Finish setup to unlock insights'}
            </span>
            <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${isClose ? 'bg-amber-200 text-amber-800' : 'bg-blue-100 text-blue-700'}`}>
              {completed}/{total} done
            </span>
          </div>
          {/* Value message */}
          <p className="text-xs text-gray-500 mb-2">
            {remainingSteps === 1
              ? '⚡ One step away from your full ROI picture'
              : `Complete ${remainingSteps} more steps to see your true earnings potential`}
          </p>
          {/* Progress bar */}
          <div className="w-full max-w-xs h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isClose ? 'bg-amber-500' : 'bg-blue-500'}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-300 hover:text-gray-500 text-xl leading-none ml-3 mt-0.5 flex-shrink-0"
          title="Dismiss"
        >×</button>
      </div>

      {/* Checklist */}
      <div className="space-y-1.5 mb-4">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors group ${
              item.done
                ? 'opacity-50 cursor-default pointer-events-none'
                : 'hover:bg-blue-50 cursor-pointer'
            }`}
          >
            {/* Check circle */}
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
              item.done ? 'bg-green-500 border-green-500' : 'border-gray-300 group-hover:border-blue-400'
            }`}>
              {item.done && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-lg flex-shrink-0">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${item.done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                {item.label}
              </div>
              {!item.done && (
                <>
                  <div className="text-xs text-gray-400 truncate">{item.description}</div>
                  {VALUE_HINTS[item.key] && (
                    <div className="text-xs text-blue-600 font-medium mt-0.5">
                      💡 {VALUE_HINTS[item.key]}
                    </div>
                  )}
                </>
              )}
            </div>
            {!item.done && (
              <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-400 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </Link>
        ))}
      </div>

      {/* Load Demo Data */}
      {!demoLoaded && (
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-gray-600">No earnings data yet?</p>
              <p className="text-xs text-gray-400">Load demo data in 1 click — see the full dashboard instantly</p>
            </div>
            <button
              onClick={loadDemo}
              disabled={loading}
              data-testid="load-demo-button"
              className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors whitespace-nowrap flex-shrink-0"
            >
              {loading ? 'Loading…' : '🎲 Load Demo Data'}
            </button>
          </div>
          {demoError && (
            <p className="text-xs text-amber-600 mt-1">{demoError}</p>
          )}
        </div>
      )}
      {demoLoaded && (
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs text-green-600 font-medium">✓ Demo data loaded — explore the full dashboard!</p>
        </div>
      )}
    </div>
  )
}
