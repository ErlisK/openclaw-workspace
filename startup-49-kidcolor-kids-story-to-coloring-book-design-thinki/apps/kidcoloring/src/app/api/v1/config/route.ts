/**
 * GET /api/v1/config
 *
 * Returns public (browser-safe) feature flags, resolved from:
 *   1. Supabase feature_flags table  (live, ≤ 60s propagation)
 *   2. Vercel environment variables  (requires redeploy)
 *   3. Hardcoded defaults
 *
 * Response is cache-controllable for 55s (matches server TTL).
 */
import { NextResponse } from 'next/server'
import { getPublicFlags } from '@/lib/flags'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const flags = await getPublicFlags()
    return NextResponse.json(
      { ok: true, flags, fetchedAt: new Date().toISOString() },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=55, s-maxage=55',
          'X-Flags-Source': 'supabase+env+defaults',
        },
      }
    )
  } catch (e) {
    // Return defaults on error — never crash the client
    return NextResponse.json(
      { ok: false, flags: null, error: String(e) },
      { status: 200 }
    )
  }
}
