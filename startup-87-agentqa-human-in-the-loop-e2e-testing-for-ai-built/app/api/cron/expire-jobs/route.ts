/**
 * GET /api/cron/expire-jobs
 * Called by Vercel Cron (every hour).
 * Finds jobs published > 72h ago that are still published/assigned,
 * marks them expired, releases credits, and sends email notifications.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { releaseCredits } from '@/lib/credits'
import { emailNotifications } from '@/lib/email/resend'
import { fireWebhook } from '@/lib/webhook'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Find expired jobs (published/assigned, expires_at in the past)
  const { data: expiredJobs, error } = await admin
    .from('test_jobs')
    .select('id, title, client_id, tier, status, webhook_url')
    .in('status', ['published', 'assigned'])
    .lt('expires_at', new Date().toISOString())
    .limit(100)

  if (error) {
    console.error('[cron/expire-jobs] DB error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!expiredJobs || expiredJobs.length === 0) {
    return NextResponse.json({ ok: true, expired: 0 })
  }

  type ExpiredJob = { id: string; title: string; client_id: string; tier: string; status: string; webhook_url: string | null }
  const jobIds = (expiredJobs as ExpiredJob[]).map(j => j.id)

  // Bulk update to expired
  const { error: updateError } = await admin
    .from('test_jobs')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .in('id', jobIds)
    .in('status', ['published', 'assigned'])

  if (updateError) {
    console.error('[cron/expire-jobs] Update error:', updateError.message)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Release credits and send emails for each
  const results: { id: string; ok: boolean; error?: string }[] = []

  for (const job of expiredJobs as ExpiredJob[]) {
    try {
      await releaseCredits(job.client_id, job.id, job.tier)

      // Get requester email
      const { data: requester } = await admin
        .from('users')
        .select('email')
        .eq('id', job.client_id)
        .single()

      if (requester?.email) {
        await emailNotifications.jobExpired(requester.email, job.title, job.id)
      }

      if (job.webhook_url) {
        await fireWebhook(job.webhook_url, {
          event: 'job.expired',
          job_id: job.id,
          status: 'expired',
          timestamp: new Date().toISOString(),
        })
      }

      results.push({ id: job.id, ok: true })
    } catch (e) {
      results.push({ id: job.id, ok: false, error: String(e) })
    }
  }

  console.log(`[cron/expire-jobs] Expired ${expiredJobs.length} jobs`, results)
  return NextResponse.json({ ok: true, expired: expiredJobs.length, results })
}
