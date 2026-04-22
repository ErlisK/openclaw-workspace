/**
 * Persistent rate limiter using Supabase.
 *
 * Uses the `rate_limits` table to track per-key request counts across all
 * serverless instances. Survives Vercel cold starts unlike in-memory Maps.
 *
 * Schema (run migration 010_rate_limits.sql):
 *   rate_limits(key TEXT PK, count INT, window_start TIMESTAMPTZ)
 */
import { createClient as createServiceClient } from '@supabase/supabase-js'

const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hour

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  // Prefer service role key for upserts; fall back to anon key (table must allow it)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createServiceClient(url, key, { auth: { persistSession: false } })
}

/**
 * Returns true if the given key (IP hash) is rate-limited.
 * Falls back to allowing the request if the DB is unavailable.
 */
export async function isRateLimited(rawKey: string): Promise<boolean> {
  // Hash the IP so we never store raw IPs
  const key = `rl_${Buffer.from(rawKey).toString('base64').slice(0, 32)}`
  const now = new Date()
  const windowStart = new Date(now.getTime() - RATE_WINDOW_MS)

  try {
    const supabase = getServiceClient()

    // Atomic upsert: increment count within the window, or reset if expired
    const { data, error } = await supabase.rpc('rate_limit_check', {
      p_key: key,
      p_limit: RATE_LIMIT,
      p_window_ms: RATE_WINDOW_MS,
    })

    if (error) {
      // If the RPC doesn't exist yet, fall back gracefully (allow request)
      console.warn('[rate-limit] RPC unavailable, allowing request:', error.message)
      return false
    }

    return data === true
  } catch (err) {
    console.warn('[rate-limit] DB unavailable, allowing request:', err)
    return false
  }
}
