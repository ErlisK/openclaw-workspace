'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

    if (!key) {
      // Analytics disabled — no PostHog key configured
      return
    }

    posthog.init(key, {
      api_host: host,
      person_profiles: 'identified_only',
      // Privacy-safe defaults — no autocapture, no session recording
      autocapture: false,
      disable_session_recording: true,
      capture_pageview: false, // We emit explicit landing_view instead
      capture_pageleave: false,
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') {
          // Uncomment to debug in dev:
          // ph.debug()
        }
      },
    })
  }, [])

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) {
    return <>{children}</>
  }

  return <PHProvider client={posthog}>{children}</PHProvider>
}
