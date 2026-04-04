'use client'

import { useEffect, useRef } from 'react'

interface PolicyViewTrackerProps {
  pageName: string
  path: string
}

export default function PolicyViewTracker({ pageName, path }: PolicyViewTrackerProps) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'policy_view',
        props: { page_name: pageName, path },
      }),
    }).catch(() => {})
  }, [pageName, path])

  return null
}
