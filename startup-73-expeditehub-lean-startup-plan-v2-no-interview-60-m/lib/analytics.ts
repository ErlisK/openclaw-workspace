/**
 * ExpediteHub analytics — centralised PostHog event catalogue.
 * All events in the spec are defined here so names never drift.
 *
 * Events:
 *   lp_view             – landing page mounted
 *   price_variant       – price variant resolved (after feature-flag load)
 *   homeowner_cta_click – any homeowner CTA / "Get my packet" click
 *   pro_cta_click       – any pro-side CTA click
 *   request_intent_submit – homeowner submitted the intake form (pre-Stripe)
 *   checkout_view       – Stripe checkout page opened (redirect fired)
 *   checkout_success    – Stripe checkout.session.completed webhook confirmed
 *   pro_signup          – pro submitted the /pro signup form
 *   pro_profile_complete – pro profile flagged complete in DB
 *   email_captured      – abandonment: email saved before full form submit
 */

import posthog from 'posthog-js'

type PriceVariant = 'control' | 'beta_149' | 'beta_99'

function safe(fn: () => void) {
  try { fn() } catch { /* posthog not ready */ }
}

// ─── Google Ads conversion helpers ───────────────────────────────────────────

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

/** Fire a Google Ads conversion event.
 * CONVERSION_ID and CONVERSION_LABEL are set when the Ads account is created.
 * Format: AW-XXXXXXXXXX/LABEL
 */
export function gtagConversion(event: 'request_intent_submit' | 'checkout_success' | 'deck_lp_form_submit' | 'deck_checkout_success', value?: number) {
  try {
    const conversionId = process.env.NEXT_PUBLIC_GOOGLE_CONVERSION_ID
    const labels: Record<string, string | undefined> = {
      request_intent_submit: process.env.NEXT_PUBLIC_GOOGLE_CONV_LABEL_INTENT,
      checkout_success:      process.env.NEXT_PUBLIC_GOOGLE_CONV_LABEL_PURCHASE,
    }
    if (typeof window !== 'undefined' && window.gtag && conversionId && labels[event]) {
      window.gtag('event', 'conversion', {
        send_to: `${conversionId}/${labels[event]}`,
        value: value ?? 0,
        currency: 'USD',
      })
    }
    // Also push to dataLayer for GTM if present
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({ event, value, currency: 'USD' })
    }
  } catch { /* non-critical */ }
}

// ─── Landing ─────────────────────────────────────────────────────────────────

export function trackLpView(props?: Record<string, unknown>) {
  safe(() => posthog.capture('lp_view', {
    page: 'landing',
    metro: 'Austin',
    ...props,
  }))
}

export function trackPriceVariant(variant: PriceVariant, price: string) {
  safe(() => {
    posthog.capture('price_variant', { variant, price, metro: 'Austin' })
    // Also register as a super-property so it shows on every subsequent event
    posthog.register({ price_variant: variant, price_shown: price })
  })
}

// ─── CTAs ─────────────────────────────────────────────────────────────────────

export function trackHomeownerCtaClick(props: {
  source: string
  price_variant: PriceVariant
  price: string
}) {
  safe(() => posthog.capture('homeowner_cta_click', { metro: 'Austin', ...props }))
}

export function trackProCtaClick(props: { source: string }) {
  safe(() => posthog.capture('pro_cta_click', { metro: 'Austin', ...props }))
}

// ─── Homeowner funnel ─────────────────────────────────────────────────────────

export function trackEmailCaptured(props: {
  price_variant: PriceVariant
}) {
  safe(() => posthog.capture('email_captured', { metro: 'Austin', ...props }))
}

export function trackRequestIntentSubmit(props: {
  price_variant: PriceVariant
  project_type: string
  timeline: string
  zip: string
}) {
  safe(() => posthog.capture('request_intent_submit', { metro: 'Austin', role: 'homeowner', ...props }))
}

export function trackCheckoutView(props: {
  price_variant: PriceVariant
  project_type: string
  email?: string
  session_id?: string
}) {
  safe(() => posthog.capture('checkout_view', { metro: 'Austin', ...props }))
  // Also persist to DB for abandoned checkout nudging
  try {
    if (typeof window !== 'undefined') {
      const utm = (() => { try { return JSON.parse(sessionStorage.getItem('utm_data') || '{}') } catch { return {} } })()
      const sid = props.session_id || posthog.get_distinct_id?.() || Math.random().toString(36).slice(2)
      fetch('/api/track-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sid,
          email: props.email || null,
          event_type: 'checkout_view',
          utm_source: utm.utm_source,
          utm_medium: utm.utm_medium,
          utm_campaign: utm.utm_campaign,
          metadata: { price_variant: props.price_variant, project_type: props.project_type },
        }),
      }).catch(() => {})
    }
  } catch { /* non-critical */ }
}

export function trackCheckoutSuccess(props: {
  price_variant: string
  amount_paid: number
  project_type?: string
}) {
  safe(() => posthog.capture('checkout_success', { metro: 'Austin', ...props }))
}

// ─── Pro funnel ───────────────────────────────────────────────────────────────

export function trackProSignup(props: {
  specialty: string
  zip: string
}) {
  safe(() => posthog.capture('pro_signup', { metro: 'Austin', ...props }))
}

export function trackProProfileComplete(props: {
  specialty: string
  zip: string
}) {
  safe(() => posthog.capture('pro_profile_complete', { metro: 'Austin', ...props }))
}

// ─── Pro auth ─────────────────────────────────────────────────────────────────

export function trackProMagicLinkSent() {
  safe(() => posthog.capture('pro_magic_link_sent', { metro: 'Austin' }))
}

export function trackProLogin() {
  safe(() => posthog.capture('pro_login', { metro: 'Austin' }))
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Call once when user identity is known (e.g. after auth) */
export function identifyPro(email: string, props?: Record<string, unknown>) {
  safe(() => posthog.identify(email, { role: 'pro', metro: 'Austin', ...props }))
}

export function getDistinctId(): string {
  try { return posthog.get_distinct_id() ?? '' } catch { return '' }
}
