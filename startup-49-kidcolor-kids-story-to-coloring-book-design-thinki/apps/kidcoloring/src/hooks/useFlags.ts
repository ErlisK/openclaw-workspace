/**
 * useFlags — client-side feature flag hook
 *
 * Fetches /api/v1/config on first mount, caches in sessionStorage for 55s.
 * Returns default values synchronously on first render (no flash/CLS).
 *
 * Usage:
 *   const { flags, loading } = useFlags()
 *   if (flags.PDF_EXPORT) { ... }
 *
 * For SSR / server components, import getFlags() from @/lib/flags directly.
 */
'use client'

import { useState, useEffect } from 'react'
import type { PublicFlags } from '@/lib/flags'

const CACHE_KEY = 'kc_flags_v2'
const CACHE_TTL = 55_000   // 55s — matches server cache-control header

const DEFAULT_FLAGS: PublicFlags = {
  TTS_ENABLED:        true,
  PDF_EXPORT:         true,
  EMAIL_GATE:         true,
  SHARE_BUTTON:       true,
  GALLERY_ENABLED:    true,
  MAINTENANCE_MODE:   false,
  MAINTENANCE_MSG:    '',
  TRIAL_PAGES:        4,
  UPSELL_PRICE:       9.99,
  UPSELL_VARIANT:     'A',
  HERO_CTA_VARIANT:   'both',
  UPSELL_ROLLOUT_PCT: 0,
  POLLINATIONS_MODEL: 'flux',
  IMAGE_WIDTH:        768,
  IMAGE_HEIGHT:       1024,
}

export interface UseFlagsResult {
  flags: PublicFlags
  loading: boolean
  error: string | null
  /** Force a fresh fetch, ignoring cache */
  refresh: () => Promise<void>
}

function readCache(): PublicFlags | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { flags: PublicFlags; ts: number }
    if (Date.now() - parsed.ts > CACHE_TTL) return null
    return parsed.flags
  } catch { return null }
}

function writeCache(flags: PublicFlags) {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ flags, ts: Date.now() }))
  } catch { /* ignore quota errors */ }
}

export function useFlags(): UseFlagsResult {
  const [flags,   setFlags]   = useState<PublicFlags>(DEFAULT_FLAGS)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchFlags = async (force = false) => {
    if (!force) {
      const cached = readCache()
      if (cached) { setFlags(cached); setLoading(false); return }
    }

    setLoading(true)
    try {
      const res  = await fetch('/api/v1/config', { cache: 'no-store' })
      const data = await res.json() as { ok: boolean; flags: PublicFlags | null }
      if (data.ok && data.flags) {
        setFlags(data.flags)
        writeCache(data.flags)
        setError(null)
      }
    } catch (e) {
      setError(String(e))
      // Silently keep defaults on network error
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFlags() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    flags,
    loading,
    error,
    refresh: () => fetchFlags(true),
  }
}

/** Convenience: get a single flag synchronously from the cache (or default). */
export function getFlagCached<K extends keyof PublicFlags>(key: K): PublicFlags[K] {
  const cached = readCache()
  return cached ? cached[key] : DEFAULT_FLAGS[key]
}
