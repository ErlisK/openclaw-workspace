'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'
    // Skip init if key is missing or placeholder
    if (!key || key.startsWith('phc_placeholder')) return
    posthog.init(key, {
      api_host: host,
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: false, // manual events only for clean data
      persistence: 'localStorage',
    })
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}

// Track a landing variant view + CTA click
export function trackLandingVariant(variant: string) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key || key.startsWith('phc_placeholder')) return
  posthog.capture('landing_variant_viewed', { variant, path: window.location.pathname })
}

export function trackCtaClick(variant: string, ctaLabel: string) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key || key.startsWith('phc_placeholder')) return
  posthog.capture('landing_cta_clicked', { variant, cta_label: ctaLabel })
}
