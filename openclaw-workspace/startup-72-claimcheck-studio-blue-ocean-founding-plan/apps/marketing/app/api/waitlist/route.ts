export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { email, name, segment, priorAiToolsConcern, source, orgName, role, painPoint } = body

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  // Extract UTM params from referrer/headers
  const referer = request.headers.get('referer') || ''
  const url = new URL(referer.startsWith('http') ? referer : 'https://citebundle.com')
  const utm_source = url.searchParams.get('utm_source') || source || 'direct'
  const utm_medium = url.searchParams.get('utm_medium') || null
  const utm_campaign = url.searchParams.get('utm_campaign') || null

  const { data, error } = await supabaseAdmin
    .from('cc_waitlist')
    .insert({
      email: email.toLowerCase().trim(),
      name: name || null,
      org_name: orgName || null,
      role: role || null,
      segment: segment || 'other',
      pain_point: painPoint || null,
      prior_ai_tools_concern: priorAiToolsConcern || false,
      utm_source,
      utm_medium,
      utm_campaign,
    })
    .select('id, status')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ registered: true, id: data.id }, { status: 201 })
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('cc_waitlist')
    .select('id, email, name, segment, status, prior_ai_tools_concern, utm_source, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const total = data?.length || 0
  const compliance = data?.filter(r => r.prior_ai_tools_concern).length || 0
  const bySegment = data?.reduce((acc: Record<string, number>, r) => {
    acc[r.segment || 'other'] = (acc[r.segment || 'other'] || 0) + 1; return acc
  }, {}) || {}

  return NextResponse.json({
    total,
    complianceConcern: compliance,
    compliancePct: total > 0 ? ((compliance / total) * 100).toFixed(1) : '0.0',
    bySegment,
    leads: data,
  })
}
