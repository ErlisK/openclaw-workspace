'use client'

/**
 * UTMTracker — client component.
 *
 * Placed once in the root layout. On mount it:
 *  1. Reads UTM params from the URL search string
 *  2. Persists them to sessionStorage (first-touch attribution)
 *  3. Fires a PostHog `utm_attribution` event (if PostHog is initialised)
 *  4. POSTs to /api/utm for server-side Supabase storage (best-effort)
 *
 * Renders nothing — purely side-effect.
 */

import { useEffect } from 'react'
import { parseUTM, persistUTM, hasUTM, getSessionId } from '@/lib/utm'

export function UTMTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const searchParams = new URLSearchParams(window.location.search)
    const utmParams = parseUTM(searchParams)

    if (!hasUTM(utmParams)) return   // no UTM in this URL — nothing to do

    // 1. Persist to sessionStorage (first-touch)
    persistUTM(utmParams)

    // 2. Fire PostHog event if available
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ph = (window as any).posthog
      if (ph && typeof ph.capture === 'function') {
        ph.capture('utm_attribution', {
          ...utmParams,
          landing_path: window.location.pathname,
          referrer: document.referrer || undefined,
        })
      }
    } catch { /* PostHog not initialized — best-effort */ }

    // 3. Server-side capture (Supabase + PostHog server)
    const sessionId = getSessionId()
    fetch('/api/utm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        ...utmParams,
        landing_path: window.location.pathname,
        referrer: document.referrer || undefined,
      }),
    }).catch(() => { /* best-effort */ })

  }, []) // runs once per page load — no deps needed

  return null
}
