/**
 * Client-side UTM & session tracking utilities
 */

const SESSION_KEY = 'ptf_sid'

/** Generate or retrieve a browser session ID (not user identity) */
export function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sid = sessionStorage.getItem(SESSION_KEY)
  if (!sid) {
    sid = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, sid)
  }
  return sid
}

/** Parse UTM params from URL search string */
export function parseUtmParams(search?: string): Record<string, string | null> {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(search ?? window.location.search)
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content'),
    utm_term: params.get('utm_term'),
  }
}

/** Persist UTMs to sessionStorage so they survive SPA navigation */
export function persistUtms(): void {
  if (typeof window === 'undefined') return
  const utms = parseUtmParams()
  const hasUtm = Object.values(utms).some(Boolean)
  if (hasUtm) {
    sessionStorage.setItem('ptf_utms', JSON.stringify(utms))
  }
}

/** Retrieve persisted UTMs (falls back to current URL) */
export function getUtms(): Record<string, string | null> {
  if (typeof window === 'undefined') return {}
  const stored = sessionStorage.getItem('ptf_utms')
  if (stored) {
    try { return JSON.parse(stored) } catch { /* ignore */ }
  }
  return parseUtmParams()
}

/** Full analytics context for an event */
export function getAnalyticsContext() {
  if (typeof window === 'undefined') return {}
  return {
    ...getUtms(),
    referrer: document.referrer || null,
    page_path: window.location.pathname + window.location.search,
    session_id: getSessionId(),
  }
}

/** Fire-and-forget page view tracking */
export async function trackPageView(): Promise<void> {
  if (typeof window === 'undefined') return
  persistUtms()
  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'page_view',
        ...getAnalyticsContext(),
        user_agent: navigator.userAgent,
      }),
    })
  } catch { /* silent */ }
}
