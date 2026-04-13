/**
 * lib/analytics.ts
 *
 * Unified analytics client for GrantPilot.
 * Dual-track: PostHog (client-side) + Supabase usage_events (server-side).
 *
 * Key events tracked:
 *  - signup
 *  - onboarding_complete
 *  - rfp_parsed
 *  - narrative_generated
 *  - export_completed
 *  - checkout_succeeded
 *  - qa_passed
 *  - order_created
 *  - order_complete
 *  - feature_click
 *  - ab_variant_assigned
 */

export type AnalyticsEvent =
  | 'signup'
  | 'onboarding_complete'
  | 'rfp_parsed'
  | 'narrative_generated'
  | 'export_completed'
  | 'checkout_succeeded'
  | 'qa_passed'
  | 'ai_qa_run'
  | 'narrative_enhanced'
  | 'grants_discovered'
  | 'order_created'
  | 'order_complete'
  | 'feature_click'
  | 'ab_variant_assigned'
  | 'page_view'
  | 'pricing_viewed'
  | 'upgrade_cta_clicked'
  | 'hero_exposure'
  | 'hero_cta_click'
  | 'limit_hit'

/**
 * Client-side: fire PostHog event.
 * Safe to call from browser only.
 */
export function track(event: AnalyticsEvent, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ph = (window as any).posthog
    if (ph && typeof ph.capture === 'function') {
      ph.capture(event, { ...properties, source: 'grantpilot_web' })
    }
  } catch {
    // analytics should never break the app
  }
}

/**
 * Client-side: identify user in PostHog.
 */
export function identify(userId: string, traits?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ph = (window as any).posthog
    if (ph && typeof ph.identify === 'function') {
      ph.identify(userId, traits)
    }
  } catch {}
}

/**
 * Client-side: get A/B variant from PostHog feature flags.
 * Falls back to 'control' if PostHog not loaded.
 */
export function getVariant(flagKey: string): string {
  if (typeof window === 'undefined') return 'control'
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ph = (window as any).posthog
    if (ph && typeof ph.getFeatureFlag === 'function') {
      return String(ph.getFeatureFlag(flagKey) || 'control')
    }
  } catch {}
  return 'control'
}
