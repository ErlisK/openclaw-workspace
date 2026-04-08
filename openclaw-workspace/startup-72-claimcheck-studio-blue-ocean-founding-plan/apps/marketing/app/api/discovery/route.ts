export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('cc_discovery_calls')
    .select('*')
    .order('call_date', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const calls = data || []
  return NextResponse.json({
    total: calls.length,
    byStage: calls.reduce((acc: Record<string, number>, c) => {
      acc[c.stage || 'scheduled'] = (acc[c.stage || 'scheduled'] || 0) + 1; return acc
    }, {}),
    converted: calls.filter(c => c.mou_signed).length,
    calls,
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('cc_discovery_calls')
    .insert({
      prospect_name: body.prospectName,
      prospect_email: body.prospectEmail || null,
      org: body.org || null,
      title: body.title || null,
      segment: body.segment || null,
      stage: body.stage || 'scheduled',
      call_date: body.callDate || null,
      duration_min: body.durationMin || null,
      notes: body.notes || null,
      next_steps: body.nextSteps || null,
      willingness_to_pay: body.willingnessToPay || null,
      mou_signed: body.mouSigned || false,
    })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ created: true, id: data.id }, { status: 201 })
}
