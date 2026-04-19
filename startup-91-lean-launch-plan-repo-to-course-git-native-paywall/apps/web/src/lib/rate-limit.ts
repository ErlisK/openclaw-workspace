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

let _upstashLimiter: Map<string, unknown> | null = null;

async function getUpstashLimiter(): Promise<((identifier: string, opts: RateLimitOptions) => Promise<RateLimitResult>) | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const { Ratelimit } = await import('@upstash/ratelimit');
    const { Redis } = await import('@upstash/redis');

    const redis = new Redis({ url, token });

    return async (identifier: string, opts: RateLimitOptions): Promise<RateLimitResult> => {
      const key = `${identifier}:${opts.bucket ?? 'default'}`;
      const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(opts.limit, `${opts.windowMs}ms`),
        prefix: 'tr_rl',
      });
      const result = await limiter.limit(key);
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        resetMs: result.reset,
      };
    };
  } catch {
    return null;
  }
}

let _upstashFn: ((identifier: string, opts: RateLimitOptions) => Promise<RateLimitResult>) | null | undefined = undefined;

export async function rateLimitRequest(identifier: string, opts: RateLimitOptions): Promise<RateLimitResult> {
  if (_upstashFn === undefined) {
    _upstashFn = await getUpstashLimiter();
  }
  if (_upstashFn) {
    return _upstashFn(identifier, opts);
  }
  return inMemoryLimit(identifier, opts);
}

// Synchronous compat shim for middleware (in-memory only)
export function rateLimit(identifier: string, opts: RateLimitOptions): RateLimitResult {
  return inMemoryLimit(identifier, opts);
}

export function getClientIp(req: Request | { headers: Headers }): string {
  const h = req.headers;
  return (
    (h as Headers).get?.('x-real-ip') ??
    (h as Headers).get?.('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}
