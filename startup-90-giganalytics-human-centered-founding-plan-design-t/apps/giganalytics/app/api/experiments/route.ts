import { NextRequest, NextResponse } from 'next/server'
import { captureServerEvent } from '@/lib/posthog/server'

/**
 * GET /api/experiments
 *
 * Returns experiment variant assignment for the current visitor.
 * - If ?v=1/2/3 is provided, uses that variant (manual override)
 * - Otherwise assigns a variant deterministically based on session_id (33/33/34 split)
 *
 * Fires a PostHog $feature_flag_called event so PostHog can build experiment funnels.
 *
 * Response:
 *   { variant: "1" | "2" | "3", name: string, assigned_by: "url_param" | "random", session_id }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const urlV = searchParams.get('v')
  const sessionId = searchParams.get('session_id') ?? `anon_${Date.now()}`

  let variant: string
  let assignedBy: 'url_param' | 'random'

  if (urlV && ['1', '2', '3'].includes(urlV)) {
    variant = urlV
    assignedBy = 'url_param'
  } else {
    // Deterministic assignment by session_id hash (33/33/34 split)
    let hash = 0
    for (const char of sessionId) {
      hash = (hash * 31 + char.charCodeAt(0)) & 0x7fffffff
    }
    variant = String((hash % 3) + 1)
    assignedBy = 'random'
  }

  const variantNames: Record<string, string> = {
    '1': 'roi_first',
    '2': 'time_saver',
    '3': 'pricing_lab',
  }

  // Fire PostHog experiment exposure event
  await captureServerEvent(`anon:${sessionId}`, '$feature_flag_called', {
    '$feature_flag': 'landing-variant',
    '$feature_flag_response': variant,
    variant,
    variant_name: variantNames[variant],
    assigned_by: assignedBy,
    session_id: sessionId,
  })

  // Also fire landing_variant_viewed for funnel reports
  await captureServerEvent(`anon:${sessionId}`, 'landing_variant_viewed', {
    variant,
    variant_name: variantNames[variant],
    assigned_by: assignedBy,
    path: '/',
    session_id: sessionId,
  })

  return NextResponse.json({
    variant,
    name: variantNames[variant],
    assigned_by: assignedBy,
    session_id: sessionId,
    experiment: 'landing-variant',
    variants: {
      '1': { name: 'roi_first', description: 'ROI-first positioning' },
      '2': { name: 'time_saver', description: 'Zero-friction time tracking' },
      '3': { name: 'pricing_lab', description: 'Pricing experiments focus' },
    },
  })
}
