import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { email, survey_submit_timeline, survey_has_plans } = await req.json()

  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const { error } = await supabase
    .from('leads')
    .update({
      survey_submit_timeline,
      survey_has_plans,
      survey_completed_at: new Date().toISOString(),
    })
    .eq('email', email)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ saved: true })
}
