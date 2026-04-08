'use client'
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function TrackerInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const visitorId = localStorage.getItem('vid') || Math.random().toString(36).slice(2)
    localStorage.setItem('vid', visitorId)

    const utm_source = searchParams.get('utm_source')
    const utm_medium = searchParams.get('utm_medium')
    const utm_campaign = searchParams.get('utm_campaign')

    // Map pathname to segment signal
    const segmentHints: Record<string, string> = {
      '/pricing': 'considering',
      '/webinar': 'webinar_interest',
      '/pilot': 'pilot_interest',
      '/case-studies': 'social_proof',
      '/security': 'procurement',
      '/survey': 'pricing_research',
    }

    fetch('/api/funnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId,
        event: 'page_view',
        page: pathname,
        source: utm_source,
        medium: utm_medium,
        campaign: utm_campaign,
        segment: segmentHints[pathname] || null,
      }),
    }).catch(() => {})
  }, [pathname, searchParams])

  return null
}

export default function FunnelTracker() {
  return (
    <Suspense fallback={null}>
      <TrackerInner />
    </Suspense>
  )
}
