import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  const { company_name, contact_name, email, phone, role, use_case, trades, regions, wtp_monthly, wtp_per_assessment, headcount, notes, terms_accepted } = body

  if (!company_name || !email || !contact_name) {
    return NextResponse.json({ error: 'company_name, email, and contact_name required' }, { status: 400 })
  }

  // Store LOI in the waitlist table (repurposing as lead capture) with detailed metadata
  const { data, error } = await supabase
    .from('waitlist')
    .insert({
      email,
      full_name: contact_name,
      company_name,
      role,
      referral_source: 'loi_form',
      metadata: {
        loi: true,
        phone,
        use_case,
        trades,
        regions,
        wtp_monthly,
        wtp_per_assessment,
        headcount,
        notes,
        terms_accepted,
        submitted_at: new Date().toISOString(),
      },
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, id: data.id })
}

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('waitlist')
    .select('*')
    .eq('referral_source', 'loi_form')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
