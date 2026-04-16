'use client'
/**
 * UTM parameter capture — stores UTM params from URL into sessionStorage
 * and localStorage so attribution persists across pages and form submissions.
 *
 * Usage: place <UTMCapture /> in app/layout.tsx (inside body).
 *
 * UTM params captured: utm_source, utm_medium, utm_campaign, utm_content, utm_term
 */
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const

export type UTMData = Partial<Record<(typeof UTM_KEYS)[number], string>>

export function UTMCapture() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const utmData: UTMData = {}
    let hasUtm = false

    for (const key of UTM_KEYS) {
      const val = searchParams.get(key)
      if (val) {
        utmData[key] = val
        hasUtm = true
      }
    }

    if (!hasUtm) return

    // Store in both session and local storage
    // sessionStorage: for the current visit
    // localStorage: for attribution even if user comes back later
    try {
      sessionStorage.setItem('betawindow_utm', JSON.stringify(utmData))
      // Only write to localStorage if this is the first-touch (not overwrite)
      if (!localStorage.getItem('betawindow_utm_first_touch')) {
        localStorage.setItem('betawindow_utm_first_touch', JSON.stringify(utmData))
      }
      // Always update last-touch
      localStorage.setItem('betawindow_utm_last_touch', JSON.stringify(utmData))
    } catch {
      // Storage may be blocked in some browsers
    }
  }, [searchParams])

  return null
}

/**
 * Retrieve stored UTM data for form submission attribution.
 * Call this when submitting a signup or test request form.
 */
export function getStoredUTM(): { firstTouch: UTMData | null; lastTouch: UTMData | null } {
  try {
    const firstTouch = localStorage.getItem('betawindow_utm_first_touch')
    const lastTouch = localStorage.getItem('betawindow_utm_last_touch')
    return {
      firstTouch: firstTouch ? JSON.parse(firstTouch) : null,
      lastTouch: lastTouch ? JSON.parse(lastTouch) : null,
    }
  } catch {
    return { firstTouch: null, lastTouch: null }
  }
}
