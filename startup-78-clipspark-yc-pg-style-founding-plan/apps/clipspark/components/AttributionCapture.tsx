'use client'
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

// Persists ?ref= and UTM params as cookies for attribution tracking through auth
export function AttributionCapture() {
  const params = useSearchParams()

  useEffect(() => {
    const ref = params.get('ref')
    const utmSource = params.get('utm_source')
    const utmMedium = params.get('utm_medium')
    const utmCampaign = params.get('utm_campaign')

    const DAYS_30 = 30 * 24 * 60 * 60
    const expires = new Date(Date.now() + DAYS_30 * 1000).toUTCString()

    if (ref) {
      document.cookie = `cs_ref=${encodeURIComponent(ref)}; path=/; expires=${expires}; SameSite=Lax`
    }
    if (utmSource) {
      document.cookie = `utm_source=${encodeURIComponent(utmSource)}; path=/; expires=${expires}; SameSite=Lax`
    }
    if (utmMedium) {
      document.cookie = `utm_medium=${encodeURIComponent(utmMedium)}; path=/; expires=${expires}; SameSite=Lax`
    }
    if (utmCampaign) {
      document.cookie = `utm_campaign=${encodeURIComponent(utmCampaign)}; path=/; expires=${expires}; SameSite=Lax`
    }
  }, [params])

  return null
}
