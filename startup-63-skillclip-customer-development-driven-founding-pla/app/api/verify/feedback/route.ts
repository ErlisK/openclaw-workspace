import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  const {
    verification_id,
    employer_perceived_value,
    employer_value_notes,
    would_use_again,
    would_recommend,
    vs_traditional_interview,
    time_saved_hours,
    improvement_suggestions,
    employer_email,
    employer_company,
  } = body

  if (!verification_id || !employer_perceived_value) {
    return NextResponse.json({ error: 'verification_id and employer_perceived_value required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('live_verifications')
    .update({
      employer_perceived_value,
      employer_value_notes,
      metadata: {
        employer_email,
        employer_company,
        feedback: {
          would_use_again,
          would_recommend,
          vs_traditional_interview,
          time_saved_hours,
          improvement_suggestions,
          submitted_at: new Date().toISOString(),
        },
      },
    })
    .eq('id', verification_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, verification: data })
}

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('live_verifications')
    .select(`
      id, skill_to_demonstrate, status, scheduled_at, employer_perceived_value,
      employer_value_notes, price_charged, duration_minutes,
      metadata, code_standards,
      tradesperson:profiles!live_verifications_tradesperson_id_fkey(full_name, email),
      mentor:profiles!live_verifications_mentor_id_fkey(full_name),
      trade:trades(name, slug),
      region:regions(name, region_code)
    `)
    .order('scheduled_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
