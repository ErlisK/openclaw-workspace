/**
 * UTM parameter utilities.
 *
 * Handles:
 *  - Parsing UTM params from a URL search string
 *  - Persisting UTMs to sessionStorage (survives page navigation)
 *  - Retrieving persisted UTMs for attribution during signup
 */

export interface UTMParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
}

export const UTM_KEYS: (keyof UTMParams)[] = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
]

const SESSION_KEY = 'ga_utm_attribution'

/** Parse UTM params from a URLSearchParams object */
export function parseUTM(params: URLSearchParams): UTMParams {
  const result: UTMParams = {}
  for (const key of UTM_KEYS) {
    const val = params.get(key)
    if (val) result[key] = val
  }
  return result
}

/** True if any UTM param is present */
export function hasUTM(params: UTMParams): boolean {
  return UTM_KEYS.some(k => !!params[k])
}

/**
 * Persist UTMs to sessionStorage.
 * First-touch attribution: only writes if nothing is stored yet.
 */
export function persistUTM(params: UTMParams): void {
  if (typeof sessionStorage === 'undefined') return
  if (!hasUTM(params)) return
  // First-touch: don't overwrite existing attribution
  if (sessionStorage.getItem(SESSION_KEY)) return
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(params))
}

/** Retrieve persisted UTMs from sessionStorage */
export function getPersistedUTM(): UTMParams | null {
  if (typeof sessionStorage === 'undefined') return null
  const raw = sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

/** Clear persisted UTMs (call after signup completes attribution) */
export function clearPersistedUTM(): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(SESSION_KEY)
}

/** Generate a simple session ID for anonymous attribution */
export function getSessionId(): string {
  const key = 'ga_session_id'
  if (typeof sessionStorage === 'undefined') return 'ssr'
  let id = sessionStorage.getItem(key)
  if (!id) {
    id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    sessionStorage.setItem(key, id)
  }
  return id
}
