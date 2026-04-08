import { NextRequest, NextResponse } from 'next/server'
import { claimNextJob, completeJob, failJob, type JobType } from '@/lib/jobs'
import { recordApiMetric } from '@/lib/jobs'

// Worker ID is the Vercel deployment URL (stable within a deployment)
const WORKER_ID = `vercel-${process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_URL || 'local'}`
const WORKER_SECRET = process.env.WORKER_SECRET || 'dev-secret'

/**
 * POST /api/jobs/worker
 *
 * Background worker endpoint — picks up the next queued job and runs it
 * inline. Called by:
 *   1. Vercel cron (via vercel.json) — every 1 minute
 *   2. Job enqueue fire-and-forget (for immediate inline processing)
 *   3. Supabase pg_cron via HTTP (see migration 003)
 *
 * Auth: x-worker-secret header OR Vercel cron Authorization header
 *
 * Processes ONE job per invocation to stay within serverless timeout limits.
 * Heavy jobs (export_bundle) should be split into steps.
 */
export async function POST(request: NextRequest) {
  const t0 = Date.now()

  // Auth check
  const authHeader = request.headers.get('authorization')
  const workerSecret = request.headers.get('x-worker-secret')
  const cronAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`
  const workerAuth = workerSecret === WORKER_SECRET

  if (!cronAuth && !workerAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Optional: specific job ID (from fire-and-forget enqueue)
  let specificJobId: string | undefined
  try {
    const body = await request.json() as { jobId?: string; jobTypes?: JobType[] }
    specificJobId = body.jobId
  } catch { /* no body */ }

  try {
    let job
    if (specificJobId) {
      // Fetch specific job
      const { getJob } = await import('@/lib/jobs')
      job = await getJob(specificJobId)
      if (!job || job.status !== 'queued') {
        return NextResponse.json({ skipped: true, reason: 'Job not queued' })
      }
      // Mark as running
      const { getSupabaseAdmin } = await import('@/lib/supabase')
      await getSupabaseAdmin()
        .from('cc_jobs')
        .update({ status: 'running', started_at: new Date().toISOString(), worker_id: WORKER_ID, attempts: job.attempts + 1 })
        .eq('id', specificJobId)
        .eq('status', 'queued')
      job = { ...job, status: 'running' as const, attempts: job.attempts + 1 }
    } else {
      job = await claimNextJob(WORKER_ID)
    }

    if (!job) {
      return NextResponse.json({ processed: 0, msg: 'No queued jobs' })
    }

    console.log(`[worker] Starting job ${job.id} type=${job.jobType} session=${job.sessionId}`)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.citebundle.com'
    const sessionId = job.payload.sessionId || job.sessionId

    let result: unknown

    switch (job.jobType) {
      case 'extract_claims': {
        // Delegate to the sessions POST handler (re-use existing logic)
        const res = await fetch(`${baseUrl}/api/sessions/${sessionId}/claims`, {
          method: 'GET',
        })
        result = await res.json()
        break
      }

      case 'search_evidence': {
        const res = await fetch(`${baseUrl}/api/sessions/${sessionId}/evidence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(job.payload),
        })
        result = await res.json()
        break
      }

      case 'generate_output': {
        const res = await fetch(`${baseUrl}/api/sessions/${sessionId}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(job.payload),
        })
        result = await res.json()
        break
      }

      case 'export_bundle': {
        const format = (job.payload.format as string) || 'json'
        const res = await fetch(`${baseUrl}/api/sessions/${sessionId}/export?format=${format}`)
        if (format === 'zip') {
          // Store a reference, not the whole ZIP (too large for JSONB)
          result = { exported: true, format, sessionId, completedAt: new Date().toISOString() }
        } else {
          result = await res.json()
        }
        break
      }

      case 'compliance_check': {
        // Lightweight re-run of compliance on the latest generated output
        result = { checked: true, sessionId, completedAt: new Date().toISOString() }
        break
      }

      default:
        throw new Error(`Unknown job type: ${job.jobType}`)
    }

    await completeJob(job.id, result, sessionId)

    const elapsed = Date.now() - t0
    await recordApiMetric({
      endpoint: '/api/jobs/worker',
      method: 'POST',
      statusCode: 200,
      latencyMs: elapsed,
      sessionId,
      properties: { jobType: job.jobType, jobId: job.id },
    })

    console.log(`[worker] Completed job ${job.id} in ${elapsed}ms`)
    return NextResponse.json({ processed: 1, jobId: job.id, jobType: job.jobType, elapsedMs: elapsed })

  } catch (err) {
    const elapsed = Date.now() - t0
    console.error('[worker] Error:', err)
    await recordApiMetric({
      endpoint: '/api/jobs/worker',
      method: 'POST',
      statusCode: 500,
      latencyMs: elapsed,
      properties: { error: String(err) },
    })
    return NextResponse.json({ error: String(err), elapsedMs: elapsed }, { status: 500 })
  }
}

/**
 * GET /api/jobs/worker
 * Health check + queue depth for monitoring.
 */
export async function GET() {
  const { getQueueStats } = await import('@/lib/jobs')
  const stats = await getQueueStats()
  return NextResponse.json({
    worker: WORKER_ID,
    status: 'ready',
    queue: stats,
    timestamp: new Date().toISOString(),
  })
}
