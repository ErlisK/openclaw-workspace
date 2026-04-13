'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect, type ReactNode } from 'react'

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key || typeof window === 'undefined') return

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      ui_host: 'https://us.posthog.com',
      capture_pageview: false,          // We handle this manually via usePageView
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
      autocapture: {
        // Only autocapture relevant elements, not every click
        element_allowlist: ['button', 'a', 'form'],
        css_selector_allowlist: ['[data-posthog]'],
      },
      session_recording: {
        maskAllInputs: true,            // Privacy: mask all inputs
        maskInputFn: (text, element) => {
          // Mask email/password fields
          if (element?.getAttribute('type') === 'password') return '***'
          if (element?.getAttribute('type') === 'email') return '***@***'
          return text
        },
      },
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') ph.debug()
      },
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      {children}
    </PHProvider>
  )
}
