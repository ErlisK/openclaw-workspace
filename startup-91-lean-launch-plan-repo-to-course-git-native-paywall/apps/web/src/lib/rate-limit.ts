/**
 * In-memory sliding-window rate limiter.
 *
 * Works per-instance on Vercel serverless (each function instance gets its own
 * counter). For production at scale, swap the Map for Upstash Redis.
 *
 * Usage:
 *   const result = rateLimit(ip, { limit: 10, windowMs: 60_000 });
 *   if (!result.success) return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
 */

interface Window {
  timestamps: number[];
}

// Keyed by `${identifier}:${bucket}` where bucket = route group
const store = new Map<string, Window>();

// Prune entries older than 5 minutes to avoid unbounded growth
let lastPrune = Date.now();
function maybePrune() {
  const now = Date.now();
  if (now - lastPrune < 5 * 60_000) return;
  lastPrune = now;
  const cutoff = now - 5 * 60_000;
  for (const [key, win] of store.entries()) {
    win.timestamps = win.timestamps.filter((t) => t > cutoff);
    if (win.timestamps.length === 0) store.delete(key);
  }
}

export interface RateLimitOptions {
  /** Max requests in the window */
  limit: number;
  /** Window duration in ms */
  windowMs: number;
  /** Optional sub-bucket key (e.g. route name) */
  bucket?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number; // epoch ms when the oldest request exits the window
}

export function rateLimit(
  identifier: string,
  opts: RateLimitOptions,
): RateLimitResult {
  maybePrune();

  const key = `${identifier}:${opts.bucket ?? 'default'}`;
  const now = Date.now();
  const cutoff = now - opts.windowMs;

  const win = store.get(key) ?? { timestamps: [] };
  // Remove expired entries
  win.timestamps = win.timestamps.filter((t) => t > cutoff);

  const count = win.timestamps.length;
  const success = count < opts.limit;

  if (success) {
    win.timestamps.push(now);
  }
  store.set(key, win);

  const resetMs = win.timestamps.length > 0
    ? win.timestamps[0] + opts.windowMs
    : now + opts.windowMs;

  return {
    success,
    limit: opts.limit,
    remaining: Math.max(0, opts.limit - win.timestamps.length),
    resetMs,
  };
}

/** Extract best-effort IP from Next.js request headers */
export function getClientIp(req: Request | { headers: Headers }): string {
  const h = req.headers;
  return (
    (h as Headers).get?.('x-real-ip') ??
    (h as Headers).get?.('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}
