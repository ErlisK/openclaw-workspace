/**
 * lib/ab-client.ts — Client-safe A/B utilities (no server imports)
 * 
 * Import from this file in client components ('use client').
 * Import from lib/ab.ts only in server components/routes.
 */

export type ABVariant = 'a' | 'b'

/**
 * Deterministic variant assignment (pure function, no IO).
 * Same visitorId + testName always returns same variant.
 */
export function assignVariant(visitorId: string, testName: string): ABVariant {
  let hash = 0
  const str = `${visitorId}::${testName}`
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % 2 === 0 ? 'a' : 'b'
}

/**
 * Get or create a persistent visitor ID in localStorage.
 * Returns a temporary ID during SSR.
 */
export function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return `ssr_${Date.now()}`
  const KEY = 'ptf_vid'
  let vid = localStorage.getItem(KEY)
  if (!vid) {
    vid = `vis_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    localStorage.setItem(KEY, vid)
  }
  return vid
}
