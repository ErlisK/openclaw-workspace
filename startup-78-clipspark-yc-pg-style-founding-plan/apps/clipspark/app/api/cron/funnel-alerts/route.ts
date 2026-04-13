import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/cron/funnel-alerts
 * 
 * Polls PostHog for funnel drop-offs and failed jobs, then sends alerts
 * via AgentMail if thresholds are breached.
 * 
 * Vercel cron: daily at 09:00 UTC
 * Manual trigger: GET /api/cron/funnel-alerts?force=1
 */

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || ''
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID || ''
const POSTHOG_PERSONAL_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY || ''
const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY || ''
const ALERT_EMAIL = process.env.ALERT_EMAIL || 'hello.clipspark@agentmail.to'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// SLA thresholds
const THRESHOLDS = {
  signup_to_upload_pct: 40,      // ≥40% should upload after signup
  upload_to_preview_pct: 75,     // ≥75% of uploads should produce a preview
  preview_to_approve_pct: 50,    // ≥50% of previews should be approved
  job_failure_rate_pct: 10,      // ≤10% job failure rate
  p95_processing_min: 15,        // ≤15 min P95 processing time
}

async function queryPostHog(endpoint: string, body: Record<string, unknown>) {
  if (!POSTHOG_PROJECT_ID || !POSTHOG_PERSONAL_API_KEY) return null
  try {
    const res = await fetch(`${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${POSTHOG_PERSONAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

async function getEventCount(event: string, days = 7): Promise<number> {
  const data = await queryPostHog('/insights/trend/', {
    events: [{ id: event, type: 'events' }],
    date_from: `-${days}d`,
    display: 'ActionsLineGraph',
  })
  if (!data?.result?.[0]?.count) return 0
  return data.result[0].count
}

async function getJobMetrics(): Promise<{ total: number; failed: number; avgMinutes: number }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return { total: 0, failed: 0, avgMinutes: 0 }
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/processing_jobs?select=status,created_at,completed_at&created_at=gte.${since}`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    )
    if (!res.ok) return { total: 0, failed: 0, avgMinutes: 0 }
    const jobs = await res.json()
    const total = jobs.length
    const failed = jobs.filter((j: { status: string }) => j.status === 'failed').length
    const completed = jobs.filter((j: { status: string; completed_at?: string; created_at: string }) =>
      j.status === 'completed' && j.completed_at
    )
    const avgMs = completed.length > 0
      ? completed.reduce((s: number, j: { created_at: string; completed_at: string }) =>
          s + (new Date(j.completed_at).getTime() - new Date(j.created_at).getTime()), 0
        ) / completed.length
      : 0
    return { total, failed, avgMinutes: avgMs / 60000 }
  } catch {
    return { total: 0, failed: 0, avgMinutes: 0 }
  }
}

async function sendAlert(subject: string, body: string) {
  if (!AGENTMAIL_API_KEY) {
    console.log('[funnel-alerts] Would send alert:', subject)
    return
  }
  await fetch('https://api.agentmail.to/v0/inboxes/hello.clipspark@agentmail.to/messages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AGENTMAIL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: [ALERT_EMAIL],
      subject: `🚨 ClipSpark Alert: ${subject}`,
      text: body,
    }),
  })
}

export async function GET(req: NextRequest) {
  // Verify cron secret or force param
  const cronSecret = req.headers.get('x-vercel-cron-secret') || req.headers.get('authorization')
  const force = req.nextUrl.searchParams.get('force') === '1'
  if (!force && cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const alerts: string[] = []
  const metrics: Record<string, number | string> = {}

  // 1. Funnel drop-offs via PostHog events
  if (POSTHOG_PROJECT_ID && POSTHOG_PERSONAL_API_KEY) {
    const [signups, uploads, previews, approvals] = await Promise.all([
      getEventCount('signup', 7),
      getEventCount('upload_completed', 7),
      getEventCount('preview_watched', 7),
      getEventCount('clip_approved', 7),
    ])

    metrics.signups_7d = signups
    metrics.uploads_7d = uploads
    metrics.previews_7d = previews
    metrics.approvals_7d = approvals

    if (signups > 0) {
      const uploadPct = Math.round((uploads / signups) * 100)
      metrics.signup_to_upload_pct = uploadPct
      if (uploadPct < THRESHOLDS.signup_to_upload_pct) {
        alerts.push(`⬇️ Signup→Upload conversion: ${uploadPct}% (SLA: ≥${THRESHOLDS.signup_to_upload_pct}%)`)
      }
    }
    if (uploads > 0) {
      const previewPct = Math.round((previews / uploads) * 100)
      metrics.upload_to_preview_pct = previewPct
      if (previewPct < THRESHOLDS.upload_to_preview_pct) {
        alerts.push(`⬇️ Upload→Preview conversion: ${previewPct}% (SLA: ≥${THRESHOLDS.upload_to_preview_pct}%)`)
      }
    }
    if (previews > 0) {
      const approvePct = Math.round((approvals / previews) * 100)
      metrics.preview_to_approve_pct = approvePct
      if (approvePct < THRESHOLDS.preview_to_approve_pct) {
        alerts.push(`⬇️ Preview→Approve conversion: ${approvePct}% (SLA: ≥${THRESHOLDS.preview_to_approve_pct}%)`)
      }
    }
  } else {
    metrics.posthog = 'not configured'
  }

  // 2. Job failure rate from Supabase
  const jobMetrics = await getJobMetrics()
  metrics.jobs_7d = jobMetrics.total
  metrics.failed_jobs_7d = jobMetrics.failed
  metrics.avg_processing_min = Math.round(jobMetrics.avgMinutes * 10) / 10

  if (jobMetrics.total > 5) {
    const failPct = Math.round((jobMetrics.failed / jobMetrics.total) * 100)
    metrics.job_failure_pct = failPct
    if (failPct > THRESHOLDS.job_failure_rate_pct) {
      alerts.push(`💀 Job failure rate: ${failPct}% of ${jobMetrics.total} jobs (SLA: ≤${THRESHOLDS.job_failure_rate_pct}%)`)
    }
    if (jobMetrics.avgMinutes > THRESHOLDS.p95_processing_min) {
      alerts.push(`🐢 Avg processing time: ${jobMetrics.avgMinutes.toFixed(1)} min (SLA: ≤${THRESHOLDS.p95_processing_min} min)`)
    }
  }

  // 3. Send alert if any breaches
  if (alerts.length > 0) {
    const body = [
      'ClipSpark funnel alert — last 7 days',
      '',
      'ALERTS:',
      ...alerts.map(a => `  • ${a}`),
      '',
      'METRICS:',
      ...Object.entries(metrics).map(([k, v]) => `  ${k}: ${v}`),
      '',
      'SLA THRESHOLDS:',
      `  Signup→Upload ≥${THRESHOLDS.signup_to_upload_pct}%`,
      `  Upload→Preview ≥${THRESHOLDS.upload_to_preview_pct}%`,
      `  Preview→Approve ≥${THRESHOLDS.preview_to_approve_pct}%`,
      `  Job failure rate ≤${THRESHOLDS.job_failure_rate_pct}%`,
      `  Avg processing ≤${THRESHOLDS.p95_processing_min} min`,
      '',
      'Review at: https://clipspark-tau.vercel.app/dashboard',
    ].join('\n')

    await sendAlert(`${alerts.length} SLA breach${alerts.length > 1 ? 'es' : ''}`, body)
  }

  return NextResponse.json({
    ok: true,
    alerts_sent: alerts.length,
    alerts,
    metrics,
    thresholds: THRESHOLDS,
    checked_at: new Date().toISOString(),
  })
}
