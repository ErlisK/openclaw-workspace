/**
 * lib/partners.ts — Partner config and feature flags
 *
 * Partners are stored in the `partners` DB table but also have a
 * static fallback config here for SSR performance (avoids DB round-trip
 * on every page view for the landing page).
 */
import { createServiceClient } from '@/lib/supabase-server'

export interface PartnerConfig {
  id: string
  slug: string
  name: string
  logoUrl: string | null
  websiteUrl: string | null
  accentColor: string
  heroHeadline: string
  heroSub: string
  heroCta: string
  flags: PartnerFlags
  utmSource: string | null
  utmCampaign: string | null
  status: 'active' | 'paused' | 'pending'
  pilotStartsAt: string | null
  pilotEndsAt: string | null
  stats: {
    clicks: number
    signups: number
    sessions: number
    paid: number
  }
}

export interface PartnerFlags {
  hide_pricing?: boolean
  show_partner_badge?: boolean
  extended_trial_days?: number
  partner_credits?: number          // bonus credits on signup (cents)
  ttrpg_mode?: boolean              // TTRPG-specific copy tweaks
  print_workflow?: boolean          // Print-on-demand workflow hints
  writing_mode?: boolean            // Writing-focused copy
  show_prototyper_tips?: boolean    // Prototype-stage tips
  [key: string]: unknown
}

/** Fetch a partner config by slug (server-side) */
export async function getPartnerBySlug(slug: string): Promise<PartnerConfig | null> {
  const svc = createServiceClient()
  const { data, error } = await svc
    .from('partners')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (error || !data) return null
  return mapPartner(data)
}

/** Fetch all active partners (for admin dashboard) */
export async function getAllPartners(): Promise<PartnerConfig[]> {
  const svc = createServiceClient()
  const { data } = await svc
    .from('partners')
    .select('*')
    .order('total_signups', { ascending: false })

  return (data ?? []).map(mapPartner)
}

/** Log a partner attribution event (fire-and-forget) */
export async function logPartnerEvent({
  partnerSlug,
  partnerId,
  userId,
  eventType,
  sessionId,
  valueCents,
  metadata,
}: {
  partnerSlug: string
  partnerId: string
  userId?: string | null
  eventType: 'page_view' | 'signup' | 'first_session' | 'paid_conversion' | 'referral_click'
  sessionId?: string | null
  valueCents?: number
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    const svc = createServiceClient()
    await svc.from('partner_events').insert({
      partner_id:   partnerId,
      partner_slug: partnerSlug,
      user_id:      userId ?? null,
      event_type:   eventType,
      session_id:   sessionId ?? null,
      value_cents:  valueCents ?? 0,
      metadata:     metadata ?? {},
    })

    // Update denormalized counter
    const counterField =
      eventType === 'page_view'       ? 'total_clicks'  :
      eventType === 'signup'          ? 'total_signups'  :
      eventType === 'first_session'   ? 'total_sessions' :
      eventType === 'paid_conversion' ? 'total_paid'     : null

    if (counterField) {
      const svc2 = createServiceClient()
      const { data: row } = await svc2
        .from('partners')
        .select(counterField)
        .eq('slug', partnerSlug)
        .single()
      if (row) {
        await svc2.from('partners').update({
          [counterField]: ((row as Record<string, number>)[counterField] ?? 0) + 1,
          updated_at: new Date().toISOString(),
        }).eq('slug', partnerSlug)
      }
    }
  } catch {
    // Non-critical — never throw from attribution
  }
}

/** Get partner stats with conversion funnel */
export async function getPartnerStats(slug: string) {
  const svc = createServiceClient()
  const { data: events } = await svc
    .from('partner_events')
    .select('event_type, created_at')
    .eq('partner_slug', slug)
    .order('created_at', { ascending: false })
    .limit(500)

  const rows = events ?? []
  const byType = rows.reduce<Record<string, number>>((acc, e) => {
    acc[e.event_type] = (acc[e.event_type] ?? 0) + 1
    return acc
  }, {})

  return {
    pageViews:       byType.page_view       ?? 0,
    signups:         byType.signup          ?? 0,
    firstSessions:   byType.first_session   ?? 0,
    paidConversions: byType.paid_conversion ?? 0,
    signupRate:      byType.page_view > 0
      ? ((byType.signup ?? 0) / byType.page_view * 100).toFixed(1) + '%'
      : '—',
    activationRate:  byType.signup > 0
      ? ((byType.first_session ?? 0) / byType.signup * 100).toFixed(1) + '%'
      : '—',
    conversionRate:  byType.signup > 0
      ? ((byType.paid_conversion ?? 0) / byType.signup * 100).toFixed(1) + '%'
      : '—',
  }
}

function mapPartner(row: Record<string, unknown>): PartnerConfig {
  return {
    id:            row.id as string,
    slug:          row.slug as string,
    name:          row.name as string,
    logoUrl:       row.logo_url as string | null,
    websiteUrl:    row.website_url as string | null,
    accentColor:   (row.accent_color as string) || '#ff6600',
    heroHeadline:  (row.hero_headline as string) || 'Run Better Playtests. Ship Better Games.',
    heroSub:       (row.hero_sub as string) || 'PlaytestFlow helps indie tabletop and RPG designers recruit, run, and analyze playtests with structured pipelines.',
    heroCta:       (row.hero_cta as string) || 'Start Free →',
    flags:         (row.feature_flags as PartnerFlags) || {},
    utmSource:     row.utm_source as string | null,
    utmCampaign:   row.utm_campaign as string | null,
    status:        (row.status as 'active' | 'paused' | 'pending'),
    pilotStartsAt: row.pilot_starts_at as string | null,
    pilotEndsAt:   row.pilot_ends_at as string | null,
    stats: {
      clicks:   (row.total_clicks  as number) || 0,
      signups:  (row.total_signups as number) || 0,
      sessions: (row.total_sessions as number) || 0,
      paid:     (row.total_paid    as number) || 0,
    },
  }
}
