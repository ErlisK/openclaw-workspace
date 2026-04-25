import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// In-memory fallback store
const memoryStore = new Map<string, { count: number; resetAt: number }>()

type LimitResult = { success: boolean; limit: number; remaining: number; reset: number }
type LimiterFn = (id: string) => Promise<LimitResult>
export type RateLimiter = { limit: LimiterFn }

function inMemoryLimit(requests: number, windowSeconds: number): RateLimiter {
  return {
    limit: async (identifier: string): Promise<LimitResult> => {
      const now = Date.now()
      const entry = memoryStore.get(identifier)
      if (!entry || entry.resetAt < now) {
        memoryStore.set(identifier, { count: 1, resetAt: now + windowSeconds * 1000 })
        return { success: true, limit: requests, remaining: requests - 1, reset: Math.floor((now + windowSeconds * 1000) / 1000) }
      }
      entry.count++
      const success = entry.count <= requests
      return { success, limit: requests, remaining: Math.max(0, requests - entry.count), reset: Math.floor(entry.resetAt / 1000) }
    }
  }
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

export function createRatelimit(requests: number, windowSeconds: number): RateLimiter {
  const redis = getRedis()
  if (!redis) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[ratelimit] WARN: Upstash Redis not configured; using in-memory rate limiter. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for distributed rate limiting.')
    }
    return inMemoryLimit(requests, windowSeconds)
  }
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
  }) as unknown as RateLimiter
}

export async function checkRateLimit(
  limiter: RateLimiter | null,
  identifier: string
): Promise<{ limited: boolean; headers: Record<string, string> }> {
  if (!limiter) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[ratelimit] WARN: No rate limiter provided; allowing request.')
    }
    return { limited: false, headers: {} }
  }
  const { success, limit, remaining, reset } = await limiter.limit(identifier)
  return {
    limited: !success,
    headers: {
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(reset),
    },
  }
}
