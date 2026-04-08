import { NextRequest, NextResponse } from 'next/server'
import {
  enqueueJob,
  listSessionJobs,
  getQueueStats,
  type JobType,
  type EnqueueOptions,
} from '@/lib/jobs'

/**
 * POST /api/jobs
 * Body: { jobType, sessionId, payload?, priority?, maxAttempts? }
 *
 * Enqueues a background job and returns the job record.
 * The caller can then poll GET /api/jobs/[id] for status.
 *
 * Inline execution: for extract_claims and search_evidence, a fire-and-forget
 * worker is triggered via /api/jobs/worker after enqueueing.
 */
export async function POST(request: NextRequest) {
  const t0 = Date.now()
  try {
    const body = await request.json() as {
      jobType: JobType
      sessionId: string
      payload?: Record<string, unknown>
      priority?: number
      maxAttempts?: number
    }

    const { jobType, sessionId, payload = {}, priority, maxAttempts } = body

    if (!jobType) return NextResponse.json({ error: 'jobType required' }, { status: 400 })
    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

    const VALID_JOB_TYPES: JobType[] = [
      'extract_claims', 'search_evidence', 'generate_output', 'export_bundle', 'compliance_check'
    ]
    if (!VALID_JOB_TYPES.includes(jobType)) {
      return NextResponse.json({ error: `Invalid jobType: ${jobType}` }, { status: 400 })
    }

    const opts: EnqueueOptions = {}
    if (priority !== undefined) opts.priority = priority
    if (maxAttempts !== undefined) opts.maxAttempts = maxAttempts

    const job = await enqueueJob(jobType, { sessionId, ...payload }, opts)

    // Fire-and-forget inline worker for lightweight job types
    // (in production this would be a Supabase Edge Function or cron trigger)
    const inlineTypes: JobType[] = ['extract_claims', 'search_evidence', 'generate_output']
    if (inlineTypes.includes(jobType)) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.citebundle.com'
      fetch(`${baseUrl}/api/jobs/worker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-worker-secret': process.env.WORKER_SECRET || 'dev-secret' },
        body: JSON.stringify({ jobId: job.id }),
      }).catch(() => { /* fire-and-forget */ })
    }

    return NextResponse.json(
      { job, enqueueMs: Date.now() - t0 },
      { status: 201 }
    )
  } catch (err) {
    console.error('POST /api/jobs error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

/**
 * GET /api/jobs?sessionId=xxx
 * Returns all jobs for a session (most recent first)
 *
 * GET /api/jobs?stats=1
 * Returns queue stats for the last 24h
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  const wantStats = searchParams.get('stats') === '1'

  if (wantStats) {
    const stats = await getQueueStats()
    return NextResponse.json({ stats })
  }

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId or stats=1 required' }, { status: 400 })
  }

  const jobs = await listSessionJobs(sessionId)
  return NextResponse.json({ jobs })
}
