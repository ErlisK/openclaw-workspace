'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { JobTier, JobStatus } from '@/lib/types'
import { TIER_CONFIG } from '@/lib/types'
import { validateTransition, isJobExpired } from '@/lib/job-lifecycle'

// ─── Auth helpers ────────────────────────────────────────────

async function requireUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')
  return { supabase, user }
}

// ─── Error wrapper ────────────────────────────────────────────

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

// ─── Projects ─────────────────────────────────────────────────

export async function createProject(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await requireUser()

  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string | null)?.trim() || null
  const url = (formData.get('url') as string | null)?.trim() || null

  if (!name) return { ok: false, error: 'Project name is required' }

  const { data, error } = await supabase
    .from('projects')
    .insert({ owner_id: user.id, name, description, url })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard')
  return { ok: true, data: { id: data.id } }
}

export async function updateProject(
  projectId: string,
  formData: FormData
): Promise<ActionResult<void>> {
  const { supabase, user } = await requireUser()

  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string | null)?.trim() || null
  const url = (formData.get('url') as string | null)?.trim() || null

  if (!name) return { ok: false, error: 'Project name is required' }

  const { error } = await supabase
    .from('projects')
    .update({ name, description, url })
    .eq('id', projectId)
    .eq('owner_id', user.id)  // RLS enforces, but belt+suspenders

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard')
  return { ok: true, data: undefined }
}

export async function deleteProject(projectId: string): Promise<ActionResult<void>> {
  const { supabase, user } = await requireUser()

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('owner_id', user.id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard')
  return { ok: true, data: undefined }
}

// ─── Test Jobs ─────────────────────────────────────────────────

export async function createJob(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await requireUser()

  const title = (formData.get('title') as string)?.trim()
  const url = (formData.get('url') as string)?.trim()
  const tier = (formData.get('tier') as JobTier) ?? 'quick'
  const instructions = (formData.get('instructions') as string | null)?.trim() ?? ''
  const projectId = (formData.get('project_id') as string | null) || null

  if (!title) return { ok: false, error: 'Job title is required' }
  if (!url) return { ok: false, error: 'App URL is required' }
  if (!['quick', 'standard', 'deep'].includes(tier)) {
    return { ok: false, error: 'Invalid tier' }
  }

  const price_cents = TIER_CONFIG[tier].price_cents

  const { data, error } = await supabase
    .from('test_jobs')
    .insert({
      client_id: user.id,
      title,
      url,
      tier,
      price_cents,
      instructions,
      project_id: projectId,
      status: 'draft',
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard')
  return { ok: true, data: { id: data.id } }
}

export async function updateJob(
  jobId: string,
  formData: FormData
): Promise<ActionResult<void>> {
  const { supabase, user } = await requireUser()

  const updates: Record<string, unknown> = {}

  const title = (formData.get('title') as string | null)?.trim()
  const url = (formData.get('url') as string | null)?.trim()
  const tier = formData.get('tier') as JobTier | null
  const instructions = formData.get('instructions') as string | null
  const projectId = formData.get('project_id') as string | null

  if (title !== null) updates.title = title
  if (url !== null) updates.url = url
  if (tier !== null && ['quick', 'standard', 'deep'].includes(tier)) {
    updates.tier = tier
    updates.price_cents = TIER_CONFIG[tier].price_cents
  }
  if (instructions !== null) updates.instructions = instructions.trim()
  if (projectId !== null) updates.project_id = projectId || null

  if (Object.keys(updates).length === 0) return { ok: false, error: 'No fields to update' }

  const { error } = await supabase
    .from('test_jobs')
    .update(updates)
    .eq('id', jobId)
    .eq('client_id', user.id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard')
  revalidatePath(`/jobs/${jobId}`)
  return { ok: true, data: undefined }
}

export async function publishJob(jobId: string): Promise<ActionResult<void>> {
  const { supabase, user } = await requireUser()

  const { data: job, error: fetchError } = await supabase
    .from('test_jobs')
    .select('status, payment_status, published_at')
    .eq('id', jobId)
    .eq('client_id', user.id)
    .single()

  if (fetchError || !job) return { ok: false, error: 'Job not found' }

  const transition = validateTransition(job.status as JobStatus, 'published', { actorIsClient: true })
  if (!transition.ok) return transition

  const { error } = await supabase
    .from('test_jobs')
    .update({
      status: 'published' as JobStatus,
      published_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    })
    .eq('id', jobId)
    .eq('client_id', user.id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard')
  revalidatePath(`/jobs/${jobId}`)
  revalidatePath('/marketplace')
  return { ok: true, data: undefined }
}

export async function completeJob(jobId: string, assignmentId: string): Promise<ActionResult<void>> {
  const { supabase, user } = await requireUser()

  // Verify tester owns this assignment
  const { data: assignment } = await supabase
    .from('job_assignments')
    .select('job_id, status')
    .eq('id', assignmentId)
    .eq('tester_id', user.id)
    .single()

  if (!assignment) return { ok: false, error: 'Assignment not found' }
  if (assignment.job_id !== jobId) return { ok: false, error: 'Assignment does not match job' }
  if (assignment.status !== 'active') return { ok: false, error: 'Assignment is not active' }

  // Get current job status
  const { data: job } = await supabase
    .from('test_jobs')
    .select('status, published_at')
    .eq('id', jobId)
    .single()

  if (!job) return { ok: false, error: 'Job not found' }

  // Check if expired
  if (isJobExpired(job.published_at)) {
    await supabase.from('test_jobs').update({ status: 'expired' as JobStatus }).eq('id', jobId)
    return { ok: false, error: 'Job has expired' }
  }

  const transition = validateTransition(job.status as JobStatus, 'complete', { actorIsTester: true })
  if (!transition.ok) return transition

  // Complete the job and mark assignment as submitted
  const { error: jobError } = await supabase
    .from('test_jobs')
    .update({ status: 'complete' as JobStatus, completed_at: new Date().toISOString() })
    .eq('id', jobId)

  if (jobError) return { ok: false, error: jobError.message }

  await supabase
    .from('job_assignments')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', assignmentId)

  revalidatePath('/dashboard')
  revalidatePath(`/jobs/${jobId}`)
  revalidatePath('/marketplace')
  return { ok: true, data: undefined }
}

export async function cancelJob(jobId: string): Promise<ActionResult<void>> {
  const { supabase, user } = await requireUser()

  const { data: job } = await supabase
    .from('test_jobs')
    .select('status')
    .eq('id', jobId)
    .eq('client_id', user.id)
    .single()

  if (!job) return { ok: false, error: 'Job not found' }

  const transition = validateTransition(job.status as JobStatus, 'cancelled', { actorIsClient: true })
  if (!transition.ok) return transition

  const { error } = await supabase
    .from('test_jobs')
    .update({ status: 'cancelled' as JobStatus })
    .eq('id', jobId)
    .eq('client_id', user.id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard')
  revalidatePath(`/jobs/${jobId}`)
  return { ok: true, data: undefined }
}

export async function deleteJob(jobId: string): Promise<ActionResult<void>> {
  const { supabase, user } = await requireUser()

  const { data: job } = await supabase
    .from('test_jobs')
    .select('status')
    .eq('id', jobId)
    .eq('client_id', user.id)
    .single()

  if (!job) return { ok: false, error: 'Job not found' }
  if (job.status !== 'draft') {
    return { ok: false, error: 'Only draft jobs can be deleted' }
  }

  const { error } = await supabase
    .from('test_jobs')
    .delete()
    .eq('id', jobId)
    .eq('client_id', user.id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard')
  return { ok: true, data: undefined }
}

// ─── Tester actions ────────────────────────────────────────────

export async function acceptJob(jobId: string): Promise<ActionResult<{ assignmentId: string }>> {
  const { supabase, user } = await requireUser()

  // Verify job is published
  const { data: job } = await supabase
    .from('test_jobs')
    .select('status, client_id')
    .eq('id', jobId)
    .single()

  if (!job) return { ok: false, error: 'Job not found' }
  if (job.status !== 'published') return { ok: false, error: 'Job is not available' }
  if (job.client_id === user.id) return { ok: false, error: 'You cannot accept your own job' }

  // Check for existing assignment
  const { data: existing } = await supabase
    .from('job_assignments')
    .select('id, status')
    .eq('job_id', jobId)
    .eq('tester_id', user.id)
    .maybeSingle()

  if (existing) {
    return { ok: false, error: 'You already have an assignment for this job' }
  }

  const { data: assignment, error } = await supabase
    .from('job_assignments')
    .insert({ job_id: jobId, tester_id: user.id, status: 'active' })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }

  // Update job status to assigned
  await supabase
    .from('test_jobs')
    .update({ status: 'assigned' as JobStatus })
    .eq('id', jobId)

  revalidatePath('/marketplace')
  revalidatePath(`/marketplace/${jobId}`)
  return { ok: true, data: { assignmentId: assignment.id } }
}

// ─── Profile / user ────────────────────────────────────────────

export async function updateProfile(formData: FormData): Promise<ActionResult<void>> {
  const { supabase, user } = await requireUser()

  const display_name = (formData.get('display_name') as string)?.trim() || null
  const tester_bio = (formData.get('tester_bio') as string)?.trim() || null
  const is_tester = formData.get('is_tester') === 'true'

  const { error } = await supabase
    .from('users')
    .update({ display_name, tester_bio, is_tester })
    .eq('id', user.id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard')
  return { ok: true, data: undefined }
}
