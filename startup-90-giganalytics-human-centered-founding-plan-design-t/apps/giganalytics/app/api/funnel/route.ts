import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { captureServerEvent } from '@/lib/posthog/server'

/**
 * POST /api/funnel
 *
 * Records an activation funnel step for the current user/session.
 * Steps are fired from the client and proxied here for server-side PostHog capture.
 *
 * The full activation funnel:
 *   1. landing_viewed        — user sees landing page (fired by UTMTracker / LandingHero)
 *   2. landing_cta_clicked   — user clicks "Get started" on landing
 *   3. signup_started        — user opens signup form
 *   4. signup_completed      — user created account (email confirmed)
 *   5. onboarding_started    — user sees onboarding checklist (first dashboard visit)
 *   6. import_started        — user navigates to /import
 *   7. import_completed      — user successfully imports ≥1 transaction
 *   8. roi_viewed            — user views ROI dashboard with real data
 *   9. timer_started         — user starts first timer session
 *  10. activation_complete   — import_completed + roi_viewed ✓ (the north-star metric)
 *
 * Body:
 *   step          string    required — funnel step name (see above)
 *   variant       string    optional — landing variant (1/2/3)
 *   session_id    string    optional — anonymous session ID
 *   properties    object    optional — extra event properties
 */

const VALID_STEPS = new Set([
  'landing_viewed',
  'landing_cta_clicked',
  'signup_started',
  'signup_completed',
  'onboarding_started',
  'import_started',
  'import_completed',
  'roi_viewed',
  'timer_started',
  'heatmap_viewed',
  'insights_viewed',
  'upgrade_clicked',
  'checkout_initiated',
  'activation_complete',
])

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { step, variant, session_id, properties = {} } = body

    if (!step || !VALID_STEPS.has(step)) {
      return NextResponse.json(
        { error: 'Invalid or missing step', valid_steps: [...VALID_STEPS] },
        { status: 400 }
      )
    }

    // Get user ID if authenticated
    let userId: string | null = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id ?? null
    } catch { /* unauthenticated is fine */ }

    const distinctId = userId ? `user:${userId}` : `anon:${session_id ?? 'unknown'}`

    await captureServerEvent(distinctId, step, {
      ...properties,
      variant: variant ?? null,
      session_id: session_id ?? null,
      user_id: userId,
      funnel: 'activation',
      funnel_step: [...VALID_STEPS].indexOf(step) + 1,
    })

    return NextResponse.json({ ok: true, step, recorded: true })
  } catch {
    return NextResponse.json({ ok: true, recorded: false, reason: 'parse_error' })
  }
}

/**
 * GET /api/funnel
 * Returns the funnel step definitions and their PostHog event names.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    experiment: 'landing-variant',
    funnel: 'activation',
    north_star: 'activation_complete',
    steps: [
      { n: 1, event: 'landing_viewed', label: 'Saw landing page' },
      { n: 2, event: 'landing_cta_clicked', label: 'Clicked CTA' },
      { n: 3, event: 'signup_started', label: 'Opened signup form' },
      { n: 4, event: 'signup_completed', label: 'Created account' },
      { n: 5, event: 'onboarding_started', label: 'Hit dashboard (first time)' },
      { n: 6, event: 'import_started', label: 'Navigated to /import' },
      { n: 7, event: 'import_completed', label: 'Imported ≥1 transaction ⭐ activation' },
      { n: 8, event: 'roi_viewed', label: 'Viewed ROI dashboard with data' },
      { n: 9, event: 'timer_started', label: 'Started first timer' },
      { n: 10, event: 'activation_complete', label: 'North-star: import + ROI viewed' },
    ],
    variants: {
      '1': 'roi_first',
      '2': 'time_saver',
      '3': 'pricing_lab',
    },
  })
}
