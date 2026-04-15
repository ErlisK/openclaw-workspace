'use client'
/**
 * PostHog provider — wraps the app in PostHog context.
 * Must be rendered inside a Client Component.
 * Usage: wrap the root layout with <PHProvider>.
 */
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
    if (!key) return
    if (posthog.__loaded) return // already initialized

    posthog.init(key, {
      api_host: host,
      ui_host: 'https://us.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      loaded: (ph) => {
        // In dev, disable autocapture to avoid noise
        if (process.env.NODE_ENV === 'development') {
          ph.opt_out_capturing()
        }
      },
    })
  }, [])

  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>
  }

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
