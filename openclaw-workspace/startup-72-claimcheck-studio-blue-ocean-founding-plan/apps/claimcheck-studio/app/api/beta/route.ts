import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { emitTelemetry } from '@/lib/jobs'

/**
 * GET  /api/beta         — beta ops dashboard stats
 * POST /api/beta         — submit beta application (public intake)
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view') || 'summary'
  const supabase = getSupabaseAdmin()

  if (view === 'summary') {
    const [
      { data: userStats },
      { data: reviewerStats },
      { data: partnerStats },
      { data: slaStats },
      { data: disputeStats },
      { data: recentActivity },
    ] = await Promise.all([
      supabase.from('cc_beta_users').select('status, tier, weekly_sessions').order('created_at'),
      supabase.from('cc_reviewer_applications').select('status, specialty'),
      supabase.from('cc_design_partners').select('org_name, status, partnership_tier, weekly_usage_target'),
      supabase.from('cc_sla_events').select('sla_type, breached, completed_at').limit(100),
      supabase.from('cc_disputes').select('status, dispute_type').limit(50),
      supabase.from('cc_beta_users').select('name, org_name, status, activated_at').eq('status', 'active').order('activated_at', { ascending: false }).limit(10),
    ])

    const users = userStats || []
    const reviewers = reviewerStats || []

    return NextResponse.json({
      users: {
        total: users.length,
        active: users.filter(u => u.status === 'active').length,
        invited: users.filter(u => u.status === 'invited').length,
        waitlist: users.filter(u => u.status === 'waitlist').length,
        activeWeekly: users.filter(u => (u.weekly_sessions || 0) > 0).length,
        byTier: {
          team: users.filter(u => u.tier === 'team').length,
          partner: users.filter(u => u.tier === 'partner').length,
          reviewer: users.filter(u => u.tier === 'reviewer').length,
        },
      },
      reviewers: {
        total: reviewers.length,
        approved: reviewers.filter(r => r.status === 'approved').length,
        screening: reviewers.filter(r => r.status === 'screening').length,
        applied: reviewers.filter(r => r.status === 'applied').length,
        active: reviewers.filter(r => r.status === 'active').length,
        specialties: [...new Set(reviewers.filter(r => r.status === 'approved').map(r => r.specialty))],
      },
      partners: {
        total: (partnerStats || []).length,
        active: (partnerStats || []).filter(p => p.status === 'active').length,
        byTier: {
          anchor: (partnerStats || []).filter(p => p.partnership_tier === 'anchor').length,
          premium: (partnerStats || []).filter(p => p.partnership_tier === 'premium').length,
          standard: (partnerStats || []).filter(p => p.partnership_tier === 'standard').length,
        },
        list: partnerStats || [],
      },
      sla: {
        total: (slaStats || []).length,
        breached: (slaStats || []).filter(s => s.breached).length,
        completed: (slaStats || []).filter(s => s.completed_at).length,
        breachRate: (slaStats || []).length > 0
          ? ((slaStats || []).filter(s => s.breached).length / (slaStats || []).length).toFixed(2)
          : '0.00',
      },
      disputes: {
        total: (disputeStats || []).length,
        open: (disputeStats || []).filter(d => d.status === 'open').length,
        resolved: (disputeStats || []).filter(d => d.status === 'resolved').length,
      },
      recentActivity: recentActivity || [],
    })
  }

  if (view === 'users') {
    const { data, error } = await supabase
      .from('cc_beta_users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ users: data || [] })
  }

  if (view === 'reviewers') {
    const { data, error } = await supabase
      .from('cc_reviewer_applications')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ reviewers: data || [] })
  }

  if (view === 'partners') {
    const { data, error } = await supabase
      .from('cc_design_partners')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ partners: data || [] })
  }

  return NextResponse.json({ error: 'Unknown view' }, { status: 400 })
}

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    email: string
    name: string
    orgName?: string
    orgType?: string
    role?: string
    useCase?: string
    referralSource?: string
    type: 'beta_user' | 'reviewer' | 'design_partner'
    // Reviewer-specific
    specialty?: string
    orcidId?: string
    institution?: string
    yearsExperience?: number
    publicationCount?: number
    highestDegree?: string
    motivation?: string
    // Design partner-specific
    partnershipTier?: string
    weeklyUsageTarget?: number
  }

  const { email, name, type } = body
  if (!email || !name || !type) {
    return NextResponse.json({ error: 'email, name, and type required' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  if (type === 'beta_user') {
    const { data, error } = await supabase
      .from('cc_beta_users')
      .insert({
        email,
        name,
        org_name: body.orgName || null,
        org_type: body.orgType || 'other',
        role: body.role || null,
        use_case: body.useCase || null,
        referral_source: body.referralSource || null,
        status: 'waitlist',
        tier: 'team',
      })
      .select('id, invite_code, status')
      .single()

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await emitTelemetry({
      eventType: 'beta.user.applied',
      sessionId: data.id,
      metadata: { email, name, orgType: body.orgType, role: body.role },
    })

    return NextResponse.json({
      applied: true,
      inviteCode: data.invite_code,
      status: 'waitlist',
      message: 'Application received. You will receive an invite within 2-3 business days.',
    }, { status: 201 })
  }

  if (type === 'reviewer') {
    if (!body.specialty) return NextResponse.json({ error: 'specialty required for reviewer applications' }, { status: 400 })

    const { data, error } = await supabase
      .from('cc_reviewer_applications')
      .insert({
        email,
        name,
        orcid_id: body.orcidId || null,
        institution: body.institution || null,
        specialty: body.specialty,
        years_experience: body.yearsExperience || null,
        publication_count: body.publicationCount || null,
        highest_degree: body.highestDegree || null,
        motivation: body.motivation || null,
        referral_source: body.referralSource || null,
        availability_hrs_week: 5,
        status: 'applied',
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      applied: true,
      applicationId: data.id,
      message: 'Reviewer application received. We will review your qualifications and respond within 5 business days.',
    }, { status: 201 })
  }

  return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 })
}
