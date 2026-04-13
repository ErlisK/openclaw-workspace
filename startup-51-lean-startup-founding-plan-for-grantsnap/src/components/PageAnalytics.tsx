'use client'

import { usePageView, useScrollDepth } from '@/lib/analytics'

/**
 * Drop this in layout.tsx (client boundary).
 * Handles page_view on mount + scroll_depth milestones passively.
 */
export function PageAnalytics({ source }: { source?: string }) {
  usePageView(source)
  useScrollDepth()
  return null
}
