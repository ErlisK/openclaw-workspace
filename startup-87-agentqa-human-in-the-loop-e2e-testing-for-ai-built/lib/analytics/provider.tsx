'use client'
/**
 * PostHog provider — wraps the app in PostHog context.
 * Initializes only after cookie consent is granted.
 */
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'

function initPostHog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
  if (!key) return
  if (posthog.__loaded) return

  posthog.init(key, {
    api_host: host,
    ui_host: 'https://us.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') {
        ph.opt_out_capturing()
      }
      ;(window as unknown as Record<string, unknown>).posthog = ph
    },
  })
}

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only initialize if user has already consented
    const consent = localStorage.getItem('bw-cookie-consent')
    if (consent === 'accepted') {
      initPostHog()
    }
    // Listen for consent granted during this session
    const handler = () => initPostHog()
    window.addEventListener('cookie-consent-granted', handler)
    return () => window.removeEventListener('cookie-consent-granted', handler)
  }, [])

  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>
  }

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
