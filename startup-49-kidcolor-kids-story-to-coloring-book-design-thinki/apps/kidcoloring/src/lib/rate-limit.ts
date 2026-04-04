/**
 * src/lib/rate-limit.ts
 *
 * Sliding-window rate limiter backed by Supabase `rate_limit_windows`.
 *
 * Algorithm: 1-minute tumbling window, optimistic read-then-write.
 *   Not strictly atomic (no Redis), but acceptable for DDoS / abuse prevention.
 *   Fail-open: if the DB call fails, request is allowed.
 *
 * Limits (requests / minute per IP hash):
 *   session_create   20    generate    30    export_pdf    5
 *   free_pack        20    checkout    10    log_error   100
 *   default          60
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export type RateLimitKey =
  | 'session_create' | 'generate'   | 'export_pdf'
  | 'free_pack'      | 'log_error'  | 'checkout'
  | 'default'

const LIMITS: Record<RateLimitKey, number> = {
  session_create:  20,
  generate:        30,
  export_pdf:       5,
  free_pack:       20,
  log_error:      100,
  checkout:        10,
  default:         60,
}

export interface RateLimitResult {
  allowed:   boolean
  limit:     number
  remaining: number
  resetAt:   Date
}

// In-Lambda deny cache: keys that are already over-limit skip the DB round-trip
const _denyCache = new Map<string, number>()  // cacheKey -> expiry timestamp

let _admin: ReturnType<typeof createClient> | null = null
function admin() {
  if (!_admin) _admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  return _admin
}

function hashIp(ip: string): string {
  return crypto.createHash('sha256')
    .update(ip + (process.env.IP_HASH_SALT ?? 'kc-rl'))
    .digest('hex').slice(0, 16)
}

function epochMinute() { return Math.floor(Date.now() / 60_000) }

export async function checkRateLimit(
  ip: string,
  endpointKey: RateLimitKey = 'default'
): Promise<RateLimitResult> {
  const limit     = LIMITS[endpointKey]
  const minute    = epochMinute()
  const resetAt   = new Date((minute + 1) * 60_000)
  const ipHash    = hashIp(ip)
  const windowKey = String(minute)
  const key       = `${ipHash}:${endpointKey}`
  const cacheKey  = `${key}:${windowKey}`

  // Fast-path local deny
  const exp = _denyCache.get(cacheKey)
  if (exp && Date.now() < exp) {
    return { allowed: false, limit, remaining: 0, resetAt }
  }

  try {
    const sb = admin()

    // 1. Read current count (or 0 if no row yet)
    const { data: row } = await sb
      .from('rate_limit_windows')
      .select('count')
      .eq('key', key)
      .eq('window_key', windowKey)
      .maybeSingle()

    const currentCount = (row as { count?: number } | null)?.count ?? 0
    const newCount     = currentCount + 1

    if (currentCount >= limit) {
      // Already at/over limit — cache denial
      _denyCache.set(cacheKey, resetAt.getTime())
      return { allowed: false, limit, remaining: 0, resetAt }
    }

    // 2. Upsert the incremented count
    if (currentCount === 0) {
      // Insert new window row
      await sb.from('rate_limit_windows').insert({
        key, window_key: windowKey, count: 1,
      })
    } else {
      // Update existing row
      await sb.from('rate_limit_windows')
        .update({ count: newCount })
        .eq('key', key)
        .eq('window_key', windowKey)
    }

    const remaining = Math.max(0, limit - newCount)
    if (remaining === 0) _denyCache.set(cacheKey, resetAt.getTime())
    return { allowed: true, limit, remaining, resetAt }

  } catch (e) {
    // Fail open — never block on observability infrastructure failure
    if (process.env.NODE_ENV !== 'production') console.error('[rate-limit]', e)
    return { allowed: true, limit, remaining: limit, resetAt }
  }
}

/** Build a 429 JSON response with RFC-standard rate-limit headers */
export function rateLimit429(rl: RateLimitResult): Response {
  const retryAfter = Math.ceil((rl.resetAt.getTime() - Date.now()) / 1000)
  return new Response(
    JSON.stringify({
      error:      'rate_limit_exceeded',
      message:    `Too many requests. Limit: ${rl.limit}/min. Retry after ${retryAfter}s.`,
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type':          'application/json',
        'X-RateLimit-Limit':     String(rl.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset':     String(Math.ceil(rl.resetAt.getTime() / 1000)),
        'Retry-After':           String(retryAfter),
      },
    }
  )
}

/** Attach rate-limit headers to an existing Headers object */
export function addRateLimitHeaders(headers: Headers, rl: RateLimitResult): void {
  headers.set('X-RateLimit-Limit',     String(rl.limit))
  headers.set('X-RateLimit-Remaining', String(rl.remaining))
  headers.set('X-RateLimit-Reset',     String(Math.ceil(rl.resetAt.getTime() / 1000)))
}

/** Purge expired windows (call from maintenance route or cron) */
export async function purgeExpiredWindows(): Promise<number> {
  try {
    const cutoff = String(epochMinute() - 2)
    const { count } = await admin()
      .from('rate_limit_windows').delete({ count: true }).lt('window_key', cutoff)
    _denyCache.clear()
    return count ?? 0
  } catch { return 0 }
}
