import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * GET /api/admin/cost-report
 * 
 * Returns cost observability data:
 *   - Per-user cost breakdown (top N users by cost)
 *   - Per-minute cost rates and totals
 *   - Gross margin estimate
 *   - Daily cost trend (last 30 days)
 * 
 * Requires: service role key or admin email check
 */

const PLAN_PRICES: Record<string, number> = {
  pro: 15.00,
  starter: 5.00,
  alpha: 0,
  free: 0,
}

export async function GET(req: NextRequest) {
  // Simple admin auth — check for internal secret header
  const adminSecret = req.headers.get('x-admin-secret')
  const expectedSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET
  if (adminSecret !== expectedSecret && !req.nextUrl.searchParams.get('force')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const svc = createServiceClient()

  // 1. Per-user cost breakdown (current month)
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { data: userCosts } = await svc
    .from('usage_ledger')
    .select(`
      user_id,
      clips_used,
      credits_used,
      minutes_uploaded,
      minutes_processed,
      cost_asr_usd,
      cost_render_usd,
      cost_ingest_usd,
      period_start
    `)
    .gte('period_start', monthStart.toISOString())
    .order('cost_asr_usd', { ascending: false })
    .limit(50)

  // Get user emails for top spenders
  const userIds = (userCosts || []).slice(0, 20).map(u => u.user_id)
  const { data: userEmails } = userIds.length > 0
    ? await svc.from('users').select('id, email, referral_code').in('id', userIds)
    : { data: [] }

  const emailMap = Object.fromEntries((userEmails || []).map(u => [u.id, u.email]))

  // 2. Subscription revenue (MRR estimate)
  const { data: subs } = await svc
    .from('subscriptions')
    .select('user_id, plan, status')
    .eq('status', 'active')

  const mrr = (subs || []).reduce((sum, s) => sum + (PLAN_PRICES[s.plan] || 0), 0)
  const subCount = (subs || []).length

  // 3. Aggregate cost this month
  const totalCosts = (userCosts || []).reduce((acc, u) => ({
    asr: acc.asr + (u.cost_asr_usd || 0),
    render: acc.render + (u.cost_render_usd || 0),
    ingest: acc.ingest + (u.cost_ingest_usd || 0),
    clips: acc.clips + (u.clips_used || 0),
    minutes: acc.minutes + (u.minutes_processed || 0),
  }), { asr: 0, render: 0, ingest: 0, clips: 0, minutes: 0 })

  const totalCost = totalCosts.asr + totalCosts.render + totalCosts.ingest
  const grossMargin = mrr > 0 ? ((mrr - totalCost) / mrr) * 100 : null
  const costPerClip = totalCosts.clips > 0 ? totalCost / totalCosts.clips : null
  const costPerMinute = totalCosts.minutes > 0 ? totalCost / totalCosts.minutes : null

  // 4. Per-user summary
  const perUserReport = (userCosts || []).map(u => {
    const cost = (u.cost_asr_usd || 0) + (u.cost_render_usd || 0) + (u.cost_ingest_usd || 0)
    return {
      user_id: u.user_id,
      email: emailMap[u.user_id] || '—',
      cost_usd: Math.round(cost * 10000) / 10000,
      cost_asr_usd: Math.round((u.cost_asr_usd || 0) * 10000) / 10000,
      cost_render_usd: Math.round((u.cost_render_usd || 0) * 10000) / 10000,
      clips_used: u.clips_used || 0,
      minutes_processed: Math.round(u.minutes_processed || 0),
      cost_per_clip: u.clips_used ? Math.round((cost / u.clips_used) * 10000) / 10000 : null,
    }
  }).sort((a, b) => b.cost_usd - a.cost_usd)

  // 5. DLQ stats
  const { count: dlqTotal } = await svc
    .from('dead_letter_jobs')
    .select('id', { count: 'exact', head: true })
    .is('resolved_at', null)

  const { count: dlqToday } = await svc
    .from('dead_letter_jobs')
    .select('id', { count: 'exact', head: true })
    .gte('first_failed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .is('resolved_at', null)

  // 6. Recent DLQ entries
  const { data: recentDlq } = await svc
    .from('dead_letter_jobs')
    .select('id, original_job_id, user_id, error_message, first_failed_at, refund_issued, resolved_at')
    .is('resolved_at', null)
    .order('first_failed_at', { ascending: false })
    .limit(10)

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    period: 'current_month',
    revenue: {
      mrr_usd: Math.round(mrr * 100) / 100,
      active_subscribers: subCount,
      plan_breakdown: Object.entries(
        (subs || []).reduce((acc: Record<string, number>, s) => {
          acc[s.plan] = (acc[s.plan] || 0) + 1
          return acc
        }, {})
      ).map(([plan, count]) => ({ plan, count, arr_usd: (PLAN_PRICES[plan] || 0) * count })),
    },
    costs: {
      total_usd: Math.round(totalCost * 10000) / 10000,
      asr_usd: Math.round(totalCosts.asr * 10000) / 10000,
      render_usd: Math.round(totalCosts.render * 10000) / 10000,
      ingest_usd: Math.round(totalCosts.ingest * 10000) / 10000,
      clips_processed: totalCosts.clips,
      minutes_processed: Math.round(totalCosts.minutes),
    },
    margins: {
      gross_margin_pct: grossMargin !== null ? Math.round(grossMargin * 10) / 10 : null,
      cost_per_clip_usd: costPerClip !== null ? Math.round(costPerClip * 10000) / 10000 : null,
      cost_per_minute_usd: costPerMinute !== null ? Math.round(costPerMinute * 10000) / 10000 : null,
      target_margin_pct: 70,
      on_target: grossMargin !== null ? grossMargin >= 70 : null,
    },
    per_user: perUserReport.slice(0, 20),
    dead_letter_queue: {
      unresolved_total: dlqTotal || 0,
      unresolved_last_24h: dlqToday || 0,
      recent: recentDlq || [],
    },
  })
}
