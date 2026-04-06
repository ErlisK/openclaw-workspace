'use client'

import { useCallback, useEffect, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventType =
  | 'page_view'
  | 'cta_click'
  | 'section_view'
  | 'waitlist_start'    // user focuses email field
  | 'waitlist_submit'   // form submitted
  | 'waitlist_success'  // server confirmed
  | 'waitlist_duplicate'
  | 'scroll_depth'

export interface TrackEventPayload {
  event_type: EventType
  source?: string        // e.g. 'hero', 'nav', 'pricing'
  cta_label?: string     // e.g. 'Join Waitlist', 'See how it works'
  section?: string       // page section identifier
  page_path?: string
  session_id?: string
  properties?: Record<string, unknown>
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
}

// ─── Session ID (anonymous, per-tab) ─────────────────────────────────────────

function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr'
  const key = 'gs_sid'
  let sid = sessionStorage.getItem(key)
  if (!sid) {
    sid = crypto.randomUUID()
    sessionStorage.setItem(key, sid)
  }
  return sid
}

// ─── UTM extraction ───────────────────────────────────────────────────────────

function getUTMParams() {
  if (typeof window === 'undefined') return {}
  const p = new URLSearchParams(window.location.search)
  return {
    utm_source: p.get('utm_source') || undefined,
    utm_medium: p.get('utm_medium') || undefined,
    utm_campaign: p.get('utm_campaign') || undefined,
  }
}

// ─── Core track function (fire-and-forget) ────────────────────────────────────

export async function track(payload: TrackEventPayload): Promise<void> {
  try {
    const utms = getUTMParams()
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        ...utms,
        session_id: payload.session_id || getSessionId(),
        page_path: payload.page_path || (typeof window !== 'undefined' ? window.location.pathname : '/'),
        referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      }),
      // keepalive so it fires even on page unload
      keepalive: true,
    })
  } catch {
    // Silently absorb — never let analytics errors break UX
  }
}

// ─── useTrack hook ─────────────────────────────────────────────────────────────

export function useTrack() {
  return useCallback(
    (payload: Omit<TrackEventPayload, 'session_id' | 'page_path'>) =>
      track(payload),
    []
  )
}

// ─── usePageView hook — fires once on mount ───────────────────────────────────

export function usePageView(source?: string) {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    track({ event_type: 'page_view', source: source || 'direct' })
  }, [source])
}

// ─── useScrollDepth — fires at 25/50/75/100% ─────────────────────────────────

export function useScrollDepth() {
  const milestones = useRef<Set<number>>(new Set())

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY + window.innerHeight
      const total = document.documentElement.scrollHeight
      const pct = Math.round((scrolled / total) * 100)

      for (const threshold of [25, 50, 75, 100]) {
        if (pct >= threshold && !milestones.current.has(threshold)) {
          milestones.current.add(threshold)
          track({
            event_type: 'scroll_depth',
            properties: { depth_pct: threshold },
          })
        }
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
}

// ─── useIntersectionTrack — fires when a section enters viewport ──────────────

export function useIntersectionTrack(
  ref: React.RefObject<Element | null>,
  section: string,
  options?: IntersectionObserverInit
) {
  const fired = useRef(false)
  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired.current) {
          fired.current = true
          track({ event_type: 'section_view', section })
        }
      },
      { threshold: 0.3, ...options }
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref, section, options])
}
