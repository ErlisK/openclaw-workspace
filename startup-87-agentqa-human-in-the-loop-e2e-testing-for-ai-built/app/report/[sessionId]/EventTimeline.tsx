'use client'

import { useState, useEffect, useCallback } from 'react'

interface SessionEvent {
  id: string
  event_type: string
  ts: string
  log_level?: string
  log_message?: string
  method?: string
  request_url?: string
  url?: string
  status_code?: number
  duration_ms?: number
  payload?: Record<string, unknown>
}

interface Props {
  sessionId: string
  token?: string
}

type FilterTab = 'all' | 'network' | 'console' | 'click' | 'screenshot'

function getIcon(event_type: string) {
  switch (event_type) {
    case 'console_log': return '>'
    case 'navigation': return '→'
    case 'network_request': return '↑'
    case 'network_response': return '↓'
    case 'click': return '✓'
    case 'dom_snapshot': return '▦'
    default: return '·'
  }
}

function getColor(event_type: string, log_level?: string, status_code?: number) {
  switch (event_type) {
    case 'console_log':
      if (log_level === 'error') return 'text-red-400'
      if (log_level === 'warn') return 'text-yellow-400'
      return 'text-green-400'
    case 'navigation': return 'text-blue-400'
    case 'click': return 'text-purple-400'
    case 'dom_snapshot': return 'text-indigo-400'
    case 'network_response':
      if (status_code && status_code >= 400) return 'text-red-400'
      return 'text-cyan-400'
    case 'network_request': return 'text-sky-400'
    default: return 'text-gray-400'
  }
}

function fmtTime(ts: string) {
  try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
  catch { return ts }
}

function matches(e: SessionEvent, tab: FilterTab) {
  if (tab === 'all') return true
  if (tab === 'network') return e.event_type === 'network_request' || e.event_type === 'network_response'
  if (tab === 'console') return e.event_type === 'console_log'
  if (tab === 'click') return e.event_type === 'click'
  if (tab === 'screenshot') return e.event_type === 'dom_snapshot'
  return true
}

export default function EventTimeline({ sessionId, token }: Props) {
  const [events, setEvents] = useState<SessionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<FilterTab>('all')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const fetchEvents = useCallback(async () => {
    try {
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`/api/sessions/${sessionId}/events?limit=500`, { headers })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setEvents(data.events ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [sessionId, token])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const filtered = events.filter(e => matches(e, tab))

  const counts = {
    all: events.length,
    network: events.filter(e => matches(e, 'network')).length,
    console: events.filter(e => matches(e, 'console')).length,
    click: events.filter(e => matches(e, 'click')).length,
    screenshot: events.filter(e => matches(e, 'screenshot')).length,
  }

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'network', label: 'Network' },
    { id: 'console', label: 'Console' },
    { id: 'click', label: 'Clicks' },
    { id: 'screenshot', label: 'Screenshots' },
  ]

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  if (loading) {
    return (
      <div className="text-xs text-gray-500 py-4 text-center" data-testid="timeline-loading">
        Loading events…
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-xs text-red-400 py-4 text-center" data-testid="timeline-error">
        Failed to load events: {error}
      </div>
    )
  }

  return (
    <div data-testid="event-timeline">
      {/* Filter tabs */}
      <div className="flex gap-1 mb-3 border-b border-gray-800 pb-2" role="tablist" data-testid="timeline-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            data-testid={`log-tab-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              tab === t.id
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            {t.label}
            <span
              data-testid={`log-tab-${t.id}-count`}
              className={`text-[10px] px-1 py-0.5 rounded-full min-w-[1.25rem] text-center ${
                tab === t.id ? 'bg-indigo-700 text-indigo-200' : 'bg-gray-800 text-gray-500'
              }`}
            >
              {counts[t.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Timeline entries */}
      {filtered.length === 0 ? (
        <p className="text-xs text-gray-600 py-6 text-center" data-testid="timeline-empty">
          No {tab === 'all' ? '' : tab + ' '}events recorded
        </p>
      ) : (
        <div className="space-y-0.5 font-mono text-[11px]" data-testid="timeline-entries">
          {filtered.map(e => {
            const isExp = expanded.has(e.id)
            const color = getColor(e.event_type, e.log_level, e.status_code)
            const icon = getIcon(e.event_type)
            const hasExtra = !!e.payload || e.event_type === 'dom_snapshot'

            // For screenshots, show image inline
            const imgSrc = e.event_type === 'dom_snapshot'
              ? (e.payload?.screenshot_url as string ?? e.payload?.data_url as string ?? null)
              : null

            return (
              <div
                key={e.id}
                data-testid="log-entry"
                data-event-type={e.event_type}
                className="group"
              >
                <div
                  className={`flex items-start gap-2 px-2 py-1 rounded hover:bg-gray-800/50 ${hasExtra || imgSrc ? 'cursor-pointer' : ''}`}
                  onClick={() => (hasExtra || imgSrc) && toggleExpand(e.id)}
                >
                  <span className={`shrink-0 w-4 text-center ${color}`}>{icon}</span>
                  <span className="text-gray-600 shrink-0">{fmtTime(e.ts)}</span>
                  <span className={`${color} flex-1 truncate`}>
                    {e.event_type === 'network_response'
                      ? `${e.status_code ?? '?'} ${e.method ?? ''} ${e.request_url ?? e.url ?? ''}`
                      : e.event_type === 'network_request'
                      ? `${e.method ?? 'GET'} ${e.request_url ?? e.url ?? ''}`
                      : e.log_message ?? e.request_url ?? e.url ?? ''}
                  </span>
                  {e.duration_ms != null && (
                    <span className="text-gray-600 shrink-0 text-[10px]">{e.duration_ms}ms</span>
                  )}
                  {(hasExtra || imgSrc) && (
                    <span className="text-gray-600 shrink-0">{isExp ? '▲' : '▼'}</span>
                  )}
                </div>

                {isExp && (
                  <div className="ml-8 mt-1 mb-2" data-testid="log-entry-detail">
                    {imgSrc && (
                      <img
                        src={imgSrc}
                        alt="screenshot"
                        className="max-w-full rounded border border-gray-700"
                        data-testid="screenshot-img"
                      />
                    )}
                    {e.payload && !imgSrc && (
                      <pre className="text-[10px] text-gray-400 bg-gray-900 rounded p-2 overflow-x-auto max-h-48 border border-gray-700">
                        {JSON.stringify(e.payload, null, 2)}
                      </pre>
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
