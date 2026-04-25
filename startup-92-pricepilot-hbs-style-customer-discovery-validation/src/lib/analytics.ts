/**
 * Client-side analytics tracker.
 * Fires events to /api/analytics (server-persisted to Supabase analytics_events).
 * Gracefully no-ops on server side.
 *
 * Usage:
 *   import { track } from '@/lib/analytics'
 *   track('import_started', { source: 'stripe-csv' })
 *
 * Supported events (custom PricePilot events):
 *   import_started          – user clicks import / starts upload
 *   import_completed        – import API returned success
 *   suggestion_created      – engine generated a price suggestion
 *   experiment_published    – experiment went live
 *   rollback_clicked        – user clicked rollback on an experiment
 *   upgrade_clicked         – user clicked an upgrade/Pro CTA
 *   onboarding_viewed       – onboarding page loaded
 *   onboarding_step_clicked – user clicked Go on a checklist step
 *   onboarding_complete     – all required steps marked done
 */
export function track(event: string, properties: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return // server-side guard

  const payload = {
    event,
    properties: {
      ...properties,
      page: window.location.pathname,
      referrer: document.referrer || undefined,
      url: window.location.href,
      ab_variant: getCookieVariant('ab_hero'),
    },
  }

  // Fire-and-forget — non-blocking
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true, // survives page unload
  }).catch(() => { /* analytics is non-critical */ })
}

function getCookieVariant(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  return document.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`))
    ?.split('=')?.[1]
}

/** Track a DOM click by attaching a listener. Call once per element. */
export function trackClick(
  element: HTMLElement | null,
  event: string,
  properties: Record<string, unknown> = {}
): void {
  if (!element) return
  element.addEventListener('click', () => track(event, properties), { once: false })
}

/**
 * Track ad landing — call on pages receiving paid traffic.
 * Reads UTM from URL and fires ad_click_landing event.
 */
export function trackAdLanding(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const source = params.get('utm_source');
  const medium = params.get('utm_medium');
  if (!source) return;
  track('ad_click_landing', {
    utm_source: source,
    utm_medium: medium,
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content'),
  });
}
