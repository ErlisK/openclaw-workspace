import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getRetentionSettings, applyRetentionPolicy } from '@/lib/privacy'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/cron/retention
 * Vercel Cron — runs daily at 02:00 UTC.
 * Applies each designer's retention policy to their data.
 * Also cleans up expired privacy request export URLs.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET ?? 'ptf-cron-dev'
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const svc = createServiceClient()
  const jobStart = Date.now()
  let usersProcessed = 0
  let totalRowsAnonymized = 0
  const errors: string[] = []

  // Find users with retention settings where cleanup is overdue
  const { data: settings } = await svc
    .from('data_retention_settings')
    .select('user_id, tester_pii_days, feedback_days, events_days, anonymize_not_delete, notify_before_cleanup, last_cleanup_at')
    .or(`last_cleanup_at.is.null,last_cleanup_at.lt.${new Date(Date.now() - 7 * 86400_000).toISOString()}`)
    .limit(100)

  for (const row of settings ?? []) {
    try {
      const result = await applyRetentionPolicy(row.user_id, {
        testerPiiDays:       row.tester_pii_days,
        feedbackDays:        row.feedback_days,
        eventsDays:          row.events_days,
        anonymizeNotDelete:  row.anonymize_not_delete,
        notifyBeforeCleanup: row.notify_before_cleanup,
        lastCleanupAt:       row.last_cleanup_at,
      })
      totalRowsAnonymized += result.rowsAnonymized
      usersProcessed++
    } catch (err) {
      errors.push(`user ${row.user_id}: ${err instanceof Error ? err.message : 'unknown'}`)
    }
  }

  // Clean up completed privacy requests older than 90 days
  await svc.from('privacy_requests')
    .delete()
    .eq('status', 'completed')
    .lt('completed_at', new Date(Date.now() - 90 * 86400_000).toISOString())

  // Log cron run
  await svc.from('cron_job_runs').insert({
    job_name:       'retention',
    status:         errors.length > 0 ? 'failed' : 'completed',
    rows_processed: totalRowsAnonymized,
    completed_at:   new Date().toISOString(),
    metadata: {
      usersProcessed,
      totalRowsAnonymized,
      errors,
      duration_ms: Date.now() - jobStart,
    },
  })

  return NextResponse.json({
    ok: true,
    usersProcessed,
    totalRowsAnonymized,
    errors,
    duration_ms: Date.now() - jobStart,
  })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
