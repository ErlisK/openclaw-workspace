'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface LogEvent {
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
  /** Called when the event buffer has been flushed to the API */
  onFlush?: (count: number) => void
}

/**
 * RunLogger — parent-frame listener that:
 *
 * 1. Receives postMessage events from the sandbox iframe (agentqa_event_batch)
 * 2. Batches them locally and POSTs to /api/sessions/[id]/events every 1s
 * 3. Subscribes to Supabase Realtime on the session_events table so events
 *    inserted by the injected script (direct API calls) appear live too
 *
 * The component renders nothing — pure side-effects.
 */
export default function RunLogger({ sessionId, targetUrl, onEvent, onFlush }: Props) {
  const bufferRef = useRef<LogEvent[]>([])
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'live' | 'error'>('connecting')

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
      onFlush?.(events.length)
    } catch {
      // Best-effort logging — re-queue on failure
      bufferRef.current.unshift(...events)
    }
  }, [sessionId, onFlush])

  const logEvent = useCallback((ev: LogEvent) => {
    bufferRef.current.push({ ...ev, ts: ev.ts ?? new Date().toISOString() })
    onEvent?.(ev)

    // Debounced flush — batch events up to 1s
    if (!flushTimerRef.current) {
      flushTimerRef.current = setTimeout(() => {
        flushTimerRef.current = null
        flush()
      }, 1000)
    }
  }, [flush, onEvent])

  useEffect(() => {
    mountedRef.current = true

    // ─── Expose global logger (for tests and manual injection) ─
    ;(window as unknown as Record<string, unknown>).agentQA = {
      log: (ev: LogEvent) => logEvent(ev),
      sessionId,
    }

    // ─── Initial navigation event ───────────────────────────────
    logEvent({
      event_type: 'navigation',
      ts: new Date().toISOString(),
      request_url: targetUrl,
      log_message: `Session started — loading ${targetUrl}`,
    })

    // ─── postMessage listener (from injected logger in iframe) ──
    function onMessage(e: MessageEvent) {
      // Single event
      if (e.data?.type === 'agentqa_event' && e.data?.event) {
        logEvent(e.data.event as LogEvent)
      }
      // Batch events (proxy injector standard format)
      if (e.data?.type === 'agentqa_event_batch' && Array.isArray(e.data?.events)) {
        ;(e.data.events as LogEvent[]).forEach(ev => logEvent(ev))
      }
      // Legacy console-only format
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

    // ─── Supabase Realtime — stream DB inserts live ─────────────
    // This handles events that reach the DB via the injected script's
    // direct API call (bypassing the parent postMessage path).
    const supabase = createClient()
    const channel = supabase
      .channel(`session_events:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_events',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (!mountedRef.current) return
          const row = payload.new as Record<string, unknown>
          // Forward to the onEvent callback only — don't re-queue to avoid double-posting
          const ev: LogEvent = {
            event_type: (row.event_type as string) ?? 'custom',
            ts: (row.ts as string) ?? new Date().toISOString(),
            method: row.method as string | undefined,
            request_url: row.request_url as string | undefined,
            status_code: row.status_code as number | undefined,
            response_time_ms: row.response_time_ms as number | undefined,
            log_level: row.log_level as string | undefined,
            log_message: row.log_message as string | undefined,
            payload: row.payload as Record<string, unknown> | undefined,
          }
          onEvent?.(ev)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('live')
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setRealtimeStatus('error')
      })

    // ─── Periodic flush every 5s ────────────────────────────────
    const periodicFlush = setInterval(flush, 5000)

    return () => {
      mountedRef.current = false
      window.removeEventListener('message', onMessage)
      clearInterval(periodicFlush)
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
      flush() // final flush on unmount
      supabase.removeChannel(channel)
    }
  }, [logEvent, flush, sessionId, targetUrl, onEvent])

  // Expose realtime status as a data attribute for E2E testing
  return (
    <span
      data-testid="runlogger-status"
      data-realtime={realtimeStatus}
      className="sr-only"
      aria-hidden="true"
    />
  )
}
