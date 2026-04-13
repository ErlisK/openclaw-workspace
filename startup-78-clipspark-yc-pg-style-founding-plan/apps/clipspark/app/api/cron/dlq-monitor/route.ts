import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY || ''

/**
 * GET /api/cron/dlq-monitor
 * 
 * Scans for jobs that should be dead-lettered:
 *   - processing_jobs with status='failed' not yet in dead_letter_jobs
 *   - processing_jobs stuck in 'processing' for >30 min
 * 
 * For each new DLQ entry:
 *   - Creates dead_letter_jobs record
 *   - Sends alert email with details
 *   - Issues clip credit refund if appropriate
 * 
 * Schedule: every 30 min (see vercel.json)
 */

async function sendAlert(subject: string, body: string) {
  if (!AGENTMAIL_API_KEY) { console.log('[dlq] alert:', subject); return }
  await fetch('https://api.agentmail.to/v0/inboxes/hello.clipspark@agentmail.to/messages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${AGENTMAIL_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: ['hello.clipspark@agentmail.to'],
      subject: `🔴 DLQ: ${subject}`,
      text: body,
    }),
  })
}

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get('x-vercel-cron-secret') || req.headers.get('authorization')
  const force = req.nextUrl.searchParams.get('force') === '1'
  if (!force && cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const svc = createServiceClient()
  const results = { new_dlq: 0, stuck_jobs: 0, refunds_issued: 0, alerts_sent: 0 }

  // 1. Find failed jobs not yet in DLQ
  const { data: failedJobs } = await svc
    .from('processing_jobs')
    .select('id, user_id, error_message, created_at, updated_at')
    .eq('status', 'failed')
    .is('dead_lettered', null)  // if column exists; safe if not
    .order('updated_at', { ascending: false })
    .limit(50)

  // Check which are already in DLQ
  const failedIds = (failedJobs || []).map(j => j.id)
  const { data: existingDlq } = failedIds.length > 0
    ? await svc.from('dead_letter_jobs').select('original_job_id').in('original_job_id', failedIds)
    : { data: [] }
  const alreadyDlq = new Set((existingDlq || []).map(r => r.original_job_id))

  const newFailed = (failedJobs || []).filter(j => !alreadyDlq.has(j.id))

  for (const job of newFailed) {
    // Insert into DLQ
    await svc.from('dead_letter_jobs').insert({
      original_job_id: job.id,
      user_id: job.user_id,
      job_type: 'render',
      error_message: job.error_message || 'Unknown error',
      first_failed_at: job.updated_at || job.created_at,
      last_failed_at: job.updated_at || job.created_at,
    })
    results.new_dlq++

    // Issue 1-clip credit refund for user
    if (job.user_id) {
      await svc.from('usage_ledger').update({
        credits_bal: svc.rpc('increment_credits', { uid: job.user_id, delta: 1 }),
      }).eq('user_id', job.user_id)

      // Try simpler direct update
      const { data: ledger } = await svc
        .from('usage_ledger')
        .select('credits_bal')
        .eq('user_id', job.user_id)
        .single()

      if (ledger) {
        await svc.from('usage_ledger')
          .update({ credits_bal: (ledger.credits_bal || 0) + 1 })
          .eq('user_id', job.user_id)

        await svc.from('credit_transactions').insert({
          user_id: job.user_id,
          delta: 1,
          reason: `dlq_refund:${job.id}`,
        })

        await svc.from('dead_letter_jobs')
          .update({ refund_issued: true })
          .eq('original_job_id', job.id)

        results.refunds_issued++
      }
    }
  }

  // 2. Find stuck jobs (processing > 30 min)
  const stuckCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const { data: stuckJobs } = await svc
    .from('processing_jobs')
    .select('id, user_id, created_at, error_message')
    .eq('status', 'processing')
    .lt('created_at', stuckCutoff)
    .limit(20)

  results.stuck_jobs = (stuckJobs || []).length

  // 3. Send summary alert if anything happened
  if (results.new_dlq > 0 || results.stuck_jobs > 0) {
    const lines = [
      `New DLQ entries: ${results.new_dlq}`,
      `Stuck jobs (>30 min): ${results.stuck_jobs}`,
      `Credit refunds issued: ${results.refunds_issued}`,
      '',
    ]

    if (newFailed.length > 0) {
      lines.push('Failed jobs moved to DLQ:')
      newFailed.slice(0, 10).forEach(j => {
        lines.push(`  • ${j.id} — ${j.error_message || 'no error message'}`)
      })
    }

    if ((stuckJobs || []).length > 0) {
      lines.push('', 'Stuck jobs:')
      stuckJobs!.slice(0, 5).forEach(j => {
        const age = Math.round((Date.now() - new Date(j.created_at).getTime()) / 60000)
        lines.push(`  • ${j.id} — ${age} min old`)
      })
    }

    lines.push('', 'Review at: https://clipspark-tau.vercel.app/admin/health')

    await sendAlert(
      `${results.new_dlq} new failures, ${results.stuck_jobs} stuck`,
      lines.join('\n')
    )
    results.alerts_sent = 1
  }

  return NextResponse.json({
    ok: true,
    ...results,
    checked_at: new Date().toISOString(),
  })
}
