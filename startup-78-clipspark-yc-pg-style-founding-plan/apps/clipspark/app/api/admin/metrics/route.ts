import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * GET /api/admin/metrics
 * 
 * Investor-grade metrics dashboard.
 * Requires ADMIN_SECRET header or query param.
 * 
 * Returns:
 *   - User growth (DAU, WAU, MAU, total)
 *   - Revenue (MRR, ARR, ARPU, conversion)
 *   - Product (clips created, exports, templates used)
 *   - Community (templates shared, tips sent, leaderboard health)
 *   - Viral coefficient (referrals + template attributions)
 *   - Engagement funnel
 *   - Top templates by usage
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret') || req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.ADMIN_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const svc = createServiceClient()
  const now = new Date()
  const day1 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // ── Parallel queries ────────────────────────────────────────────────────
  const [
    usersTotal,
    usersDay,
    usersWeek,
    usersMonth,
    clipsTotal,
    clipsWeek,
    exportsTotal,
    exportsWeek,
    templatesTotal,
    templatesCommunity,
    templatesTop,
    referralsTotal,
    referralsConverted,
    tipsTotal,
    subscriptions,
    publishLog,
  ] = await Promise.all([
    svc.from('users').select('id', { count: 'exact', head: true }),
    svc.from('users').select('id', { count: 'exact', head: true }).gte('created_at', day1),
    svc.from('users').select('id', { count: 'exact', head: true }).gte('created_at', day7),
    svc.from('users').select('id', { count: 'exact', head: true }).gte('created_at', day30),
    svc.from('clip_outputs').select('id', { count: 'exact', head: true }),
    svc.from('clip_outputs').select('id', { count: 'exact', head: true }).gte('created_at', day7),
    svc.from('clip_outputs').select('id', { count: 'exact', head: true }).eq('is_posted', true),
    svc.from('clip_outputs').select('id', { count: 'exact', head: true }).eq('is_posted', true).gte('updated_at', day7),
    svc.from('templates').select('id', { count: 'exact', head: true }).eq('is_public', true),
    svc.from('templates').select('id', { count: 'exact', head: true }).eq('is_public', true).eq('is_system', false),
    svc.from('templates').select('id,name,times_used,saves_count,tip_count,trending_score').eq('is_public', true).order('times_used', { ascending: false }).limit(10),
    svc.from('referrals').select('id', { count: 'exact', head: true }),
    svc.from('referrals').select('id', { count: 'exact', head: true }).eq('status', 'converted'),
    svc.from('template_tips').select('credits.sum()' as any).limit(1),
    svc.from('subscriptions').select('id,plan,status,amount,currency,current_period_start').eq('status', 'active'),
    svc.from('publish_log').select('platform,status', { count: 'exact' }).gte('created_at', day30).limit(500),
  ])

  // ── Revenue calculations ─────────────────────────────────────────────────
  const activeSubs = subscriptions.data || []
  const monthlyRevenue = activeSubs.reduce((sum, s) => {
    const amount = s.amount || 0
    return sum + (s.plan?.includes('annual') || s.plan?.includes('year') ? amount / 12 : amount)
  }, 0)
  const mrr = monthlyRevenue / 100  // cents to dollars
  const arr = mrr * 12
  const totalUsers = usersTotal.count || 0
  const arpu = totalUsers > 0 ? mrr / totalUsers : 0
  const conversionRate = totalUsers > 0 ? (activeSubs.length / totalUsers) * 100 : 0

  // ── Viral coefficient ────────────────────────────────────────────────────
  const referralConversions = referralsConverted.count || 0
  const totalReferrals = referralsTotal.count || 0
  const referralCoefficient = totalReferrals > 0 ? referralConversions / totalReferrals : 0

  // Template attributions as viral signal (how many new users came from template discovery)
  const templateAttributions = await svc
    .from('template_attributions')
    .select('id', { count: 'exact', head: true })
    .gte('attributed_at', day30)
  const attrCount = templateAttributions.count || 0
  const newUsers30d = usersMonth.count || 1
  const templateViralCoeff = attrCount / Math.max(newUsers30d, 1)
  const viralCoefficient = Math.min(referralCoefficient + templateViralCoeff, 1.0)

  // ── Publish breakdown ────────────────────────────────────────────────────
  const publishByPlatform: Record<string, number> = {}
  for (const p of publishLog.data || []) {
    publishByPlatform[p.platform] = (publishByPlatform[p.platform] || 0) + 1
  }

  // ── Engagement funnel ────────────────────────────────────────────────────
  const funnelSignedUp = usersMonth.count || 0
  const funnelCreatedClip = clipsWeek.count || 0
  const funnelExported = exportsWeek.count || 0
  const funnelPayingUsers = activeSubs.length

  // ── Template health ──────────────────────────────────────────────────────
  const topTemplates = (templatesTop.data || []).map((t, i) => ({
    rank: i + 1,
    id: t.id,
    name: t.name,
    uses: t.times_used,
    saves: t.saves_count,
    tips: t.tip_count,
    score: Math.round(t.trending_score || 0),
  }))

  const templatesOver100Uses = topTemplates.filter(t => t.uses >= 100).length

  // ── Tips ─────────────────────────────────────────────────────────────────
  let totalTipsCredits = 0
  if (tipsTotal.data?.[0]) {
    totalTipsCredits = (tipsTotal.data[0] as any).sum || 0
  }

  const metrics = {
    generated_at: now.toISOString(),

    users: {
      total: usersTotal.count || 0,
      new_24h: usersDay.count || 0,
      new_7d: usersWeek.count || 0,
      new_30d: usersMonth.count || 0,
      paying: activeSubs.length,
      conversion_rate_pct: Math.round(conversionRate * 10) / 10,
    },

    revenue: {
      mrr_usd: Math.round(mrr * 100) / 100,
      arr_usd: Math.round(arr * 100) / 100,
      arpu_usd: Math.round(arpu * 100) / 100,
      active_subscriptions: activeSubs.length,
    },

    product: {
      clips_total: clipsTotal.count || 0,
      clips_7d: clipsWeek.count || 0,
      exports_total: exportsTotal.count || 0,
      exports_7d: exportsWeek.count || 0,
      export_rate_pct: clipsTotal.count
        ? Math.round(((exportsTotal.count || 0) / clipsTotal.count) * 100)
        : 0,
      publish_by_platform_30d: publishByPlatform,
    },

    community: {
      templates_total: templatesTotal.count || 0,
      templates_community: templatesCommunity.count || 0,
      templates_over_100_uses: templatesOver100Uses,
      tips_total_credits: totalTipsCredits,
      top_templates: topTemplates,
    },

    growth: {
      viral_coefficient: Math.round(viralCoefficient * 100) / 100,
      viral_coefficient_target: 0.3,
      referrals_total: totalReferrals,
      referrals_converted: referralConversions,
      template_attributions_30d: attrCount,
    },

    funnel: {
      signed_up_30d: funnelSignedUp,
      created_clip_7d: funnelCreatedClip,
      exported_7d: funnelExported,
      paying_users: funnelPayingUsers,
    },

    targets: {
      paying_users: { current: activeSubs.length, target: 200, met: activeSubs.length >= 200 },
      wau_creators: { current: usersWeek.count || 0, target: 150, met: (usersWeek.count || 0) >= 150 },
      templates_100_uses: { current: templatesOver100Uses, target: 10, met: templatesOver100Uses >= 10 },
      viral_coefficient: { current: Math.round(viralCoefficient * 100) / 100, target: 0.3, met: viralCoefficient >= 0.3 },
    },
  }

  return NextResponse.json(metrics)
}
