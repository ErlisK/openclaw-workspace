export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { email, name, orgName, segment, useCase, teamSize, monthlyContentPieces, budgetRange } = body
  if (!email || !name) return NextResponse.json({ error: 'email and name required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('cc_pilot_applications')
    .insert({
      email: email.toLowerCase().trim(), name,
      org_name: orgName || null, segment: segment || 'other',
      use_case: useCase || null, team_size: teamSize || null,
      monthly_content_pieces: monthlyContentPieces ? parseInt(monthlyContentPieces) : null,
      budget_range: budgetRange || null,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Already applied' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ applied: true, id: data.id }, { status: 201 })
}
