'use client'
import { useEffect } from 'react'
import { useAnalytics } from '@/lib/analytics'

export function LandingTracker() {
  const { track } = useAnalytics()

  useEffect(() => {
    if (typeof document === 'undefined') return

    // Capture UTM params from URL and persist to cookie for auth callback
    const params = new URLSearchParams(window.location.search)
    const source = params.get('utm_source') || params.get('ref') || (document.referrer ? 'referral' : 'direct')
    const medium = params.get('utm_medium') || ''
    const campaign = params.get('utm_campaign') || ''
    const referrer = document.referrer || ''

    // Store in session cookies (30-min TTL) for the auth callback to read
    const expires = new Date(Date.now() + 30 * 60 * 1000).toUTCString()
    if (source) document.cookie = `utm_source=${encodeURIComponent(source)}; expires=${expires}; path=/; SameSite=Lax`
    if (medium) document.cookie = `utm_medium=${encodeURIComponent(medium)}; expires=${expires}; path=/; SameSite=Lax`
    if (campaign) document.cookie = `utm_campaign=${encodeURIComponent(campaign)}; expires=${expires}; path=/; SameSite=Lax`

    track('landing_page_viewed', {
      referrer,
      path: '/',
      utm_source: source,
      utm_medium: medium,
      utm_campaign: campaign,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
