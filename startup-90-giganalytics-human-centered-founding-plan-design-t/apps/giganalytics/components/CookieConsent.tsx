'use client'

import { useState, useEffect } from 'react'
import posthog from 'posthog-js'
import Link from 'next/link'
import { parseUTM, hasUTM } from '@/lib/utm'

const CONSENT_KEY = 'ga_cookie_consent'

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY)
    if (!consent) {
      setVisible(true)
    } else if (consent === 'accepted') {
      initPosthog()
    }
    // if declined, posthog stays uninitialized
  }, [])

  function captureUTMIfPresent() {
    try {
      const utmParams = parseUTM(new URLSearchParams(window.location.search))
      if (!hasUTM(utmParams)) return
      posthog.capture('utm_attribution', {
        ...utmParams,
        landing_path: window.location.pathname,
        referrer: document.referrer || undefined,
      })
    } catch { /* best-effort */ }
  }

  function initPosthog() {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'
    if (!key || key.startsWith('phc_placeholder')) return
    try {
      posthog.init(key, {
        api_host: host,
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: false,
        persistence: 'localStorage',
        loaded: () => captureUTMIfPresent(),
      })
    } catch {}
  }

  function accept() {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    setVisible(false)
    initPosthog()
    // Also fire UTM capture now that PostHog is ready
    setTimeout(captureUTMIfPresent, 100)
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, 'declined')
    setVisible(false)
    try { posthog.opt_out_capturing() } catch {}
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg px-6 py-4">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-gray-600 flex-1">
          We use analytics cookies to improve GigAnalytics.{' '}
          <Link href="/privacy#cookies" className="text-blue-600 hover:underline">Learn more</Link>
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={decline}
            className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
