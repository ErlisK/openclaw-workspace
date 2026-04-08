export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('cc_pilot_mous')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const mous = data || []
  const active = mous.filter(m => m.status === 'active' || m.status === 'signed')
  const mrr = active.reduce((s: number, m: Record<string,number>) => s + (m.monthly_value || 0), 0)
  return NextResponse.json({
    total: mous.length,
    active: active.length,
    mrr,
    arr: mrr * 12,
    byStatus: mous.reduce((acc: Record<string, number>, m) => {
      acc[m.status] = (acc[m.status] || 0) + 1; return acc
    }, {}),
    mous,
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('cc_pilot_mous')
    .insert({
      org_name: body.orgName,
      contact_name: body.contactName,
      contact_email: body.contactEmail,
      segment: body.segment || null,
      pilot_tier: body.pilotTier || 'team',
      monthly_value: parseInt(body.monthlyValue),
      duration_months: body.durationMonths || 3,
      start_date: body.startDate || null,
      status: body.status || 'draft',
      notes: body.notes || null,
    })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ created: true, id: data.id }, { status: 201 })
}
