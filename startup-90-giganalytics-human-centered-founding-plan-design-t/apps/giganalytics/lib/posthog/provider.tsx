'use client'

import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Dynamically import posthog-js only in browser to avoid SSR prerender crash
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'
    if (!key || key.startsWith('phc_placeholder')) return

    import('posthog-js').then(({ default: posthog }) => {
      if (posthog.__loaded) return
      posthog.init(key, {
        api_host: host,
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: false,
        persistence: 'localStorage',
      })
    }).catch(() => {})
  }, [])

  return <>{children}</>
}

// Client-only tracking helpers — safe to call in event handlers / useEffect
export function trackLandingVariant(variant: string) {
  if (typeof window === 'undefined') return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key || key.startsWith('phc_placeholder')) return
  import('posthog-js').then(({ default: posthog }) => {
    try { posthog.capture('landing_variant_viewed', { variant, path: window.location.pathname }) } catch {}
  }).catch(() => {})
}

export function trackCtaClick(variant: string, ctaLabel: string) {
  if (typeof window === 'undefined') return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key || key.startsWith('phc_placeholder')) return
  import('posthog-js').then(({ default: posthog }) => {
    try { posthog.capture('landing_cta_clicked', { variant, cta_label: ctaLabel }) } catch {}
  }).catch(() => {})
}
