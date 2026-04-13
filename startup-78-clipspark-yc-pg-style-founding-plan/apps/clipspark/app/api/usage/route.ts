import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Plan limits
const FREE_LIMITS = {
  clips_per_month: 5,
  minutes_per_month: 300,
  minutes_per_clip: 60,
}
const PRO_LIMITS = {
  clips_per_month: 40,
  minutes_per_month: 1200,
  minutes_per_clip: 120,
}

// Cost rates (USD per minute of source audio)
const COST_RATES = {
  asr_per_min: 0.006,      // Whisper-based ASR
  render_per_min: 0.010,   // Preview render
  full_render_per_min: 0.018, // Full HD render
  ingest_per_min: 0.001,   // Transfer/storage
}

// GET /api/usage — current period usage + plan info + cost breakdown
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const periodStart = new Date().toISOString().slice(0, 7) + '-01'

  const [
    { data: usage },
    { data: sub },
    { data: profile },
    { data: recentJobs },
    { data: creditTx },
  ] = await Promise.all([
    supabase.from('usage_ledger')
      .select('clips_used, credits_bal, credits_used, minutes_uploaded, minutes_processed, asr_seconds, render_seconds, ingest_seconds, cost_asr_usd, cost_render_usd, cost_ingest_usd, render_cost_usd')
      .eq('user_id', user.id)
      .eq('period_start', periodStart)
      .single(),
    supabase.from('subscriptions')
      .select('plan, status, clips_per_month, minutes_per_month, minutes_per_clip, current_period_end')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single(),
    supabase.from('users')
      .select('is_alpha, full_name, referral_code')
      .eq('id', user.id)
      .single(),
    // Last 10 jobs for per-job cost breakdown
    supabase.from('processing_jobs')
      .select('id, status, created_at, render_mode, cost_estimate_usd, asr_duration_sec, render_duration_sec, ingest_duration_sec, total_cost_usd, media_assets(title, duration_min)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('credit_transactions')
      .select('amount, reason, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const isAlpha = profile?.is_alpha || false
  const plan = sub?.plan || 'free'
  const isPro = plan === 'pro' || isAlpha

  const limits = isAlpha
    ? { clips_per_month: 9999, minutes_per_month: 9999, minutes_per_clip: 180 }
    : isPro
      ? {
          clips_per_month: sub?.clips_per_month || PRO_LIMITS.clips_per_month,
          minutes_per_month: sub?.minutes_per_month || PRO_LIMITS.minutes_per_month,
          minutes_per_clip: sub?.minutes_per_clip || PRO_LIMITS.minutes_per_clip,
        }
      : FREE_LIMITS

  const clipsUsed = usage?.clips_used ?? 0
  const creditsBalance = usage?.credits_bal ?? 0
  const minutesUploaded = usage?.minutes_uploaded ?? 0
  const minutesProcessed = usage?.minutes_processed ?? 0

  // Precise time accounting
  const asrSeconds = usage?.asr_seconds ?? 0
  const renderSeconds = usage?.render_seconds ?? 0
  const ingestSeconds = usage?.ingest_seconds ?? 0

  // Cost accounting
  const costAsr = usage?.cost_asr_usd ?? (asrSeconds / 60 * COST_RATES.asr_per_min)
  const costRender = usage?.cost_render_usd ?? usage?.render_cost_usd ?? (renderSeconds / 60 * COST_RATES.render_per_min)
  const costIngest = usage?.cost_ingest_usd ?? (ingestSeconds / 60 * COST_RATES.ingest_per_min)
  const totalCostUsd = Math.round((costAsr + costRender + costIngest) * 10000) / 10000

  // Remaining calculations
  const clipsRemaining = Math.max(0, limits.clips_per_month - clipsUsed + creditsBalance)
  const minutesRemaining = Math.max(0, limits.minutes_per_month - minutesUploaded)
  const percentClipsUsed = isAlpha ? 0 : Math.min(100, Math.round((clipsUsed / limits.clips_per_month) * 100))
  const percentMinutesUsed = isAlpha ? 0 : Math.min(100, Math.round((minutesUploaded / limits.minutes_per_month) * 100))

  // Estimate cost per minute for user-facing display
  const avgCostPerMin = minutesProcessed > 0
    ? Math.round((totalCostUsd / minutesProcessed) * 10000) / 10000
    : COST_RATES.asr_per_min + COST_RATES.render_per_min

  return NextResponse.json({
    plan,
    is_alpha: isAlpha,
    period_start: periodStart,
    period_end: sub?.current_period_end || null,

    // Clip usage
    clips: {
      used: clipsUsed,
      quota: isAlpha ? null : limits.clips_per_month,
      credits: creditsBalance,
      remaining: isAlpha ? null : clipsRemaining,
      pct_used: percentClipsUsed,
    },

    // Time usage (minutes)
    minutes: {
      uploaded: Math.round(minutesUploaded * 10) / 10,
      processed: Math.round(minutesProcessed * 10) / 10,
      quota: isAlpha ? null : limits.minutes_per_month,
      remaining: isAlpha ? null : Math.round(minutesRemaining * 10) / 10,
      per_clip_limit: limits.minutes_per_clip,
      pct_used: percentMinutesUsed,
    },

    // Precise time accounting (seconds)
    time_accounting: {
      asr_seconds: Math.round(asrSeconds),
      render_seconds: Math.round(renderSeconds),
      ingest_seconds: Math.round(ingestSeconds),
      total_seconds: Math.round(asrSeconds + renderSeconds + ingestSeconds),
    },

    // Cost breakdown
    costs: {
      asr_usd: Math.round(costAsr * 10000) / 10000,
      render_usd: Math.round(costRender * 10000) / 10000,
      ingest_usd: Math.round(costIngest * 10000) / 10000,
      total_usd: totalCostUsd,
      avg_per_min: avgCostPerMin,
      rates: COST_RATES,
    },

    // Credit pack options (for client-side CTA)
    credit_packs: [
      { clips: 10,  price_usd: 2.00, price_id: 'price_1TKNRMGt92XrRvUuNl0IOJbR', label: '10 clips — $2' },
      { clips: 25,  price_usd: 4.00, price_id: 'price_1TKPvwGt92XrRvUu2uyIpY7A', label: '25 clips — $4' },
      { clips: 50,  price_usd: 8.00, price_id: 'price_1TKNRMGt92XrRvUubXQJOHeK', label: '50 clips — $8' },
    ],

    // Recent jobs with time data
    recent_jobs: (recentJobs || []).map(j => ({
      id: j.id,
      status: j.status,
      render_mode: j.render_mode,
      created_at: j.created_at,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      title: (j as any).media_assets?.title,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      duration_min: (j as any).media_assets?.duration_min,
      asr_duration_sec: j.asr_duration_sec,
      render_duration_sec: j.render_duration_sec,
      cost_estimate_usd: j.cost_estimate_usd,
      total_cost_usd: j.total_cost_usd,
    })),

    // Recent credit transactions
    credit_history: (creditTx || []).map(t => ({
      amount: t.amount,
      reason: t.reason,
      created_at: t.created_at,
    })),
  })
}

// POST /api/usage/record — internal endpoint to record precise timing after a job step
// Body: { job_id, step: 'asr'|'render'|'ingest', duration_sec, user_id }
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { job_id, step, duration_sec } = await request.json()

  if (!job_id || !step || duration_sec === undefined) {
    return NextResponse.json({ error: 'job_id, step, and duration_sec required' }, { status: 400 })
  }

  const periodStart = new Date().toISOString().slice(0, 7) + '-01'

  // Calculate cost for this step
  const durationMin = duration_sec / 60
  const costByStep: Record<string, number> = {
    asr: durationMin * COST_RATES.asr_per_min,
    render: durationMin * COST_RATES.render_per_min,
    ingest: durationMin * COST_RATES.ingest_per_min,
  }
  const cost = costByStep[step] || 0

  // Update usage_ledger
  const { data: existing } = await supabase
    .from('usage_ledger')
    .select('id, asr_seconds, render_seconds, ingest_seconds, cost_asr_usd, cost_render_usd, cost_ingest_usd, minutes_processed')
    .eq('user_id', user.id)
    .eq('period_start', periodStart)
    .single()

  if (existing) {
    const updates: Record<string, number> = {}
    if (step === 'asr') {
      updates.asr_seconds = (existing.asr_seconds || 0) + duration_sec
      updates.cost_asr_usd = (existing.cost_asr_usd || 0) + cost
    } else if (step === 'render') {
      updates.render_seconds = (existing.render_seconds || 0) + duration_sec
      updates.cost_render_usd = (existing.cost_render_usd || 0) + cost
    } else if (step === 'ingest') {
      updates.ingest_seconds = (existing.ingest_seconds || 0) + duration_sec
      updates.cost_ingest_usd = (existing.cost_ingest_usd || 0) + cost
    }
    if (step !== 'ingest') {
      updates.minutes_processed = (existing.minutes_processed || 0) + durationMin
    }

    await supabase.from('usage_ledger').update(updates).eq('id', existing.id)
  }

  // Update processing_jobs timing
  if (job_id) {
    const jobUpdate: Record<string, unknown> = {}
    if (step === 'asr') {
      jobUpdate.asr_duration_sec = duration_sec
      jobUpdate.asr_done_at = new Date().toISOString()
    } else if (step === 'render') {
      jobUpdate.render_duration_sec = duration_sec
      jobUpdate.render_done_at = new Date().toISOString()
    } else if (step === 'ingest') {
      jobUpdate.ingest_duration_sec = duration_sec
    }
    await supabase.from('processing_jobs').update(jobUpdate).eq('id', job_id).eq('user_id', user.id)
  }

  return NextResponse.json({ recorded: true, step, duration_sec, cost_usd: cost })
}
