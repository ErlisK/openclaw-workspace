'use client'

/**
 * PlausibleTracker — client component that:
 * 1. Reads UTM parameters from the URL on first load
 * 2. Fires a custom Plausible event with source/medium/campaign
 * 3. Stores UTM params in sessionStorage for attribution across page navigations
 * 4. Exposes window.__pricepilot_utm for use by other client components
 */
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, string> }) => void
    __pricepilot_utm?: Record<string, string>
  }
}

export function PlausibleTracker() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const
    const fromUrl: Record<string, string> = {}

    for (const key of utmKeys) {
      const val = searchParams.get(key)
      if (val) fromUrl[key] = val
    }

    // Persist UTM params for the session so later conversions keep attribution
    if (Object.keys(fromUrl).length > 0) {
      try { sessionStorage.setItem('pricepilot_utm', JSON.stringify(fromUrl)) } catch { /* private mode */ }
    }

    // Read stored UTM (may come from earlier in session)
    let stored: Record<string, string> = {}
    try {
      const raw = sessionStorage.getItem('pricepilot_utm')
      if (raw) stored = JSON.parse(raw)
    } catch { /* private mode */ }

    const utm = { ...stored, ...fromUrl }
    window.__pricepilot_utm = utm

    // Fire Plausible custom event for source attribution if UTM present
    if (utm.utm_source && window.plausible) {
      window.plausible('utm_hit', {
        props: {
          source:   utm.utm_source   || '(direct)',
          medium:   utm.utm_medium   || '(none)',
          campaign: utm.utm_campaign || '(none)',
          content:  utm.utm_content  || '',
        },
      })
    }
  }, [searchParams])

  return null
}
