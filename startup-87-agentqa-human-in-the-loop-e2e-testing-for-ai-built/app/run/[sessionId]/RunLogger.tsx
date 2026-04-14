'use client'

import { useEffect, useRef, useCallback } from 'react'

interface LogEvent {
  event_type: string
  ts: string
  method?: string
  request_url?: string
  status_code?: number
  response_time_ms?: number
  log_level?: string
  log_message?: string
  payload?: Record<string, unknown>
}

interface Props {
  sessionId: string
  targetUrl: string
  onEvent?: (ev: LogEvent) => void
}

/**
 * RunLogger — client component that:
 * 1. Listens for postMessage events from the sandbox iframe
 * 2. Sends captured events to /api/sessions/[id]/events in batches
 *
 * The iframe cannot be directly instrumented (cross-origin), so we:
 * - Use a service worker / message channel for same-origin targets
 * - For cross-origin targets: capture what we can observe from the parent:
 *   - iframe load/navigation events (via message protocol)
 *   - Console events injected via the parent window hooks
 *
 * Additionally exposes a window.agentQA logger for manual event injection.
 */
export default function RunLogger({ sessionId, targetUrl, onEvent }: Props) {
  const bufferRef = useRef<LogEvent[]>([])
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const flush = useCallback(async () => {
    if (!mountedRef.current) return
    const events = bufferRef.current.splice(0)
    if (events.length === 0) return

    try {
      await fetch(`/api/sessions/${sessionId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(events),
      })
    } catch {
      // Best-effort logging — re-queue on failure
      bufferRef.current.unshift(...events)
    }
  }, [sessionId])

  const logEvent = useCallback((ev: LogEvent) => {
    bufferRef.current.push({ ...ev, ts: ev.ts ?? new Date().toISOString() })
    onEvent?.(ev)

    // Schedule flush if not already scheduled
    if (!flushTimerRef.current) {
      flushTimerRef.current = setTimeout(() => {
        flushTimerRef.current = null
        flush()
      }, 1000) // batch events up to 1s
    }
  }, [flush, onEvent])

  useEffect(() => {
    mountedRef.current = true

    // Expose global logger for manual injection (e.g. from tests)
    ;(window as unknown as Record<string, unknown>).agentQA = {
      log: (ev: LogEvent) => logEvent(ev),
      sessionId,
    }

    // Log initial navigation event
    logEvent({
      event_type: 'navigation',
      ts: new Date().toISOString(),
      request_url: targetUrl,
      log_message: `Session started — loading ${targetUrl}`,
    })

    // Listen for messages from the iframe (if the target sends them)
    // Expected message format: { type: 'agentqa_event', event: LogEvent }
    function onMessage(e: MessageEvent) {
      if (e.data?.type === 'agentqa_event' && e.data?.event) {
        logEvent(e.data.event as LogEvent)
      }
      // Also handle console messages forwarded from iframe
      if (e.data?.type === 'agentqa_console') {
        logEvent({
          event_type: 'console_log',
          ts: new Date().toISOString(),
          log_level: e.data.level ?? 'log',
          log_message: e.data.message,
        })
      }
    }

    window.addEventListener('message', onMessage)

    // Periodic flush every 5s
    const periodicFlush = setInterval(flush, 5000)

    return () => {
      mountedRef.current = false
      window.removeEventListener('message', onMessage)
      clearInterval(periodicFlush)
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
      flush() // final flush on unmount
    }
  }, [logEvent, flush, sessionId, targetUrl])

  return null // pure side-effect component
}
