'use client'

import { useState, useRef, useCallback } from 'react'
import RunLogger, { LogEvent } from './RunLogger'
import SessionControls, { SessionPhase } from './SessionControls'
import FeedbackForm from './FeedbackForm'
import AISummary from './AISummary'
import BrowserViewer from './BrowserViewer'
import { BrowserEvent } from '@/lib/browser-session-manager'

interface Job {
  id: string
  title: string
  url: string
  tier: string
  instructions: string
}

interface LogEntry {
  id: string
  event_type: string
  ts: string
  request_url?: string
  method?: string
  status_code?: number
  response_time_ms?: number
  log_level?: string
  log_message?: string
  payload?: Record<string, unknown>
}

interface Props {
  sessionId: string
  job: Job
  assignmentId: string
}

let entryCounter = 0
function makeId() { return `e-${++entryCounter}` }

type FilterTab = 'all' | 'network' | 'console' | 'click'

/** Map event_type → FilterTab for count badges */
function tabOf(et: string): FilterTab {
  if (et === 'network_request' || et === 'network_response') return 'network'
  if (et === 'console_log') return 'console'
  if (et === 'click') return 'click'
  return 'all'
}

export default function SandboxRunner({ sessionId, job, assignmentId }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [browserStatus, setBrowserStatus] = useState<'starting' | 'running' | 'error' | 'stopped'>('starting')
  const [panelTab, setPanelTab] = useState<FilterTab>('all')
  const [flushedCount, setFlushedCount] = useState(0)
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('idle')
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackDone, setFeedbackDone] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Ensure the job URL is a fully-qualified HTTP(S) URL.
  const safeJobUrl = (() => {
    if (!job.url) return ''
    const raw = /^https?:\/\//i.test(job.url) ? job.url : `https://${job.url}`
    try {
      const p = new URL(raw)
      return ['http:', 'https:'].includes(p.protocol) ? p.toString() : ''
    } catch {
      return ''
    }
  })()

  // Accepts both LogEvent and BrowserEvent shapes
  const handleEvent = useCallback((ev: LogEvent | BrowserEvent) => {
    setLogs(prev => {
      const next = [...prev, { id: makeId(), ...ev } as LogEntry].slice(-1000)
      return next
    })
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [])

  const handleFlush = useCallback((count: number) => {
    setFlushedCount(prev => prev + count)
  }, [])

  // ─── Derived counts ────────────────────────────────────────
  const counts = logs.reduce(
    (acc, e) => {
      acc.all++
      const t = tabOf(e.event_type)
      if (t !== 'all') acc[t] = (acc[t] ?? 0) + 1
      return acc
    },
    { all: 0, network: 0, console: 0, click: 0 } as Record<FilterTab, number>
  )

  const filteredLogs = logs.filter(e => {
    if (panelTab === 'network') return ['network_request', 'network_response'].includes(e.event_type)
    if (panelTab === 'console') return e.event_type === 'console_log'
    if (panelTab === 'click') return e.event_type === 'click'
    return true
  })

  // ─── Event appearance ──────────────────────────────────────
  function getLogColor(entry: LogEntry) {
    switch (entry.event_type) {
      case 'console_log':
        if (entry.log_level === 'error') return 'text-red-400'
        if (entry.log_level === 'warn') return 'text-yellow-400'
        return 'text-green-400'
      case 'navigation': return 'text-blue-400'
      case 'click': return 'text-purple-400'
      case 'dom_snapshot': return 'text-indigo-400'
      case 'page_error': return 'text-red-400'
      case 'network_request': return 'text-gray-300'
      case 'network_response':
        if (entry.status_code && entry.status_code >= 400) return 'text-red-400'
        return 'text-cyan-400'
      default: return 'text-gray-400'
    }
  }

  function getLogIcon(entry: LogEntry) {
    switch (entry.event_type) {
      case 'console_log': return '>'
      case 'navigation': return '→'
      case 'network_request': return '↑'
      case 'network_response': return '↓'
      case 'click': return '✓'
      case 'dom_snapshot': return '▦'
      case 'page_error': return '!'
      default: return '·'
    }
  }

  function getEntryLabel(entry: LogEntry): string {
    if (entry.event_type === 'console_log') return entry.log_message ?? ''
    if (entry.event_type === 'page_error') return entry.log_message ?? 'Page error'
    if (entry.event_type === 'click') return entry.log_message ?? `click ${entry.payload?.tag ?? ''}`
    if (entry.event_type === 'dom_snapshot') return entry.log_message ?? 'DOM snapshot'
    if (entry.event_type === 'navigation') return entry.request_url ?? entry.log_message ?? ''
    return [entry.method, entry.request_url].filter(Boolean).join(' ')
  }

  // ─── Tab definitions ───────────────────────────────────────
  const tabs: { id: FilterTab; label: string; testId: string }[] = [
    { id: 'all', label: 'All', testId: 'log-tab-all' },
    { id: 'network', label: 'Network', testId: 'log-tab-network' },
    { id: 'console', label: 'Console', testId: 'log-tab-console' },
    { id: 'click', label: 'Clicks', testId: 'log-tab-click' },
  ]

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden" data-testid="sandbox-runner">
      {/* Fatal: bad URL stored on the job */}
      {!safeJobUrl && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-lg font-semibold mb-2">Invalid app URL</h2>
            <p className="text-sm text-gray-400 mb-1">
              The URL stored for this job is missing or not a valid http(s) address.
            </p>
            <p className="text-xs text-gray-600 font-mono break-all">{job.url || '(empty)'}</p>
          </div>
        </div>
      )}
      {safeJobUrl && (<>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
              browserStatus === 'running' ? 'bg-green-400' :
              browserStatus === 'error' ? 'bg-red-400' :
              'bg-yellow-400 animate-pulse'
            }`}
            data-testid="iframe-status-dot"
          />
          <span className="text-sm font-medium text-gray-200 truncate">{job.title}</span>
          <span className="text-xs text-gray-500 truncate hidden sm:block">{job.url}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs text-gray-500">
          <span data-testid="total-event-count">{logs.length} events</span>
          {flushedCount > 0 && (
            <span className="text-green-600" title="Events persisted to DB">
              ✓ {flushedCount}
            </span>
          )}
          <span className="px-2 py-0.5 bg-indigo-900 text-indigo-300 rounded-full">{job.tier}</span>
        </div>
      </div>

      {/* Session controls bar */}
      <div className="px-4 py-2 bg-gray-850 border-b border-gray-700 shrink-0" data-testid="session-controls-bar">
        <SessionControls
          sessionId={sessionId}
          tier={job.tier}
          onPhaseChange={(phase) => {
            setSessionPhase(phase)
            if (['complete', 'abandoned', 'timed_out'].includes(phase)) {
              setShowFeedback(true)
            }
          }}
          onComplete={(notes, reason) => {
            const ga = (window as unknown as Record<string, unknown>).agentQA as
              { log?: (ev: object) => void } | undefined
            ga?.log?.({
              event_type: 'navigation',
              ts: new Date().toISOString(),
              log_message: `Session ${reason}: ${notes ? notes.slice(0, 80) : '(no notes)'}`,
            })
          }}
        />
      </div>

      {/* Instructions banner */}
      {job.instructions && (
        <div className="px-4 py-2 bg-indigo-950 border-b border-indigo-800 shrink-0">
          <p className="text-xs text-indigo-300">
            <span className="font-semibold">Instructions: </span>{job.instructions}
          </p>
        </div>
      )}

      {/* Main: browser viewer + log panel side-by-side */}
      <div className="flex flex-1 min-h-0">
        {/* Remote browser panel — Playwright-powered */}
        <div className="flex-1 relative min-w-0 border-r border-gray-700">
          <BrowserViewer
            sessionId={sessionId}
            jobUrl={safeJobUrl}
            onEvent={handleEvent}
            onStatusChange={setBrowserStatus}
          />
        </div>

        {/* Log panel */}
        <div
          className="w-80 lg:w-96 flex flex-col bg-gray-950 shrink-0"
          data-testid="log-panel"
        >
          {/* Tab bar with event-count badges */}
          <div className="flex border-b border-gray-800 shrink-0" role="tablist" aria-label="Event filters">
            {tabs.map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={panelTab === tab.id}
                onClick={() => setPanelTab(tab.id)}
                className={`flex-1 px-2 py-2 text-xs font-medium transition-colors flex flex-col items-center gap-0.5 ${
                  panelTab === tab.id
                    ? 'text-white border-b-2 border-indigo-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
                data-testid={tab.testId}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono px-1 rounded ${
                    panelTab === tab.id ? 'text-indigo-300' : 'text-gray-600'
                  }`}
                  data-testid={`${tab.testId}-count`}
                >
                  {counts[tab.id]}
                </span>
              </button>
            ))}
          </div>

          {/* Live event timeline */}
          <div
            className="flex-1 overflow-y-auto font-mono text-xs"
            data-testid="log-entries"
            aria-live="polite"
            aria-label="Live event log"
          >
            {filteredLogs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-600">
                <p>Waiting for events…</p>
              </div>
            ) : (
              filteredLogs.map(entry => (
                <div
                  key={entry.id}
                  className={`px-3 py-1.5 border-b border-gray-900 hover:bg-gray-900 transition-colors ${getLogColor(entry)}`}
                  data-testid="log-entry"
                  data-event-type={entry.event_type}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className="shrink-0 opacity-70 w-3 text-center"
                      title={entry.event_type}
                    >
                      {getLogIcon(entry)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span
                          className="inline-block text-[9px] px-1 rounded bg-gray-800 text-gray-400 shrink-0"
                          data-testid="event-type-pill"
                        >
                          {entry.event_type.replace('_', ' ')}
                        </span>

                        {entry.status_code != null && (
                          <span
                            className={`shrink-0 font-bold ${
                              entry.status_code >= 400 ? 'text-red-400' : 'text-green-400'
                            }`}
                            data-testid="status-code"
                          >
                            {entry.status_code}
                          </span>
                        )}

                        {entry.response_time_ms != null && (
                          <span className="text-gray-600 shrink-0">
                            {entry.response_time_ms}ms
                          </span>
                        )}
                      </div>

                      <div className="truncate opacity-90 mt-0.5" title={getEntryLabel(entry)}>
                        {getEntryLabel(entry)}
                      </div>

                      <div className="text-gray-600 text-[10px] mt-0.5">
                        {new Date(entry.ts).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          fractionalSecondDigits: 2,
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>

          {/* Footer: realtime status */}
          <div className="border-t border-gray-800 px-3 py-1.5 flex items-center gap-2 shrink-0 text-[10px] text-gray-600">
            <RunLogger
              sessionId={sessionId}
              targetUrl={job.url}
              onEvent={handleEvent}
              onFlush={handleFlush}
            />
            <span data-testid="log-panel-footer">
              {filteredLogs.length} / {logs.length} shown
            </span>
          </div>
        </div>
      </div>

      {/* ── AI Summary panel (shown when session ends) ── */}
      {['complete', 'abandoned', 'timed_out'].includes(sessionPhase) && (
        <div className="px-4 py-3" data-testid="ai-summary-section">
          <AISummary sessionId={sessionId} />
        </div>
      )}

      {/* ── Feedback drawer (slides up when session ends) ── */}
      {showFeedback && !feedbackDone && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          data-testid="feedback-drawer-overlay"
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] bg-gray-900 border border-gray-700 rounded-t-xl sm:rounded-xl shadow-2xl flex flex-col overflow-hidden"
            data-testid="feedback-drawer"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 shrink-0">
              <h2 className="text-sm font-semibold text-white">
                Submit feedback
                {sessionPhase === 'timed_out' && (
                  <span className="ml-2 text-xs text-orange-400">(session timed out)</span>
                )}
              </h2>
              <button
                onClick={() => setShowFeedback(false)}
                className="text-gray-500 hover:text-gray-300 text-lg transition-colors"
                data-testid="btn-close-feedback-drawer"
                aria-label="Close feedback drawer"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <FeedbackForm
                sessionId={sessionId}
                jobId={job.id}
                assignmentId={assignmentId}
                onSubmitted={(feedbackId) => {
                  setFeedbackDone(true)
                  setShowFeedback(false)
                  const ga = (window as unknown as Record<string, unknown>).agentQA as
                    { log?: (ev: object) => void } | undefined
                  ga?.log?.({
                    event_type: 'navigation',
                    ts: new Date().toISOString(),
                    log_message: `Feedback submitted: ${feedbackId}`,
                  })
                }}
                onCancel={() => setShowFeedback(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Feedback done banner ──────────────────────────── */}
      {feedbackDone && (
        <div
          className="fixed bottom-4 right-4 z-50 bg-green-900 border border-green-700 text-green-200 text-sm rounded-lg px-4 py-2 shadow-lg"
          data-testid="feedback-done-banner"
        >
          ✓ Feedback submitted
        </div>
      )}
    </>)}
    </div>
  )
}
