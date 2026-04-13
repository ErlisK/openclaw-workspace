/**
 * lib/rate-limit.ts
 * In-process sliding-window rate limiter for Next.js API routes.
 * Uses a simple Map<key, timestamps[]> — resets on cold start (adequate for Vercel).
 *
 * Usage:
 *   const limited = await rateLimit(req, { limit: 10, window: 60 })
 *   if (limited) return limited  // returns a 429 NextResponse
 */
import { NextRequest, NextResponse } from 'next/server';

interface Store {
  timestamps: number[];
}

const store = new Map<string, Store>();

function getKey(req: NextRequest, prefix: string): string {
  // Prefer CF-Connecting-IP → X-Forwarded-For → fallback
  const ip =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  return `${prefix}:${ip}`;
}

/**
 * @param req        NextRequest
 * @param options.limit   max requests in window
 * @param options.window  window size in seconds
 * @param options.prefix  unique prefix per route (default 'global')
 * @returns NextResponse (429) if rate-limited, else null
 */
export function rateLimit(
  req: NextRequest,
  options: { limit: number; window: number; prefix?: string }
): NextResponse | null {
  const { limit, window: windowSecs, prefix = 'global' } = options;
  const key = getKey(req, prefix);
  const now = Date.now();
  const windowMs = windowSecs * 1000;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Evict expired timestamps
  entry.timestamps = entry.timestamps.filter(t => now - t < windowMs);

  if (entry.timestamps.length >= limit) {
    const retryAfter = Math.ceil((entry.timestamps[0] + windowMs - now) / 1000);
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.', retryAfter },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  entry.timestamps.push(now);
  return null;
}
