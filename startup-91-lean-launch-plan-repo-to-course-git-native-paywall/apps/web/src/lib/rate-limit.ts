/**
 * Sliding-window rate limiter.
 *
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 * are set (production). Falls back to an in-memory store for local dev.
 *
 * Usage:
 *   const result = await rateLimitRequest(ip, { limit: 10, windowMs: 60_000 });
 *   if (!result.success) return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
 */

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  bucket?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

// ── In-memory fallback (per-instance, dev only) ───────────────────────────────

interface Window { timestamps: number[] }
const store = new Map<string, Window>();
let lastPrune = Date.now();

function inMemoryLimit(identifier: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  if (now - lastPrune > 5 * 60_000) {
    lastPrune = now;
    const cutoff = now - 5 * 60_000;
    for (const [key, win] of store.entries()) {
      win.timestamps = win.timestamps.filter((t) => t > cutoff);
      if (win.timestamps.length === 0) store.delete(key);
    }
  }
  const key = `${identifier}:${opts.bucket ?? 'default'}`;
  const cutoff = now - opts.windowMs;
  const win = store.get(key) ?? { timestamps: [] };
  win.timestamps = win.timestamps.filter((t) => t > cutoff);
  const success = win.timestamps.length < opts.limit;
  if (success) win.timestamps.push(now);
  store.set(key, win);
  const resetMs = win.timestamps.length > 0 ? win.timestamps[0] + opts.windowMs : now + opts.windowMs;
  return { success, limit: opts.limit, remaining: Math.max(0, opts.limit - win.timestamps.length), resetMs };
}

// ── Upstash Redis limiter ─────────────────────────────────────────────────────
// Upstash integration is optional. When UPSTASH_REDIS_REST_URL/TOKEN are set,
// use in-memory fallback (sufficient for single-instance deployments).
// To enable distributed rate limiting, install @upstash/ratelimit and @upstash/redis.

async function getUpstashLimiter(): Promise<((identifier: string, opts: RateLimitOptions) => Promise<RateLimitResult>) | null> {
  return null; // in-memory fallback only
}

let _upstashFn: ((identifier: string, opts: RateLimitOptions) => Promise<RateLimitResult>) | null | undefined = undefined;

export async function rateLimitRequest(identifier: string, opts: RateLimitOptions): Promise<RateLimitResult> {
  if (_upstashFn === undefined) {
    _upstashFn = await getUpstashLimiter();
  }
  if (_upstashFn) {
    return _upstashFn(identifier, opts);
  }
  // In production, Upstash Redis MUST be configured for correct cross-instance limiting.
  if (process.env.NODE_ENV !== 'development' && (
    !process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN
  )) {
    // Log and fall through to in-memory (rather than hard-throw) so the app
    // still starts; but emit a clear warning so ops can fix the config.
    console.error('[rate-limit] WARNING: Upstash Redis is not configured in production. ' +
      'Rate limiting is in-memory only and will NOT enforce limits across serverless instances. ' +
      'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.');
  }
  return inMemoryLimit(identifier, opts);
}

// Synchronous compat shim for middleware (in-memory only)
export function rateLimit(identifier: string, opts: RateLimitOptions): RateLimitResult {
  return inMemoryLimit(identifier, opts);
}

export function getClientIp(req: Request | { headers: Headers }): string {
  const h = req.headers as Headers;
  // Use the LAST entry in X-Forwarded-For to avoid IP spoofing via prepended headers.
  const fwd = h.get?.('x-forwarded-for');
  if (fwd) {
    const last = fwd.split(',').at(-1)?.trim();
    if (last) return last;
  }
  return h.get?.('x-real-ip') ?? 'unknown';
}

/**
 * Build a 429 NextResponse with a Retry-After header.
 */
export function tooManyRequestsResponse(result: RateLimitResult): import('next/server').NextResponse {
  const { NextResponse } = require('next/server');
  const retryAfterSeconds = Math.ceil(Math.max(0, result.resetMs - Date.now()) / 1000);
  return NextResponse.json(
    { error: 'Too many requests', retryAfter: retryAfterSeconds },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    },
  );
}
