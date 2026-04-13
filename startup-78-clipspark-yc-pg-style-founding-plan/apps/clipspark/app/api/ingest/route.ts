import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { trackServer } from '@/lib/analytics'

const FREE_LIMITS = { clips_per_month: 5, minutes_per_month: 300, minutes_per_clip: 60 }
const PRO_LIMITS  = { clips_per_month: 10, minutes_per_month: 600, minutes_per_clip: 120 }

// Hard caps — non-negotiable regardless of plan
const HARD_CAPS = {
  // Upload file size limits
  free_max_file_mb: 500,
  pro_max_file_mb: 2048,
  // Free trial: max distinct uploads before paywall
  trial_max_uploads: 3,
  // Preview render: free users always get preview; full render requires approval or Pro
  trial_preview_only: true,
  // Concurrent queued jobs (prevents queue flooding)
  max_queued_jobs_free: 2,
  max_queued_jobs_pro: 5,
  // Upload throttle: min seconds between submissions for free users
  upload_throttle_sec_free: 30,
}

// POST /api/ingest — create asset + processing job with quota enforcement
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    source_type,
    source_url,
    file_name,
    file_size_bytes,
    mime_type,
    duration_sec,
    title,
    clips_requested = 3,
    target_platforms = ['YouTube Shorts'],
    template_id = 'podcast-pro-v02',
  } = body

  if (!source_type || !['upload', 'url_import'].includes(source_type)) {
    return NextResponse.json({ error: 'source_type must be upload or url_import' }, { status: 400 })
  }
  if (source_type === 'url_import' && !source_url) {
    return NextResponse.json({ error: 'source_url is required for url_import' }, { status: 400 })
  }

  // ── Quota check ─────────────────────────────────────────────────────────────
  const periodStart = new Date().toISOString().slice(0, 7) + '-01'

  const [{ data: usage }, { data: sub }, { data: userRow }] = await Promise.all([
    supabase.from('usage_ledger')
      .select('id, clips_used, credits_bal, minutes_uploaded')
      .eq('user_id', user.id)
      .eq('period_start', periodStart)
      .single(),
    supabase.from('subscriptions')
      .select('plan, clips_per_month, minutes_per_month, minutes_per_clip')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single(),
    supabase.from('users')
      .select('is_alpha, trial_uploads_count, free_trial_active, upload_size_limit_mb, created_at')
      .eq('id', user.id)
      .single(),
  ])

  const isAlpha = userRow?.is_alpha || false
  const plan = sub?.plan || 'free'
  const isPro = plan === 'pro' || isAlpha

  // ── Hard cap: file size ──────────────────────────────────────────────────────
  const maxFileMb = isPro ? HARD_CAPS.pro_max_file_mb : HARD_CAPS.free_max_file_mb
  if (file_size_bytes && file_size_bytes > maxFileMb * 1_048_576) {
    return NextResponse.json({
      error: `File too large. Maximum upload size is ${maxFileMb} MB${isPro ? '' : '. Upgrade to Pro for up to 2 GB'}.`,
      max_mb: maxFileMb,
      file_mb: Math.round(file_size_bytes / 1_048_576),
      upgrade_url: '/pricing',
    }, { status: 413 })
  }

  // ── Hard cap: free trial upload count ────────────────────────────────────────
  const trialUploads = userRow?.trial_uploads_count ?? 0
  const trialActive = userRow?.free_trial_active ?? true
  if (!isPro && trialActive && trialUploads >= HARD_CAPS.trial_max_uploads) {
    return NextResponse.json({
      error: `Free trial limit reached. You've used ${trialUploads} of ${HARD_CAPS.trial_max_uploads} trial uploads. Upgrade to continue.`,
      trial_uploads_used: trialUploads,
      trial_uploads_limit: HARD_CAPS.trial_max_uploads,
      upgrade_url: '/pricing',
    }, { status: 402 })
  }

  // ── Hard cap: concurrent queued jobs ─────────────────────────────────────────
  const { count: queuedCount } = await supabase
    .from('processing_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('status', ['queued', 'processing'])

  const maxQueued = isPro ? HARD_CAPS.max_queued_jobs_pro : HARD_CAPS.max_queued_jobs_free
  if ((queuedCount || 0) >= maxQueued) {
    return NextResponse.json({
      error: `You have ${queuedCount} job(s) in progress. Wait for them to finish before submitting another.`,
      queued_jobs: queuedCount,
      max_queued: maxQueued,
    }, { status: 429 })
  }

  // ── Upload throttle: min gap between free submissions ────────────────────────
  if (!isPro) {
    const { data: lastJob } = await supabase
      .from('processing_jobs')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (lastJob?.created_at) {
      const secSinceLast = (Date.now() - new Date(lastJob.created_at).getTime()) / 1000
      if (secSinceLast < HARD_CAPS.upload_throttle_sec_free) {
        const waitSec = Math.ceil(HARD_CAPS.upload_throttle_sec_free - secSinceLast)
        return NextResponse.json({
          error: `Please wait ${waitSec} seconds before submitting another upload.`,
          retry_after_sec: waitSec,
        }, { status: 429 })
      }
    }
  }

  const limits = isAlpha
    ? { clips_per_month: 9999, minutes_per_month: 9999, minutes_per_clip: 180 }
    : plan === 'pro'
      ? { clips_per_month: sub!.clips_per_month || PRO_LIMITS.clips_per_month, minutes_per_month: sub!.minutes_per_month || PRO_LIMITS.minutes_per_month, minutes_per_clip: sub!.minutes_per_clip || PRO_LIMITS.minutes_per_clip }
      : FREE_LIMITS

  const clipsUsed = usage?.clips_used ?? 0
  const creditsBalance = usage?.credits_bal ?? 0
  const minutesUploaded = usage?.minutes_uploaded ?? 0
  const durationMin = duration_sec ? Math.ceil(duration_sec / 60) : 0

  // Clip quota check (credits can cover overages)
  if (!isAlpha && clipsUsed >= limits.clips_per_month && creditsBalance < clips_requested) {
    return NextResponse.json({
      error: 'Clip quota exceeded. Upgrade your plan or purchase credits.',
      upgrade_url: '/pricing',
      quota: limits.clips_per_month, used: clipsUsed, credits: creditsBalance,
    }, { status: 402 })
  }

  // Per-clip minute limit
  if (!isAlpha && durationMin > 0 && durationMin > limits.minutes_per_clip) {
    return NextResponse.json({
      error: `File exceeds the ${limits.minutes_per_clip}-minute limit for your plan. Upgrade to Pro for up to 120 minutes.`,
      upgrade_url: '/pricing',
      limit_minutes: limits.minutes_per_clip, duration_minutes: durationMin,
    }, { status: 402 })
  }

  // Monthly minutes quota
  if (!isAlpha && durationMin > 0 && minutesUploaded + durationMin > limits.minutes_per_month) {
    const remaining = Math.max(0, limits.minutes_per_month - minutesUploaded)
    return NextResponse.json({
      error: `Monthly minutes quota exceeded. You have ${remaining} minutes remaining this month.`,
      upgrade_url: '/pricing',
      quota_minutes: limits.minutes_per_month, used_minutes: minutesUploaded, remaining_minutes: remaining,
    }, { status: 402 })
  }

  // ── Create asset ─────────────────────────────────────────────────────────────
  const { data: asset, error: assetErr } = await supabase
    .from('media_assets')
    .insert({
      user_id: user.id,
      title: title || (source_type === 'url_import' ? source_url : file_name) || 'Untitled',
      source_type,
      source_url: source_url || null,
      file_name: file_name || null,
      file_size_bytes: file_size_bytes || null,
      mime_type: mime_type || null,
      duration_sec: duration_sec || null,
      transcript_status: 'pending',
    })
    .select()
    .single()

  if (assetErr) return NextResponse.json({ error: assetErr.message }, { status: 500 })

  // ── Determine render mode ──────────────────────────────────────────────────
  // Free/trial users get preview-only; Pro users get full render immediately.
  // Full render for free users can only be unlocked via /api/jobs/[id]/approve-full-render
  const renderMode = isPro ? 'full' : 'preview'
  // Estimate cost: ~$0.004/min for transcription + ~$0.01/min for render
  const costEstimate = durationMin > 0 ? parseFloat(((durationMin * 0.004) + (renderMode === 'full' ? durationMin * 0.01 : 0)).toFixed(4)) : null

  // ── Create processing job ────────────────────────────────────────────────────
  const { data: job, error: jobErr } = await supabase
    .from('processing_jobs')
    .insert({
      user_id: user.id,
      asset_id: asset.id,
      status: 'queued',
      render_mode: renderMode,
      cost_estimate_usd: costEstimate,
      clips_requested,
      target_platforms,
      template_id,
    })
    .select()
    .single()

  if (jobErr) {
    await supabase.from('media_assets').delete().eq('id', asset.id)
    return NextResponse.json({ error: jobErr.message }, { status: 500 })
  }

  // ── Debit usage ledger ───────────────────────────────────────────────────────
  const upsertData = {
    user_id: user.id,
    period_start: periodStart,
    clips_used: clipsUsed + clips_requested,
    minutes_uploaded: minutesUploaded + durationMin,
    credits_used: 0,
    credits_bal: creditsBalance,
    minutes_processed: 0,
    updated_at: new Date().toISOString(),
  }

  // If over quota, debit from credits
  if (clipsUsed + clips_requested > limits.clips_per_month && !isAlpha) {
    const overBy = (clipsUsed + clips_requested) - limits.clips_per_month
    upsertData.credits_used = overBy
    upsertData.credits_bal = Math.max(0, creditsBalance - overBy)
  }

  if (usage?.id) {
    await supabase.from('usage_ledger').update({
      clips_used: upsertData.clips_used,
      minutes_uploaded: upsertData.minutes_uploaded,
      credits_bal: upsertData.credits_bal,
      credits_used: upsertData.credits_used,
      updated_at: upsertData.updated_at,
    }).eq('id', usage.id)
  } else {
    await supabase.from('usage_ledger').insert({
      user_id: upsertData.user_id,
      period_start: upsertData.period_start,
      clips_used: upsertData.clips_used,
      minutes_uploaded: upsertData.minutes_uploaded,
      credits_used: upsertData.credits_used,
      credits_bal: upsertData.credits_bal,
      minutes_processed: 0,
    })
  }

  // ── Signed upload URL (for direct uploads) ───────────────────────────────────
  let upload_url: string | null = null
  let upload_path: string | null = null
  if (source_type === 'upload') {
    const ext = file_name?.split('.').pop() || 'mp4'
    const path = `${user.id}/${asset.id}/${Date.now()}.${ext}`
    const { data: signed, error: signErr } = await supabase.storage
      .from('uploads')
      .createSignedUploadUrl(path)

    if (!signErr) {
      upload_url = signed.signedUrl
      upload_path = path
      await supabase.from('media_assets').update({ storage_path: path }).eq('id', asset.id)
    }
  }

  // Fire analytics event (non-blocking)
  trackServer(user.id, 'job_submitted', {
    source_type,
    clips_requested,
    target_platforms,
    template_id,
    duration_min: durationMin,
    plan,
    render_mode: renderMode,
    heuristic_version: 'v0.2',
  })

  // Track template usage for community metrics
  if (template_id) {
    supabase.from('templates').update({
      times_used: supabase.rpc('increment_times_used', { tmpl_id: template_id }) as unknown as number,
    }).eq('id', template_id).then(() => {})
  }

  // Increment trial upload counter for free users
  if (!isPro && trialActive) {
    supabase.from('users').update({
      trial_uploads_count: (trialUploads + 1),
    }).eq('id', user.id).then(() => {})
  }

  // Mark onboarding checklist step: upload_first
  supabase.from('onboarding_checklist').upsert(
    { user_id: user.id, step: 'upload_first', completed_at: new Date().toISOString() },
    { onConflict: 'user_id,step' }
  ).then(() => {})

  // Trigger referral activation if this is the user's first upload and they were referred
  if ((trialUploads + 1) === 1) {
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://clipspark-tau.vercel.app'}/api/referral/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    }).catch(() => {})
  }

  return NextResponse.json({
    asset_id: asset.id,
    job_id: job.id,
    status: job.status,
    render_mode: renderMode,
    // Tell client whether this is preview-only and how to get full render
    preview_only: renderMode === 'preview',
    full_render_upgrade_url: renderMode === 'preview' ? '/pricing' : null,
    trial_uploads_remaining: !isPro ? Math.max(0, HARD_CAPS.trial_max_uploads - (trialUploads + 1)) : null,
    upload_url,
    upload_path,
    // Return updated usage for client awareness
    usage: {
      clips_used: upsertData.clips_used,
      clips_quota: limits.clips_per_month,
      credits_balance: upsertData.credits_bal,
      minutes_uploaded: upsertData.minutes_uploaded,
      minutes_quota: limits.minutes_per_month,
    },
  }, { status: 201 })
}
