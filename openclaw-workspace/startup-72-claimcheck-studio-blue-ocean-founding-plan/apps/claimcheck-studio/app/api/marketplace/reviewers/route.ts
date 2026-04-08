import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { emitTelemetry } from '@/lib/jobs'

/**
 * GET  /api/marketplace/reviewers          — leaderboard + stats
 * POST /api/marketplace/reviewers          — onboard reviewer
 * GET  /api/marketplace/reviewers?id=xxx   — reviewer profile + badges + kappa
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const reviewerId = searchParams.get('id')
  const supabase = getSupabaseAdmin()

  if (reviewerId) {
    // Single reviewer profile
    const [{ data: profile }, { data: badges }, { data: assignments }] = await Promise.all([
      supabase.from('cc_profiles').select('*').eq('id', reviewerId).single(),
      supabase.from('cc_reviewer_badges')
        .select('awarded_at, badge_id, cc_badges(slug,name,icon,tier,description)')
        .eq('reviewer_id', reviewerId)
        .order('awarded_at', { ascending: false }),
      supabase.from('cc_task_assignments')
        .select('id, status, verdict, reward_cents, submitted_at, time_spent_sec')
        .eq('reviewer_id', reviewerId)
        .order('assigned_at', { ascending: false })
        .limit(20),
    ])

    if (!profile) return NextResponse.json({ error: 'Reviewer not found' }, { status: 404 })

    // Compute rolling kappa from kappa_samples
    const { data: kappaSamples } = await supabase
      .from('cc_kappa_samples')
      .select('agree, kappa_pair')
      .or(`assignment_a.eq.${reviewerId},assignment_b.eq.${reviewerId}`)
      .limit(100)

    const sampleCount = kappaSamples?.length || 0
    const agreeCount = kappaSamples?.filter(s => s.agree).length || 0
    const rollingKappa = sampleCount > 0
      ? computeCohenKappa(agreeCount, sampleCount - agreeCount, 4)
      : null

    // SLA compliance
    const submitted = assignments?.filter(a => a.status === 'submitted') || []
    const avgTurnaround = submitted.length > 0
      ? Math.round(submitted.filter(a => a.time_spent_sec).reduce((sum, a) => sum + (a.time_spent_sec || 0), 0) / submitted.length / 60)
      : null

    return NextResponse.json({
      profile,
      badges: badges?.map(b => ({
        ...b.cc_badges,
        awardedAt: b.awarded_at,
      })) || [],
      recentAssignments: assignments || [],
      stats: {
        kappa: rollingKappa,
        kappaSamples: sampleCount,
        avgTurnaroundMin: avgTurnaround,
        totalEarned: profile.total_earned_cents || 0,
      },
    })
  }

  // Leaderboard
  const { data: reviewers } = await supabase
    .from('cc_profiles')
    .select('id, display_name, reviewer_tier, tasks_completed, kappa_score, total_earned_cents, reviewer_badges, is_active_reviewer, last_active_at')
    .eq('is_active_reviewer', true)
    .order('tasks_completed', { ascending: false })
    .limit(50)

  return NextResponse.json({ reviewers: reviewers || [] })
}

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    displayName: string
    email: string
    orcidId?: string
    institution?: string
    specialty?: string
    payoutEmail?: string
  }

  const { displayName, email, orcidId, institution, specialty, payoutEmail } = body
  if (!displayName || !email) {
    return NextResponse.json({ error: 'displayName and email required' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // Check if profile exists (by email)
  const { data: existing } = await supabase
    .from('cc_profiles')
    .select('id, is_active_reviewer')
    .eq('email', email)
    .single()

  if (existing?.is_active_reviewer) {
    return NextResponse.json({ error: 'Already registered as reviewer' }, { status: 409 })
  }

  let profileId: string

  if (existing) {
    // Activate existing profile
    await supabase.from('cc_profiles').update({
      display_name: displayName,
      orcid_id: orcidId || null,
      institution: institution || null,
      specialty: specialty || null,
      payout_email: payoutEmail || email,
      is_active_reviewer: true,
      reviewer_tier: 'trainee',
      onboarded_at: new Date().toISOString(),
    }).eq('id', existing.id)
    profileId = existing.id
  } else {
    // Create new profile
    const { data: created, error } = await supabase
      .from('cc_profiles')
      .insert({
        display_name: displayName,
        email,
        orcid_id: orcidId || null,
        institution: institution || null,
        specialty: specialty || null,
        payout_email: payoutEmail || email,
        is_active_reviewer: true,
        reviewer_tier: 'trainee',
        onboarded_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    profileId = created!.id
  }

  // Award ORCID badge if provided
  if (orcidId) {
    const { data: orcidBadge } = await supabase
      .from('cc_badges').select('id').eq('slug', 'verified_orcid').single()
    if (orcidBadge) {
      await supabase.from('cc_reviewer_badges').upsert({
        reviewer_id: profileId,
        badge_id: orcidBadge.id,
        evidence: { orcid_id: orcidId },
      }, { onConflict: 'reviewer_id,badge_id', ignoreDuplicates: true })
    }
  }

  await emitTelemetry({ eventType: 'marketplace.reviewer_onboarded', metadata: { reviewerId: profileId, hasOrcid: !!orcidId } })

  return NextResponse.json({ reviewerId: profileId, onboarded: true }, { status: 201 })
}

// Cohen's κ approximation from aggregate counts
function computeCohenKappa(agrees: number, disagrees: number, numCategories: number): number {
  const n = agrees + disagrees
  if (n === 0) return 0
  const po = agrees / n
  const pe = 1 / numCategories  // uniform chance agreement
  return (po - pe) / (1 - pe)
}
