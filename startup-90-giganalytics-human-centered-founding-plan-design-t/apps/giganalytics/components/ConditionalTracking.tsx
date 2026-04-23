'use client'

import { useEffect, useState } from 'react'
import { RedditPixel } from './RedditPixel'
import { GoogleTag } from './GoogleTag'

const CONSENT_KEY = 'ga_cookie_consent'

/**
 * ConditionalTracking — only renders advertising/analytics pixels
 * after the user has provided explicit consent via the CookieConsent banner.
 * Must be client-side only so it reads localStorage after hydration.
 */
export function ConditionalTracking() {
  const [consent, setConsent] = useState<string | null>(null)

  useEffect(() => {
    // Read initial consent
    setConsent(localStorage.getItem(CONSENT_KEY))

    // Listen for consent changes (e.g. user accepts after seeing the banner)
    function handleConsentChange() {
      setConsent(localStorage.getItem(CONSENT_KEY))
    }

    window.addEventListener('ga_consent_changed', handleConsentChange)
    return () => window.removeEventListener('ga_consent_changed', handleConsentChange)
  }, [])

  // Only render advertising pixels when user has explicitly accepted all cookies
  if (consent !== 'accepted') return null

  return (
    <>
      <GoogleTag />
      <RedditPixel />
    </>
  )
}
