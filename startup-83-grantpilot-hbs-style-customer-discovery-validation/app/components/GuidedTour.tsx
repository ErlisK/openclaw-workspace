'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export interface TourStep {
  id: string
  title: string
  content: string
  target?: string        // CSS selector to highlight (optional)
  action?: string        // button label
  actionHref?: string    // navigate to this URL on action
  icon?: string
  position?: 'center' | 'top' | 'bottom'
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    icon: '🎉',
    title: 'Welcome to GrantPilot!',
    content: 'GrantPilot automates the full grant lifecycle — from parsing RFPs to generating submission-ready packages in minutes. Let\'s take a quick tour so you know exactly where everything is.',
    position: 'center',
  },
  {
    id: 'sample_rfp',
    icon: '📄',
    title: 'Start with a Sample RFP',
    content: 'New here? Try a pre-loaded sample RFP — no upload needed. We\'ve included realistic HUD CDBG, SAMHSA, and RWJF samples. Just click "🎯 Sample RFPs" on the import page.',
    action: 'Try Sample RFP →',
    actionHref: '/rfp/new',
    position: 'center',
  },
  {
    id: 'rfp_import',
    icon: '🔍',
    title: 'RFP Parser',
    content: 'Upload a PDF, paste a URL, or drop in text. GrantPilot AI extracts funder, CFDA number, deadline, word limits, scoring rubric, and all required sections automatically.',
    position: 'center',
  },
  {
    id: 'narrative_editor',
    icon: '✍️',
    title: 'Narrative Generator',
    content: 'Once your RFP is parsed, AI generates section-by-section drafts tailored to the funder\'s priorities. Each section shows word count vs. limit, and you can edit inline.',
    position: 'center',
  },
  {
    id: 'qa_gate',
    icon: '🛡️',
    title: 'Dual-Pass QA Gate',
    content: 'Click "🛡️ QA" on any section to run style + compliance checks. The engine flags unfilled placeholders, word limit violations, missing evidence-based practice language, prohibited phrases, and more.',
    position: 'center',
  },
  {
    id: 'budget_builder',
    icon: '💰',
    title: 'OMB-Compliant Budget Builder',
    content: 'Build your budget by category (Personnel, Fringe, Travel, etc.) with automatic indirect cost calculation (MTDC or TDC). Exports to CSV, DOCX, and SF-424A PDF.',
    position: 'center',
  },
  {
    id: 'export_bundle',
    icon: '📦',
    title: 'Export & Compliance Checklist',
    content: 'The Export page generates a full compliance checklist (18+ federal standard items), lets you download SF-424/SF-424A PDFs, and bundles everything into a ZIP ready for submission.',
    action: 'View Checklist →',
    position: 'center',
  },
  {
    id: 'timeline',
    icon: '📅',
    title: 'Timeline & ICS Export',
    content: 'Auto-generated milestones count backwards from your deadline: narrative draft, budget, QA review, internal sign-off, and submission — with configurable reminder days. Export to Google Calendar or Outlook.',
    position: 'center',
  },
  {
    id: 'providers',
    icon: '👥',
    title: 'Specialist Marketplace',
    content: 'GrantPilot AI handles the drafting for free. Need expert eyes? Browse vetted grant specialists — federal, foundation, or municipal — and request one for your application.',
    action: 'Browse Providers →',
    actionHref: '/providers',
    position: 'center',
  },
  {
    id: 'done',
    icon: '🚀',
    title: 'You\'re ready!',
    content: 'That\'s everything. The fastest way to start: click "New Application" → pick a Sample RFP → watch AI do the work. Your first draft can be ready in under 3 minutes.',
    action: 'Start with Sample RFP →',
    actionHref: '/rfp/new',
    position: 'center',
  },
]

const TOUR_KEY = 'grantpilot_tour_v1'

export function useTourState() {
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY)
    if (!done) {
      setDismissed(false)
      setShow(true)
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem(TOUR_KEY, 'done')
    setShow(false)
    setDismissed(true)
  }

  const restart = () => {
    localStorage.removeItem(TOUR_KEY)
    setShow(true)
    setDismissed(false)
  }

  return { show, dismissed, dismiss, restart }
}

interface Props {
  onDismiss: () => void
  initialStep?: number
}

export default function GuidedTour({ onDismiss, initialStep = 0 }: Props) {
  const [step, setStep] = useState(initialStep)
  const router = useRouter()
  const current = TOUR_STEPS[step]
  const isLast = step === TOUR_STEPS.length - 1

  const next = () => {
    if (isLast) {
      onDismiss()
    } else {
      setStep(s => s + 1)
    }
  }

  const handleAction = () => {
    if (current.actionHref) {
      onDismiss()
      router.push(current.actionHref)
    } else {
      next()
    }
  }

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') next()
      if (e.key === 'ArrowLeft' && step > 0) setStep(s => s - 1)
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-1 bg-indigo-600 transition-all duration-300"
            style={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-7">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex gap-1.5">
              {TOUR_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-indigo-600 w-4' : i < step ? 'bg-indigo-300' : 'bg-gray-200'}`}
                />
              ))}
            </div>
            <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 text-xs">Skip tour</button>
          </div>

          {/* Content */}
          <div className="text-center">
            <div className="text-5xl mb-4">{current.icon}</div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">{current.title}</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{current.content}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-7">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm hover:bg-gray-50"
              >
                ← Back
              </button>
            )}
            <div className="flex-1 flex gap-2">
              {current.action && current.actionHref ? (
                <>
                  <button onClick={next} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm hover:bg-gray-50">
                    {isLast ? 'Done' : 'Next →'}
                  </button>
                  <button onClick={handleAction} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700">
                    {current.action}
                  </button>
                </>
              ) : (
                <button onClick={next} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700">
                  {isLast ? '🚀 Let\'s go!' : current.action || 'Next →'}
                </button>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-3">Step {step + 1} of {TOUR_STEPS.length} · Press → to advance · Esc to close</p>
        </div>
      </div>
    </div>
  )
}
