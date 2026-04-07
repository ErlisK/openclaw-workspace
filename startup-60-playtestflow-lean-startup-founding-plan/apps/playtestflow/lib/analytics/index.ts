/**
 * Analytics abstraction — privacy-safe, PostHog-optional.
 *
 * CLIENT: track(event, props)
 *   - No-op unless user has accepted consent (localStorage 'irb_consent' === 'true')
 *   - When NEXT_PUBLIC_POSTHOG_KEY is set, delegates to posthog-js (via PostHogProvider)
 *   - autocapture and session recording are disabled by default in PostHogProvider
 *
 * SERVER: Use lib/analytics/server.ts instead (posthog-node, Node-only)
 */

// ─── Shared: SHA-256 email hash ──────────────────────────────────────────────

/**
 * Hash an email address with SHA-256 for use as an anonymous distinct_id.
 * Works in both Node.js (crypto module) and browser (SubtleCrypto).
 */
export async function hashEmail(email: string): Promise<string> {
  const normalised = email.toLowerCase().trim()

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(normalised)
    )
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  // Fallback for environments without SubtleCrypto (shouldn't happen in modern runtimes)
  const { createHash } = await import('crypto')
  return createHash('sha256').update(normalised).digest('hex')
}

// ─── Client-side ─────────────────────────────────────────────────────────────

/**
 * Returns true if the user has given explicit consent.
 * Falls back to false in SSR / non-browser environments.
 */
export function hasConsent(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('irb_consent') === 'true'
}

/**
 * Persist consent and immediately unlock/lock client-side analytics.
 */
export function setConsent(value: boolean): void {
  if (typeof window === 'undefined') return
  if (value) {
    localStorage.setItem('irb_consent', 'true')
  } else {
    localStorage.removeItem('irb_consent')
  }
}

/**
 * Client-side event tracking.
 * - No-op when consent is missing.
 * - No-op when PostHog key is absent.
 * - Never includes raw PII; caller must hash emails before calling.
 */
export function track(
  event: string,
  props: Record<string, unknown> = {}
): void {
  if (!hasConsent()) return
  if (typeof window === 'undefined') return

  if (process.env.NODE_ENV === 'development') {
    console.debug('[analytics:client]', event, props)
  }

  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return

  try {
    import('posthog-js').then(({ default: ph }) => {
      ph.capture(event, props)
    })
  } catch {
    // swallow — analytics must never crash the app
  }
}
