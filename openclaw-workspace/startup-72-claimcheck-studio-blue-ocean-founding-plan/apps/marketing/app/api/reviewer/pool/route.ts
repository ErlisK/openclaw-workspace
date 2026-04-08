import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// GET: pool stats + list
export async function GET(req: NextRequest) {
  const db = sb()
  const { searchParams } = new URL(req.url)
  const tier = searchParams.get('tier')
  const status = searchParams.get('status') || 'active'
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

  let q = db.from('cc_reviewer_profiles')
    .select('id,name,email,tier,reputation_score,tasks_completed,acceptance_rate,avg_kappa,specializations,badges,status,onboarding_done,calibration_passed,total_earned_cents')
    .order('reputation_score', { ascending: false })
    .limit(limit)

  if (tier) q = q.eq('tier', tier)
  if (status !== 'all') q = q.eq('status', status)

  const { data: reviewers, error } = await q

  // Summary stats
  const { data: stats } = await db.from('cc_reviewer_profiles')
    .select('tier,status,acceptance_rate,dispute_rate:tasks_disputed,avg_kappa,tasks_completed')
    .not('status', 'eq', 'applicant')

  const active = stats?.filter(r => r.status === 'active') || []
  const byTier = { gold: 0, silver: 0, bronze: 0, applicant: 0 }
  stats?.forEach(r => { if (r.tier in byTier) (byTier as Record<string,number>)[r.tier]++ })

  const avgAcceptance = active.length > 0
    ? active.reduce((s, r) => s + (r.acceptance_rate || 0), 0) / active.length
    : 0
  const avgKappa = active.length > 0
    ? active.reduce((s, r) => s + (r.avg_kappa || 0), 0) / active.length
    : 0

  return NextResponse.json({
    summary: {
      total: stats?.length || 0,
      active: active.length,
      byTier,
      avgAcceptancePct: +(avgAcceptance * 100).toFixed(1),
      avgKappa: +avgKappa.toFixed(3),
      poolTarget: 100,
      poolMet: active.length >= 100,
    },
    reviewers: reviewers || [],
  })
}

// POST: register new reviewer
export async function POST(req: NextRequest) {
  const db = sb()
  const body = await req.json()
  const { email, name, institution, specializations, orcid } = body

  if (!email || !name) return NextResponse.json({ error: 'email and name required' }, { status: 400 })

  const { data, error } = await db.from('cc_reviewer_profiles').insert({
    email, name, institution, specializations, orcid,
    tier: 'applicant', status: 'applicant', onboarding_step: 0,
  }).select('id,email,name,tier').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
