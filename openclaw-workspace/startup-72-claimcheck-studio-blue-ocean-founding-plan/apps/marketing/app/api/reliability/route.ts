import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const db = sb()
  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') || '30')
  const since = new Date(Date.now() - days * 86400000).toISOString()

  // Uptime calculation
  const { data: uptimeRows } = await db
    .from('cc_uptime_checks')
    .select('status,checked_at,latency_ms,service,error')
    .gte('checked_at', since)
    .order('checked_at', { ascending: false })
    .limit(500)

  const total = uptimeRows?.length || 0
  const upCount = uptimeRows?.filter(r => r.status === 'up').length || 0
  const downCount = uptimeRows?.filter(r => r.status === 'down').length || 0
  const degradedCount = uptimeRows?.filter(r => r.status === 'degraded').length || 0
  const uptimePct = total > 0 ? ((upCount / total) * 100).toFixed(3) : '100.000'
  const avgLatency = total > 0
    ? Math.round((uptimeRows?.reduce((s, r) => s + (r.latency_ms || 0), 0) || 0) / total)
    : 0

  // Recent checks for timeline
  const timeline = uptimeRows?.slice(0, 96).map(r => ({
    t: r.checked_at,
    status: r.status,
    ms: r.latency_ms,
  })) || []

  // SLA incidents
  const { data: incidents } = await db
    .from('cc_sla_incidents')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(20)

  const openIncidents = incidents?.filter(i => i.status !== 'resolved') || []
  const resolvedThisMonth = incidents?.filter(i =>
    i.status === 'resolved' && i.started_at >= since
  ) || []
  const avgTTR = resolvedThisMonth.length > 0
    ? Math.round(resolvedThisMonth.reduce((s, i) => s + (i.ttr_seconds || 0), 0) / resolvedThisMonth.length / 3600 * 10) / 10
    : 0

  // SLA events (task-level)
  const { data: slaEvents } = await db
    .from('cc_sla_events')
    .select('breached,sla_type,due_at,completed_at')
    .gte('created_at', since)
    .limit(200)

  const totalSLA = slaEvents?.length || 0
  const breachedSLA = slaEvents?.filter(e => e.breached).length || 0
  const slaBreachRate = totalSLA > 0 ? ((breachedSLA / totalSLA) * 100).toFixed(1) : '0.0'

  // Reviewer quality summary
  const { data: reviewerQuality } = await db
    .from('cc_reviewer_quality')
    .select('acceptance_rate,dispute_rate,avg_kappa,tier,reputation_score')
    .gte('period_start', since)
    .limit(100)

  const totalReviewers = reviewerQuality?.length || 0
  const avgAcceptance = totalReviewers > 0
    ? (reviewerQuality!.reduce((s, r) => s + (r.acceptance_rate || 0), 0) / totalReviewers * 100).toFixed(1)
    : '0.0'
  const avgDispute = totalReviewers > 0
    ? (reviewerQuality!.reduce((s, r) => s + (r.dispute_rate || 0), 0) / totalReviewers * 100).toFixed(1)
    : '0.0'
  const avgKappa = totalReviewers > 0
    ? (reviewerQuality!.reduce((s, r) => s + (r.avg_kappa || 0), 0) / totalReviewers).toFixed(3)
    : '0.000'

  const byTier = { gold: 0, silver: 0, bronze: 0 }
  reviewerQuality?.forEach(r => { if (r.tier in byTier) (byTier as Record<string,number>)[r.tier]++ })

  // Enterprise contracts
  const { data: contracts } = await db
    .from('cc_enterprise_contracts')
    .select('org_name,arr,mrr,status,sla_uptime_pct,sla_review_hours,security_review_passed,hecvat_submitted')
    .order('arr', { ascending: false })

  const activeContracts = contracts?.filter(c => c.status === 'active' || c.status === 'signed') || []
  const totalARR = activeContracts.reduce((s, c) => s + (c.arr || 0), 0)
  const totalMRR = activeContracts.reduce((s, c) => s + (c.mrr || 0), 0)

  // Recent audit events
  const { data: auditLog } = await db
    .from('cc_audit_log_v2')
    .select('event_type,entity,actor_type,created_at,event_data')
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({
    period: `Last ${days} days`,
    uptime: {
      pct: parseFloat(uptimePct),
      total,
      up: upCount,
      down: downCount,
      degraded: degradedCount,
      avgLatencyMs: avgLatency,
      targetPct: 99.5,
      timeline,
    },
    sla: {
      totalEvents: totalSLA,
      breached: breachedSLA,
      breachRate: parseFloat(slaBreachRate),
      openIncidents: openIncidents.length,
      incidents: incidents || [],
      avgTTRHours: avgTTR,
      ttrTargetHours: 8,
    },
    reviewers: {
      total: totalReviewers,
      poolTarget: 100,
      avgAcceptancePct: parseFloat(avgAcceptance),
      acceptanceTarget: 85,
      avgDisputePct: parseFloat(avgDispute),
      disputeTarget: 5,
      avgKappa: parseFloat(avgKappa),
      byTier,
    },
    contracts: {
      total: contracts?.length || 0,
      active: activeContracts.length,
      targetActive: 2,
      totalARR,
      totalMRR,
      list: contracts || [],
    },
    auditLog: auditLog || [],
  })
}
