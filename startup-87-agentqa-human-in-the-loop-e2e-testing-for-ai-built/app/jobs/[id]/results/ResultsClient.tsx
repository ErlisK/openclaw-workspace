'use client'

import { useState } from 'react'
import Link from 'next/link'

type Bug = {
  id: string
  title: string
  description: string
  severity: string
  repro_steps?: string
  expected_behavior?: string
  actual_behavior?: string
  screenshot_urls?: string[]
}

type Feedback = {
  id: string
  overall_rating: number
  summary: string
  repro_steps?: string
  expected_behavior?: string
  actual_behavior?: string
  created_at: string
  tester_id: string
  feedback_bugs: Bug[]
}

type SessionEvent = {
  id: string
  event_type: string
  payload: unknown
  created_at: string
}

type AISummary = {
  summary_text: string
  bug_count: number
  severity: string
  created_at: string
} | null

type Assignment = {
  id: string
  status: string
  assigned_at: string
  completed_at?: string
  tester_id: string
}

interface Props {
  job: {
    id: string
    title: string
    url: string
    tier: string
    instructions: string
    status: string
    completed_at?: string
    price_cents: number
  }
  feedback: Feedback[]
  sessionEvents: SessionEvent[]
  sessionId: string | null
  aiSummary: AISummary
  assignments: Assignment[]
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

const EVENT_ICONS: Record<string, string> = {
  click: '🖱️',
  input: '⌨️',
  navigation: '🔗',
  network_request: '🌐',
  console_log: '📋',
  console_error: '❌',
  console_warn: '⚠️',
  scroll: '↕️',
  screenshot: '📸',
}

export default function ResultsClient({ job, feedback, sessionEvents, sessionId, aiSummary, assignments }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'network' | 'console'>('overview')
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeSubmitting, setDisputeSubmitting] = useState(false)
  const [disputeSubmitted, setDisputeSubmitted] = useState(false)
  const [requesterRating, setRequesterRating] = useState<number | null>(null)
  const [ratingSubmitted, setRatingSubmitted] = useState(false)

  const mainFeedback = feedback[0]
  const bugs = mainFeedback?.feedback_bugs ?? []
  const networkEvents = sessionEvents.filter(e => e.event_type === 'network_request')
  const consoleEvents = sessionEvents.filter(e => ['console_log', 'console_error', 'console_warn'].includes(e.event_type))
  const interactionEvents = sessionEvents.filter(e => !['network_request', 'console_log', 'console_error', 'console_warn'].includes(e.event_type))

  const submitDispute = async () => {
    if (!disputeReason.trim()) return
    setDisputeSubmitting(true)
    try {
      await fetch(`/api/jobs/${job.id}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: disputeReason }),
      })
      setDisputeSubmitted(true)
      setDisputeOpen(false)
    } finally {
      setDisputeSubmitting(false)
    }
  }

  const submitRating = async (rating: number) => {
    setRequesterRating(rating)
    await fetch(`/api/jobs/${job.id}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating }),
    })
    setRatingSubmitted(true)
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      {/* Job header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{job.title}</h1>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="capitalize font-medium text-indigo-600">{job.tier} tier</span>
            <span>·</span>
            <a href={job.url} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 truncate max-w-xs">
              {job.url}
            </a>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          job.status === 'complete' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
        }`}>
          {job.status}
        </div>
      </div>

      {/* AI Summary banner */}
      {aiSummary ? (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-indigo-600 font-semibold text-sm">🤖 AI-Generated Summary</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_COLORS[aiSummary.severity] ?? 'bg-gray-100 text-gray-600'}`}>
              {aiSummary.bug_count} bug{aiSummary.bug_count !== 1 ? 's' : ''} · {aiSummary.severity} severity
            </span>
          </div>
          <p className="text-gray-800 text-sm leading-relaxed">{aiSummary.summary_text}</p>
          <p className="text-xs text-gray-400 italic mt-2">AI-generated summary — may contain inaccuracies. Review the full report and session recording for complete findings.</p>
        </div>
      ) : sessionId && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-6 flex items-center justify-between">
          <span className="text-sm text-gray-600">AI summary not yet generated</span>
          <button
            onClick={async () => {
              await fetch(`/api/sessions/${sessionId}/summary`, { method: 'POST' })
              window.location.reload()
            }}
            className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Generate AI Summary
          </button>
        </div>
      )}

      {/* Tester feedback */}
      {mainFeedback ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Tester Feedback</h2>
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(star => (
                <span key={star} className={`text-lg ${star <= (mainFeedback.overall_rating ?? 0) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
              ))}
              <span className="text-sm text-gray-500 ml-1">{mainFeedback.overall_rating}/5</span>
            </div>
          </div>

          <p className="text-gray-700 text-sm mb-4 leading-relaxed">{mainFeedback.summary}</p>

          {bugs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Reported Bugs ({bugs.length})</h3>
              <div className="space-y-3">
                {bugs.map(bug => (
                  <div key={bug.id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="font-medium text-gray-900 text-sm">{bug.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${SEVERITY_COLORS[bug.severity] ?? 'bg-gray-100'}`}>
                        {bug.severity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{bug.description}</p>
                    {bug.repro_steps && (
                      <details className="text-xs text-gray-500">
                        <summary className="cursor-pointer font-medium text-gray-600">Steps to Reproduce</summary>
                        <p className="mt-1 whitespace-pre-wrap">{bug.repro_steps}</p>
                      </details>
                    )}
                    {bug.screenshot_urls && bug.screenshot_urls.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {bug.screenshot_urls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="Screenshot" className="w-20 h-14 object-cover rounded border border-gray-200 hover:opacity-80" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rate the test */}
          {!ratingSubmitted ? (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-2">How useful was this test?</p>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(r => (
                  <button
                    key={r}
                    onClick={() => submitRating(r)}
                    className={`w-9 h-9 rounded-lg border text-sm font-bold transition-colors
                      ${requesterRating === r ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 text-sm text-green-600">✓ Thanks for rating this test!</div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 text-center text-gray-400">
          <p>No feedback submitted yet.</p>
          {job.status === 'assigned' && <p className="text-sm mt-1">Testing is in progress…</p>}
        </div>
      )}

      {/* Session Replay Tabs */}
      {sessionEvents.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-6">
          <div className="border-b border-gray-100 flex">
            {(['overview', 'events', 'network', 'console'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-medium capitalize transition-colors
                  ${activeTab === tab ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {tab}
                {tab === 'network' && <span className="ml-1 text-xs text-gray-400">({networkEvents.length})</span>}
                {tab === 'console' && <span className="ml-1 text-xs text-gray-400">({consoleEvents.length})</span>}
                {tab === 'events' && <span className="ml-1 text-xs text-gray-400">({interactionEvents.length})</span>}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-gray-900">{sessionEvents.length}</div>
                  <div className="text-xs text-gray-500 mt-1">Total Events</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-gray-900">{networkEvents.length}</div>
                  <div className="text-xs text-gray-500 mt-1">Network Requests</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-gray-900">{consoleEvents.filter(e => e.event_type === 'console_error').length}</div>
                  <div className="text-xs text-gray-500 mt-1">Console Errors</div>
                </div>
              </div>
            )}

            {activeTab === 'events' && (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {interactionEvents.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No interaction events captured</p>
                ) : interactionEvents.map(e => (
                  <div key={e.id} className="flex items-start gap-3 text-xs py-1.5 border-b border-gray-50">
                    <span className="flex-shrink-0 w-5">{EVENT_ICONS[e.event_type] ?? '•'}</span>
                    <span className="text-gray-500 flex-shrink-0 w-20">{new Date(e.created_at).toLocaleTimeString()}</span>
                    <span className="text-gray-600 font-medium w-20 flex-shrink-0">{e.event_type}</span>
                    <span className="text-gray-500 truncate">{typeof e.payload === 'object' ? JSON.stringify(e.payload).slice(0, 120) : String(e.payload)}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'network' && (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {networkEvents.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No network requests captured</p>
                ) : networkEvents.map(e => {
                  const p = e.payload as Record<string, unknown> ?? {}
                  return (
                    <div key={e.id} className="flex items-start gap-3 text-xs py-1.5 border-b border-gray-50">
                      <span className="text-gray-500 flex-shrink-0 w-20">{new Date(e.created_at).toLocaleTimeString()}</span>
                      <span className={`font-mono font-bold flex-shrink-0 w-12 ${
                        Number(p.status) >= 400 ? 'text-red-600' : 'text-green-600'
                      }`}>{String(p.status ?? '—')}</span>
                      <span className="text-gray-600 font-medium flex-shrink-0 w-12">{String(p.method ?? 'GET')}</span>
                      <span className="text-gray-500 truncate">{String(p.url ?? '')}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {activeTab === 'console' && (
              <div className="space-y-1 max-h-80 overflow-y-auto font-mono text-xs">
                {consoleEvents.length === 0 ? (
                  <p className="text-gray-400 text-center py-4 font-sans">No console events captured</p>
                ) : consoleEvents.map(e => {
                  const p = e.payload as Record<string, unknown> ?? {}
                  return (
                    <div key={e.id} className={`flex items-start gap-3 py-1.5 border-b border-gray-50 ${
                      e.event_type === 'console_error' ? 'text-red-600 bg-red-50' :
                      e.event_type === 'console_warn' ? 'text-yellow-700 bg-yellow-50' : 'text-gray-700'
                    }`}>
                      <span className="text-gray-400 flex-shrink-0 w-20 font-sans">{new Date(e.created_at).toLocaleTimeString()}</span>
                      <span className="truncate">{String(p.message ?? p.text ?? JSON.stringify(p)).slice(0, 200)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dispute section */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Having an issue?</h3>
        {disputeSubmitted ? (
          <div className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">
            ✓ Your dispute has been submitted. Our team will review within 24 hours.
          </div>
        ) : disputeOpen ? (
          <div>
            <textarea
              value={disputeReason}
              onChange={e => setDisputeReason(e.target.value)}
              rows={3}
              placeholder="Describe the issue with this test submission..."
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none mb-3"
            />
            <div className="flex gap-3">
              <button
                onClick={submitDispute}
                disabled={disputeSubmitting || !disputeReason.trim()}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {disputeSubmitting ? 'Submitting…' : 'Submit Dispute'}
              </button>
              <button
                onClick={() => setDisputeOpen(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              If the test quality doesn&apos;t meet expectations, you can open a dispute for review.
            </p>
            <button
              onClick={() => setDisputeOpen(true)}
              className="flex-shrink-0 ml-4 px-4 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50"
            >
              Open Dispute
            </button>
          </div>
        )}
      </div>

      {assignments.length > 0 && (
        <div className="mt-4 text-center">
          <Link
            href={`/jobs/${job.id}`}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            ← Back to Job Details
          </Link>
        </div>
      )}
    </main>
  )
}
