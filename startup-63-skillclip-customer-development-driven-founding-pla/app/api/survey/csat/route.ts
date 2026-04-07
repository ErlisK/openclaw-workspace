import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()
  const { respondent_id, respondent_role, org_id, score, verbatim, trigger_event, related_clip_id, related_verification_id } = body

  if (!respondent_role || !score || score < 1 || score > 5) {
    return NextResponse.json({ error: 'respondent_role and score (1-5) required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('csat_responses')
    .insert({ respondent_id, respondent_role, org_id, score, verbatim, trigger_event, related_clip_id, related_verification_id })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ response: data })
}

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('csat_responses')
    .select('respondent_role, score, category, verbatim, trigger_event, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const byRole: Record<string, { scores: number[]; verbatims: string[] }> = {}
  for (const r of data || []) {
    if (!byRole[r.respondent_role]) byRole[r.respondent_role] = { scores: [], verbatims: [] }
    byRole[r.respondent_role].scores.push(r.score)
    if (r.verbatim) byRole[r.respondent_role].verbatims.push(r.verbatim)
  }

  const csat: Record<string, any> = {}
  const targets: Record<string, number> = { tradesperson: 4.0, mentor: 4.0, employer: 4.0 }
  for (const [role, d] of Object.entries(byRole)) {
    const avg = d.scores.reduce((a, b) => a + b, 0) / d.scores.length
    csat[role] = {
      avg: Math.round(avg * 100) / 100,
      n: d.scores.length,
      met: avg >= (targets[role] || 4.0),
      target: targets[role] || 4.0,
      verbatims: d.verbatims.slice(0, 3),
    }
  }

  return NextResponse.json({ csat, raw: data })
}
