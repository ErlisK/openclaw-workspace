'use client'
import { useEffect } from 'react'
import posthog from 'posthog-js'

let initialized = false

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (initialized || typeof window === 'undefined') return
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key || key.includes('placeholder')) return

    posthog.init(key, {
      api_host: 'https://us.i.posthog.com',
      ui_host: 'https://us.posthog.com',
      capture_pageview: false,         // we fire lp_view manually with extra props
      capture_pageleave: true,
      autocapture: false,
      disable_session_recording: false,
      persistence: 'localStorage+cookie',
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') {
          ph.debug()
        }
      },
    })
    initialized = true
  }, [])

  return <>{children}</>
}
