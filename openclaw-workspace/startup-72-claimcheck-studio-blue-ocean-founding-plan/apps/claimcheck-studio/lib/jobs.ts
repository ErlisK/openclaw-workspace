/**
 * lib/jobs.ts — ClaimCheck job queue helpers
 *
 * Job types:
 *   extract_claims   — LLM claim extraction for a session
 *   search_evidence  — PubMed/CrossRef/Unpaywall evidence search
 *   generate_output  — content generation (tweet / linkedin / blog etc.)
 *   export_bundle    — CiteBundle ZIP generation + S3 upload
 *   compliance_check — regulatory phrasing compliance pass
 *
 * Status flow:
 *   queued → running → done | failed | cancelled
 *   failed jobs with attempts < max_attempts are retried with backoff
 */

import { getSupabaseAdmin } from './supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export type JobType =
  | 'extract_claims'
  | 'search_evidence'
  | 'generate_output'
  | 'export_bundle'
  | 'compliance_check'

export type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled'

export interface JobPayload {
  sessionId: string
  [key: string]: unknown
}

export interface Job {
  id: string
  sessionId: string
  jobType: JobType
  status: JobStatus
  priority: number
  payload: JobPayload
  result?: unknown
  error?: string
  attempts: number
  maxAttempts: number
  workerId?: string
  queuedAt: string
  startedAt?: string
  completedAt?: string
}

export interface EnqueueOptions {
  priority?: number          // 0 = highest, 10 = lowest; default 5
  maxAttempts?: number       // default 3
  delayMs?: number           // future: delay before becoming available
  orgId?: string
}

// ─── Enqueue ──────────────────────────────────────────────────────────────────

export async function enqueueJob(
  jobType: JobType,
  payload: JobPayload,
  opts: EnqueueOptions = {}
): Promise<Job> {
  const supabase = getSupabaseAdmin()
  const { priority = 5, maxAttempts = 3, orgId } = opts

  const { data, error } = await supabase
    .from('cc_jobs')
    .insert({
      org_id: orgId || null,
      session_id: payload.sessionId,
      job_type: jobType,
      status: 'queued',
      priority,
      payload,
      attempts: 0,
      max_attempts: maxAttempts,
      queued_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to enqueue ${jobType}: ${error.message}`)

  await emitTelemetry({
    eventType: 'job.enqueued',
    sessionId: payload.sessionId,
    metadata: { jobType, jobId: data.id, priority },
  })

  return dbRowToJob(data)
}

// ─── Claim next job (atomic) ──────────────────────────────────────────────────

export async function claimNextJob(
  workerId: string,
  jobTypes?: JobType[]
): Promise<Job | null> {
  const supabase = getSupabaseAdmin()

  // Use the stored procedure if available, otherwise manual CAS
  const { data, error } = await supabase.rpc('cc_claim_next_job', {
    p_worker_id: workerId,
    p_job_types: jobTypes || null,
  })

  if (error || !data) return null
  return dbRowToJob(data)
}

// ─── Complete / fail jobs ─────────────────────────────────────────────────────

export async function completeJob(
  jobId: string,
  result: unknown,
  sessionId?: string
): Promise<void> {
  const supabase = getSupabaseAdmin()
  await supabase
    .from('cc_jobs')
    .update({
      status: 'done',
      result,
      completed_at: new Date().toISOString(),
      worker_id: null,
    })
    .eq('id', jobId)

  if (sessionId) {
    await emitTelemetry({
      eventType: 'job.completed',
      sessionId,
      metadata: { jobId },
    })
  }
}

export async function failJob(
  jobId: string,
  errorMsg: string,
  attempts: number,
  maxAttempts: number,
  sessionId?: string
): Promise<void> {
  const supabase = getSupabaseAdmin()
  const isFinal = attempts >= maxAttempts
  await supabase
    .from('cc_jobs')
    .update({
      status: isFinal ? 'failed' : 'queued',
      error: errorMsg,
      attempts,
      worker_id: null,
      completed_at: isFinal ? new Date().toISOString() : null,
    })
    .eq('id', jobId)

  if (sessionId) {
    await emitTelemetry({
      eventType: isFinal ? 'job.failed' : 'job.retrying',
      sessionId,
      metadata: { jobId, error: errorMsg, attempts, maxAttempts },
    })
  }
}

// ─── Query helpers ─────────────────────────────────────────────────────────────

export async function getJob(jobId: string): Promise<Job | null> {
  const { data } = await getSupabaseAdmin()
    .from('cc_jobs')
    .select('*')
    .eq('id', jobId)
    .single()
  return data ? dbRowToJob(data) : null
}

export async function listSessionJobs(sessionId: string): Promise<Job[]> {
  const { data } = await getSupabaseAdmin()
    .from('cc_jobs')
    .select('*')
    .eq('session_id', sessionId)
    .order('queued_at', { ascending: false })
  return (data || []).map(dbRowToJob)
}

export async function getQueueStats(): Promise<{
  queued: number
  running: number
  done: number
  failed: number
  byType: Record<string, number>
}> {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('cc_jobs')
    .select('job_type, status')
    .gte('queued_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  const stats = { queued: 0, running: 0, done: 0, failed: 0, byType: {} as Record<string, number> }
  for (const row of data || []) {
    if (row.status === 'queued') stats.queued++
    else if (row.status === 'running') stats.running++
    else if (row.status === 'done') stats.done++
    else if (row.status === 'failed') stats.failed++
    stats.byType[row.job_type] = (stats.byType[row.job_type] || 0) + 1
  }
  return stats
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

export interface TelemetryEvent {
  eventType: string
  sessionId?: string
  userId?: string
  orgId?: string
  quantity?: number
  metadata?: Record<string, unknown>
}

export async function emitTelemetry(event: TelemetryEvent): Promise<void> {
  try {
    await getSupabaseAdmin().from('cc_usage_events').insert({
      session_id: event.sessionId || null,
      org_id: event.orgId || null,
      event_type: event.eventType,
      quantity: event.quantity || 1,
      metadata: event.metadata || {},
      billed: false,
    })
  } catch {
    // telemetry is non-fatal
  }
}

export async function recordApiMetric(metric: {
  endpoint: string
  method: string
  statusCode: number
  latencyMs: number
  sessionId?: string
  userId?: string
  properties?: Record<string, unknown>
}): Promise<void> {
  try {
    await getSupabaseAdmin().from('api_metrics').insert({
      endpoint: metric.endpoint,
      method: metric.method,
      status_code: metric.statusCode,
      latency_ms: metric.latencyMs,
      session_id: metric.sessionId || null,
      user_id: metric.userId || null,
      properties: metric.properties || {},
    })
  } catch {
    // non-fatal
  }
}

// ─── Row mapper ───────────────────────────────────────────────────────────────

function dbRowToJob(row: Record<string, unknown>): Job {
  return {
    id: row.id as string,
    sessionId: (row.session_id as string) || '',
    jobType: row.job_type as JobType,
    status: row.status as JobStatus,
    priority: (row.priority as number) || 5,
    payload: (row.payload as JobPayload) || {},
    result: row.result,
    error: row.error as string | undefined,
    attempts: (row.attempts as number) || 0,
    maxAttempts: (row.max_attempts as number) || 3,
    workerId: row.worker_id as string | undefined,
    queuedAt: row.queued_at as string,
    startedAt: row.started_at as string | undefined,
    completedAt: row.completed_at as string | undefined,
  }
}
