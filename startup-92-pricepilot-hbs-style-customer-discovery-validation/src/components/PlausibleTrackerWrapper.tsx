import { Suspense } from 'react'
import { PlausibleTracker } from './PlausibleTracker'

/**
 * Wraps PlausibleTracker in Suspense because useSearchParams() requires it
 * in Next.js App Router (server components can't call it directly).
 */
export function PlausibleTrackerWrapper() {
  return (
    <Suspense fallback={null}>
      <PlausibleTracker />
    </Suspense>
  )
}
