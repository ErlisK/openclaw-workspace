'use client'

import { useState, useRef, useCallback } from 'react'
import RunLogger from './RunLogger'

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
  method?: string | null
  request_url?: string | null
  status_code?: number | null
  log_level?: string | null
  log_message?: string | null
}

interface Props {
  sessionId: string
  job: Job
  assignmentId: string
}

let entryCounter = 0
function makeId() { return `e-${++entryCounter}` }

export default function SandboxRunner({ sessionId, job, assignmentId }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [panelTab, setPanelTab] = useState<'network' | 'console' | 'all'>('all')
  const logsEndRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Route the iframe through our proxy so the injected logger can capture events
  const iframeSrc = `/api/proxy?url=${encodeURIComponent(job.url)}&session=${sessionId}`

  const handleEvent = useCallback((ev: {
    event_type: string
    ts: string
    method?: string
    request_url?: string
    status_code?: number
    log_level?: string
    log_message?: string
  }) => {
    setLogs(prev => {
      const next = [...prev, { id: makeId(), ...ev }].slice(-500) // keep last 500
      return next
    })
    // Auto-scroll
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [])

  function handleIframeLoad() {
    setIframeLoaded(true)
    // Log the load event
    const logEvent = (window as unknown as Record<string, unknown>).agentQA as { log?: (ev: object) => void } | undefined
    logEvent?.log?.({
      event_type: 'network_response',
      ts: new Date().toISOString(),
      request_url: job.url,
      status_code: 200,
      log_message: 'iframe loaded',
    })
  }

  const filteredLogs = logs.filter(e => {
    if (panelTab === 'network') return ['network_request', 'network_response'].includes(e.event_type)
    if (panelTab === 'console') return e.event_type === 'console_log'
    return true
  })

  function getLogColor(entry: LogEntry) {
    if (entry.event_type === 'console_log') {
      if (entry.log_level === 'error') return 'text-red-400'
      if (entry.log_level === 'warn') return 'text-yellow-400'
      return 'text-green-400'
    }
    if (entry.event_type === 'navigation') return 'text-blue-400'
    if (entry.status_code && entry.status_code >= 400) return 'text-red-400'
    return 'text-gray-300'
  }

  function getLogIcon(entry: LogEntry) {
    if (entry.event_type === 'console_log') return '>'
    if (entry.event_type === 'navigation') return '→'
    if (entry.event_type === 'network_request') return '↑'
    if (entry.event_type === 'network_response') return '↓'
    return '·'
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden" data-testid="sandbox-runner">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`w-2 h-2 rounded-full shrink-0 ${iframeLoaded ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
          <span className="text-sm font-medium text-gray-200 truncate">{job.title}</span>
          <span className="text-xs text-gray-500 truncate hidden sm:block">{job.url}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-500">{logs.length} events</span>
          <span className="px-2 py-0.5 bg-indigo-900 text-indigo-300 text-xs rounded-full">{job.tier}</span>
        </div>
      </div>

      {/* Instructions banner */}
      {job.instructions && (
        <div className="px-4 py-2 bg-indigo-950 border-b border-indigo-800 shrink-0">
          <p className="text-xs text-indigo-300">
            <span className="font-semibold">Instructions: </span>{job.instructions}
          </p>
        </div>
      )}

      {/* Main: iframe + log panel side-by-side */}
      <div className="flex flex-1 min-h-0">
        {/* Iframe panel */}
        <div className="flex-1 relative min-w-0 border-r border-gray-700">
          {!iframeLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-400">Loading {job.url}…</p>
              </div>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            className="w-full h-full border-none"
            onLoad={handleIframeLoad}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            title={`Sandbox: ${job.title}`}
            data-testid="sandbox-iframe"
          />
        </div>

        {/* Log panel */}
        <div className="w-80 lg:w-96 flex flex-col bg-gray-950 shrink-0" data-testid="log-panel">
          {/* Tab bar */}
          <div className="flex border-b border-gray-800 shrink-0">
            {(['all', 'network', 'console'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setPanelTab(tab)}
                className={`flex-1 px-3 py-2 text-xs font-medium capitalize transition-colors ${
                  panelTab === tab
                    ? 'text-white border-b-2 border-indigo-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
                data-testid={`log-tab-${tab}`}
              >
                {tab} {tab === 'all' ? `(${logs.length})` : `(${logs.filter(e =>
                  tab === 'network'
                    ? ['network_request', 'network_response'].includes(e.event_type)
                    : e.event_type === 'console_log'
                ).length})`}
              </button>
            ))}
          </div>

          {/* Log entries */}
          <div className="flex-1 overflow-y-auto font-mono text-xs" data-testid="log-entries">
            {filteredLogs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-600">
                <p>Waiting for events…</p>
              </div>
            ) : (
              filteredLogs.map(entry => (
                <div
                  key={entry.id}
                  className={`px-3 py-1.5 border-b border-gray-900 hover:bg-gray-900 ${getLogColor(entry)}`}
                  data-testid="log-entry"
                >
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 opacity-60">{getLogIcon(entry)}</span>
                    <div className="min-w-0 flex-1">
                      {entry.event_type === 'console_log' ? (
                        <span className="break-all">{entry.log_message}</span>
                      ) : (
                        <div className="flex items-center gap-1 flex-wrap">
                          {entry.method && <span className="text-gray-500">{entry.method}</span>}
                          {entry.request_url && (
                            <span className="truncate max-w-full opacity-80">{entry.request_url}</span>
                          )}
                          {entry.status_code && (
                            <span className={`shrink-0 ${entry.status_code >= 400 ? 'text-red-400' : 'text-green-400'}`}>
                              {entry.status_code}
                            </span>
                          )}
                        </div>
                      )}
                      <span className="text-gray-600 text-[10px]">
                        {new Date(entry.ts).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>

      {/* RunLogger — side effect component */}
      <RunLogger
        sessionId={sessionId}
        targetUrl={job.url}
        onEvent={handleEvent}
      />
    </div>
  )
}
