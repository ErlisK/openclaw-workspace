'use client'

import posthog from 'posthog-js'

// PostHog is now initialized only after cookie consent (see CookieConsent component)
// This file retains the capture helper functions for events

let initialized = false

// Legacy provider kept for compatibility but analytics init is gated by CookieConsent
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

// ─── Safe capture wrapper ─────────────────────────────────────────────────────

function capture(event: string, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key || key.startsWith('phc_placeholder')) return
  try { posthog.capture(event, props) } catch {}
}

// ─── Core tracked events (≥5 for success criteria) ───────────────────────────

/** 1. Landing variant viewed */
export function trackLandingVariant(variant: string): void {
  capture('landing_variant_viewed', { variant, path: window.location.pathname })
}

/** 2. CTA clicked on landing page */
export function trackCtaClick(variant: string, ctaLabel: string): void {
  capture('landing_cta_clicked', { variant, cta_label: ctaLabel })
}

/** 3. CSV import completed */
export function trackImportCompleted(props: {
  platform: string
  rowCount: number
  streamId?: string
  streamName?: string
}): void {
  capture('import_completed', {
    platform: props.platform,
    row_count: props.rowCount,
    stream_id: props.streamId,
    stream_name: props.streamName,
  })
}

/** 4. Timer session logged (start → stop) */
export function trackTimerSession(props: {
  durationMinutes: number
  entryType: string
  streamId?: string
}): void {
  capture('timer_session', {
    duration_minutes: props.durationMinutes,
    entry_type: props.entryType,
    stream_id: props.streamId,
    duration_hours: +(props.durationMinutes / 60).toFixed(2),
  })
}

/** 5. AI insights viewed */
export function trackInsightsViewed(props: {
  insightType: string
  insightCount: number
  dataQuality: string
  isAiGenerated: boolean
}): void {
  capture('insights_viewed', {
    insight_type: props.insightType,
    insight_count: props.insightCount,
    data_quality: props.dataQuality,
    is_ai_generated: props.isAiGenerated,
  })
}

/** 6. Upgrade button clicked */
export function trackUpgradeClicked(props: {
  source: string
  period?: string
  currentTier?: string
}): void {
  capture('upgrade_clicked', {
    source: props.source,
    period: props.period,
    current_tier: props.currentTier ?? 'free',
  })
}

/** 7. Demo data loaded */
export function trackDemoDataLoaded(props: { source: string }): void {
  capture('demo_data_loaded', { source: props.source })
}

/** 8. ROI dashboard viewed */
export function trackDashboardViewed(props: {
  hasData: boolean
  streamCount: number
  trueHourlyRate?: number
}): void {
  capture('dashboard_viewed', {
    has_data: props.hasData,
    stream_count: props.streamCount,
    true_hourly_rate: props.trueHourlyRate,
  })
}

/** 9. Heatmap viewed */
export function trackHeatmapViewed(props: { cellCount: number }): void {
  capture('heatmap_viewed', { cell_count: props.cellCount })
}

/** 10. Checkout initiated */
export function trackCheckoutInitiated(props: {
  priceId: string
  period: 'monthly' | 'annual'
}): void {
  capture('checkout_initiated', {
    price_id: props.priceId,
    period: props.period,
  })
}

/** 11. Free audit requested */
export function trackAuditRequested(props: { source?: string }): void {
  capture('audit_requested', { source: props.source ?? 'direct' })
}

/** 12. Signup started (user began filling the signup form) */
export function trackSignupStarted(props: { source?: string; campaign?: string }): void {
  capture('signup_started', { source: props.source, campaign: props.campaign })
}

/** 13. Subscription started (paid conversion) */
export function trackSubscriptionStarted(props: {
  plan: string
  price: number
  source?: string
}): void {
  capture('subscription_started', { plan: props.plan, price: props.price, source: props.source })
}
