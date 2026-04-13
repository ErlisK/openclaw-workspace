import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { trackServer } from '@/lib/analytics'

// POST /api/cron/batch-render — Vercel Cron job (runs daily at 02:00 UTC)
// Processes the full-render queue: picks up jobs with render_mode=full or batch
// that have been approved but not yet rendered.

const CRON_SECRET = process.env.CRON_SECRET
const MAX_JOBS_PER_RUN = 10  // Safety cap per cron invocation
const MAX_MINUTES_PER_RUN = 60  // Total source-minutes to process per run (cost cap)

export async function POST(request: Request) {
  // Verify cron secret (Vercel sends this automatically when configured)
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const batchId = `batch-${Date.now()}`
  const startTime = Date.now()

  // Fetch queued full-render jobs ordered by priority + queue time
  const { data: jobs, error } = await supabase
    .from('v_batch_render_queue')
    .select('id, user_id, duration_min, title, storage_path, source_url, clips_requested, target_platforms, template_id, cost_estimate_usd')
    .limit(MAX_JOBS_PER_RUN)

  if (error) {
    console.error('[batch-render] Failed to fetch queue:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No jobs in render queue', batch_id: batchId })
  }

  const results: Array<{ job_id: string; status: 'started' | 'skipped' | 'error'; reason?: string }> = []
  let minutesThisRun = 0

  for (const job of jobs) {
    const durationMin = Number(job.duration_min) || 0

    // Cost/minutes cap per run
    if (minutesThisRun + durationMin > MAX_MINUTES_PER_RUN) {
      results.push({ job_id: job.id, status: 'skipped', reason: 'batch_minutes_cap_reached' })
      continue
    }

    // Mark job as started
    const { error: startErr } = await supabase
      .from('processing_jobs')
      .update({
        status: 'processing',
        full_render_started_at: new Date().toISOString(),
        worker_id: batchId,
        started_at: new Date().toISOString(),
      })
      .eq('id', job.id)
      .in('status', ['queued', 'preview_done'])

    if (startErr) {
      results.push({ job_id: job.id, status: 'error', reason: startErr.message })
      continue
    }

    // ── Simulate render dispatch ───────────────────────────────────────────────
    // In production this would:
    // 1. Call a render worker API (Modal, Render.com, custom worker)
    // 2. Pass the source URL/storage path + template config
    // 3. Get back rendered clip URLs
    //
    // For now: mark as simulated-complete with a placeholder export URL
    // Real integration: replace this block with actual render worker call
    const simulatedSuccess = await dispatchRenderJob(job)

    if (simulatedSuccess) {
      await supabase
        .from('processing_jobs')
        .update({
          status: 'done',
          full_render_done_at: new Date().toISOString(),
          done_at: new Date().toISOString(),
          batch_window: batchId,
        })
        .eq('id', job.id)

      minutesThisRun += durationMin
      results.push({ job_id: job.id, status: 'started' })

      // Track cost to ledger
      const costUsd = Number(job.cost_estimate_usd) || (durationMin * 0.014)
      await supabase.from('usage_ledger').upsert({
        user_id: job.user_id,
        period_start: new Date().toISOString().slice(0, 7) + '-01',
        minutes_processed: durationMin,
        render_cost_usd: costUsd,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,period_start' })

      trackServer(job.user_id, 'batch_render_complete', {
        job_id: job.id,
        batch_id: batchId,
        duration_min: durationMin,
        cost_usd: costUsd,
      })
    } else {
      await supabase
        .from('processing_jobs')
        .update({ status: 'error', error_msg: 'Render dispatch failed' })
        .eq('id', job.id)
      results.push({ job_id: job.id, status: 'error', reason: 'dispatch_failed' })
    }
  }

  const duration = Date.now() - startTime
  console.log(`[batch-render] ${batchId} done in ${duration}ms — processed ${results.filter(r => r.status === 'started').length}/${jobs.length} jobs`)

  return NextResponse.json({
    batch_id: batchId,
    processed: results.filter(r => r.status === 'started').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    errors: results.filter(r => r.status === 'error').length,
    minutes_processed: minutesThisRun,
    duration_ms: duration,
    results,
  })
}

// GET version for manual trigger / health check
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { count } = await supabase
    .from('v_batch_render_queue')
    .select('id', { count: 'exact', head: true })

  return NextResponse.json({
    queue_depth: count || 0,
    next_run: getNextBatchWindow(),
    max_jobs_per_run: MAX_JOBS_PER_RUN,
    max_minutes_per_run: MAX_MINUTES_PER_RUN,
  })
}

/**
 * Dispatch a render job to the render worker.
 * TODO: Replace with actual render API call (Modal, Replicate, custom worker).
 * Returns true if dispatched successfully.
 */
async function dispatchRenderJob(job: {
  id: string
  storage_path?: string | null
  source_url?: string | null
  clips_requested: number
  target_platforms: string[]
  template_id: string
}): Promise<boolean> {
  const renderWorkerUrl = process.env.RENDER_WORKER_URL
  if (!renderWorkerUrl) {
    // No worker configured: simulate success for demo/staging
    console.log(`[batch-render] No RENDER_WORKER_URL set — simulating render for job ${job.id}`)
    return true
  }

  try {
    const res = await fetch(`${renderWorkerUrl}/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RENDER_WORKER_SECRET || ''}`,
      },
      body: JSON.stringify({
        job_id: job.id,
        source_path: job.storage_path,
        source_url: job.source_url,
        clips_requested: job.clips_requested,
        target_platforms: job.target_platforms,
        template_id: job.template_id,
      }),
      signal: AbortSignal.timeout(30000),
    })
    return res.ok
  } catch (e) {
    console.error(`[batch-render] Dispatch error for job ${job.id}:`, e)
    return false
  }
}

function getNextBatchWindow(): string {
  const now = new Date()
  const next = new Date(now)
  next.setUTCHours(2, 0, 0, 0)
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString()
}
