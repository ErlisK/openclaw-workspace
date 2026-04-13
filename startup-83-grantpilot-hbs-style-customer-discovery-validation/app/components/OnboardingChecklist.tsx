'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ChecklistItem {
  id: string
  label: string
  description: string
  href?: string
  cta?: string
  completedIf?: string // localStorage key
}

const CHECKLIST: ChecklistItem[] = [
  {
    id: 'org_created',
    label: 'Create your organization',
    description: 'Name, type, budget range, and EIN for federal grants.',
    href: '/onboarding',
    cta: 'Set up org →',
  },
  {
    id: 'funder_focus',
    label: 'Set your funder focus',
    description: 'Pick target funders and program areas to personalize your grant feed.',
    href: '/onboarding',
    cta: 'Set focus →',
  },
  {
    id: 'rfp_parsed',
    label: 'Parse your first RFP',
    description: 'Upload a PDF or paste a URL — AI extracts requirements in 30 seconds.',
    href: '/rfp/new',
    cta: 'Try an RFP →',
  },
  {
    id: 'narrative_generated',
    label: 'Generate a narrative section',
    description: 'AI drafts a funder-tailored narrative in your org\'s voice.',
    href: '/rfp/new',
    cta: 'Start drafting →',
  },
  {
    id: 'budget_built',
    label: 'Build a grant budget',
    description: 'Auto-build an OMB-compliant budget with justification text.',
    href: '/rfp/new',
    cta: 'Build budget →',
  },
  {
    id: 'exported',
    label: 'Export a submission package',
    description: 'Download narrative + SF-424 forms + checklist as a ZIP.',
    href: '/rfp/new',
    cta: 'Export package →',
  },
]

const STORAGE_KEY = 'gp_onboarding_checklist'

interface Props {
  completedItems?: string[]  // server-side pre-completed items (e.g. org_created from DB)
  compact?: boolean
}

export default function OnboardingChecklist({ completedItems = [], compact = false }: Props) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set(completedItems))
  const [collapsed, setCollapsed] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Persist to localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: string[] = JSON.parse(stored)
        setChecked(prev => {
          const merged = new Set([...prev, ...parsed])
          return merged
        })
      }
      // Check if dismissed
      if (localStorage.getItem(STORAGE_KEY + '_dismissed') === '1') {
        setDismissed(true)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...checked]))
    } catch { /* ignore */ }
  }, [checked])

  function handleCheck(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY + '_dismissed', '1')
    setDismissed(true)
  }

  if (dismissed) return null

  const completedCount = CHECKLIST.filter(item => checked.has(item.id)).length
  const totalCount = CHECKLIST.length
  const allDone = completedCount === totalCount
  const progress = Math.round((completedCount / totalCount) * 100)

  if (allDone) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <div className="font-semibold text-green-900 text-sm">Setup complete!</div>
            <div className="text-xs text-green-700">You&apos;ve completed all onboarding steps. You&apos;re a GrantPilot pro.</div>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-xs text-green-600 hover:text-green-800 underline">
          Dismiss
        </button>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-900">
            Getting started <span className="text-gray-400 font-normal">({completedCount}/{totalCount})</span>
          </span>
          <Link href="#checklist-full" className="text-xs text-indigo-600 hover:underline">View all</Link>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div id="checklist-full" className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 text-sm">Getting started</span>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
              {completedCount}/{totalCount} done
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1 mt-2" style={{ width: '200px' }}>
            <div
              className="h-1 rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="text-xs text-gray-400 hover:text-gray-700"
          >
            {collapsed ? 'Show ↓' : 'Hide ↑'}
          </button>
          <button onClick={handleDismiss} className="text-xs text-gray-400 hover:text-gray-600">
            Dismiss
          </button>
        </div>
      </div>

      {/* Items */}
      {!collapsed && (
        <div className="divide-y divide-gray-50">
          {CHECKLIST.map((item) => {
            const done = checked.has(item.id)
            return (
              <div
                key={item.id}
                className={`px-5 py-3.5 flex items-start gap-3 transition-colors ${done ? 'bg-gray-50' : 'hover:bg-gray-50/50'}`}
              >
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => handleCheck(item.id)}
                  className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${done
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-gray-300 hover:border-indigo-400'
                  }`}
                  aria-label={done ? `Uncheck: ${item.label}` : `Check: ${item.label}`}
                >
                  {done && (
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                    {item.label}
                  </div>
                  {!done && (
                    <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.description}</div>
                  )}
                </div>

                {/* CTA */}
                {!done && item.href && (
                  <Link
                    href={item.href}
                    className="flex-shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    {item.cta || 'Go →'}
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
