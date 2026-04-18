import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { captureServerEvent } from '@/lib/posthog/server'
import { UTM_KEYS, type UTMParams } from '@/lib/utm'

/**
 * POST /api/utm
 *
 * Accepts UTM attribution data from the client (UTMTracker component).
 * Stores in Supabase utm_events table and fires a PostHog server event.
 * Returns 200 always — best-effort, never blocks the user flow.
 *
 * Body:
 *   session_id    string  required — anonymous session identifier
 *   utm_source    string  optional
 *   utm_medium    string  optional
 *   utm_campaign  string  optional
 *   utm_content   string  optional
 *   utm_term      string  optional
 *   landing_path  string  optional
 *   referrer      string  optional
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { session_id, landing_path, referrer, ...rest } = body

    if (!session_id) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 })
    }

    // Extract only valid UTM keys
    const utmParams: UTMParams = {}
    for (const key of UTM_KEYS) {
      if (rest[key]) utmParams[key] = String(rest[key]).slice(0, 200)
    }

    // Must have at least one UTM param
    const hasAny = Object.values(utmParams).some(Boolean)
    if (!hasAny) {
      return NextResponse.json({ ok: true, stored: false, reason: 'no_utm_params' })
    }

    // 1. Store in Supabase (service role bypasses RLS)
    try {
      const supabase = createServiceClient()
      await supabase.from('utm_events').insert({
        session_id: String(session_id).slice(0, 100),
        ...utmParams,
        landing_path: landing_path ? String(landing_path).slice(0, 500) : null,
        referrer: referrer ? String(referrer).slice(0, 500) : null,
      })
    } catch {
      // Non-fatal — PostHog capture still runs
    }

    // 2. Fire PostHog server event
    await captureServerEvent(`anon:${session_id}`, 'utm_attribution', {
      ...utmParams,
      landing_path: landing_path ?? null,
      referrer: referrer ?? null,
      session_id,
    })

    return NextResponse.json({ ok: true, stored: true, params: utmParams })
  } catch {
    // Never return a 5xx — UTM capture must never break the app
    return NextResponse.json({ ok: true, stored: false, reason: 'parse_error' })
  }
}

/**
 * GET /api/utm
 * Health check — confirms the route is wired up.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/utm',
    description: 'UTM attribution capture endpoint',
    methods: ['POST'],
    params: UTM_KEYS,
  })
}
