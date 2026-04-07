import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getPartnerBySlug, logPartnerEvent } from '@/lib/partners'
import { createClient } from '@/lib/supabase-server'

/**
 * POST /api/partners/track
 * Lightweight attribution event tracking (public, no auth required for page_view).
 * Authenticated events (signup, session) also update partner denormalized stats.
 *
 * Body: {
 *   partnerSlug: string
 *   eventType: 'page_view' | 'signup' | 'signup_intent' | 'first_session' | 'paid_conversion'
 *   email?: string  (optional, only for signup_intent)
 * }
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { partnerSlug, eventType } = body

  if (!partnerSlug || !eventType) {
    return NextResponse.json({ error: 'partnerSlug and eventType required' }, { status: 400 })
  }

  const partner = await getPartnerBySlug(partnerSlug)
  if (!partner) return NextResponse.json({ error: 'Partner not found' }, { status: 404 })

  // Get user if authenticated
  let userId: string | null = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
  } catch {}

  await logPartnerEvent({
    partnerSlug: partner.slug,
    partnerId: partner.id,
    userId,
    eventType: eventType as Parameters<typeof logPartnerEvent>[0]['eventType'],
    metadata: {
      source: request.headers.get('referer') ?? null,
      ua_type: request.headers.get('user-agent')?.includes('Mobile') ? 'mobile' : 'desktop',
    },
  })

  return NextResponse.json({ ok: true }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    }
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}

/**
 * GET /api/partners/track?slug=bgdlab
 * Returns partner config + stats (for embed widgets on partner sites)
 */
export async function GET(request: NextRequest) {
  const slug = new URL(request.url).searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const partner = await getPartnerBySlug(slug)
  if (!partner) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    name: partner.name,
    accentColor: partner.accentColor,
    heroCta: partner.heroCta,
    trialDays: partner.flags.extended_trial_days ?? 14,
    bonusCredits: partner.flags.partner_credits ?? 0,
    stats: partner.stats,
  }, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'Access-Control-Allow-Origin': '*',
    }
  })
}
