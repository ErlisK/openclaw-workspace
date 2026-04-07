import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()
  const { respondent_id, respondent_role, org_id, score, verbatim, trigger_event, related_clip_id, related_verification_id } = body

  if (!respondent_role || !score) {
    return NextResponse.json({ error: 'respondent_role and score required' }, { status: 400 })
  }

  const table = score <= 10 && score >= 0 ? 'nps_responses' : null
  if (!table) return NextResponse.json({ error: 'Use /api/survey/csat for 1-5 scores' }, { status: 400 })

  const { data, error } = await supabase
    .from('nps_responses')
    .insert({ respondent_id, respondent_role, org_id, score, verbatim, trigger_event })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ response: data })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('nps_responses')
    .select('respondent_role, score, category, verbatim, trigger_event, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Compute NPS by role
  const byRole: Record<string, { promoters: number; passives: number; detractors: number; total: number; verbatims: string[] }> = {}
  for (const r of data || []) {
    if (!byRole[r.respondent_role]) byRole[r.respondent_role] = { promoters: 0, passives: 0, detractors: 0, total: 0, verbatims: [] }
    byRole[r.respondent_role].total++
    if (r.category === 'promoter') byRole[r.respondent_role].promoters++
    else if (r.category === 'passive') byRole[r.respondent_role].passives++
    else byRole[r.respondent_role].detractors++
    if (r.verbatim) byRole[r.respondent_role].verbatims.push(r.verbatim)
  }

  const nps: Record<string, { nps: number; n: number; promoters: number; detractors: number; verbatims: string[]; met: boolean; target: number }> = {}
  const targets: Record<string, number> = { employer: 30, mentor: 20, tradesperson: 30 }
  for (const [role, d] of Object.entries(byRole)) {
    const score = Math.round(((d.promoters - d.detractors) / d.total) * 100)
    nps[role] = { nps: score, n: d.total, promoters: d.promoters, detractors: d.detractors, verbatims: d.verbatims.slice(0, 3), met: score >= (targets[role] || 30), target: targets[role] || 30 }
  }

  return NextResponse.json({ nps, raw: data })
}
