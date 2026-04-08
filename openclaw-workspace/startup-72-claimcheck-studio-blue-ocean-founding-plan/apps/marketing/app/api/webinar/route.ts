export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  const { email, name, orgName, segment, webinarId = 'launch-2025' } = await request.json()
  if (!email || !name) return NextResponse.json({ error: 'email and name required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('cc_webinar_registrants')
    .insert({ email: email.toLowerCase().trim(), name, org_name: orgName || null, segment: segment || null, webinar_id: webinarId })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Already registered' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Also add to waitlist
  await getSupabaseAdmin().from('cc_waitlist').insert({
    email: email.toLowerCase().trim(), name, org_name: orgName || null,
    segment: segment || 'other', utm_source: 'webinar',
  }).then(() => {}, () => {})

  return NextResponse.json({ registered: true, id: data.id }, { status: 201 })
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('cc_webinar_registrants')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ total: data?.length || 0, registrants: data })
}
