import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  const {
    tradesperson_id,
    trade_id,
    region_id,
    skill_to_demonstrate,
    code_standards,
    slot_id,
    employer_name,
    employer_email,
    employer_company,
    commissioned_by_type = 'employer',
    referral_source = 'verify_page',
  } = body

  if (!skill_to_demonstrate || !slot_id) {
    return NextResponse.json({ error: 'skill_to_demonstrate and slot_id required' }, { status: 400 })
  }

  // Get the slot details
  const { data: slot } = await supabase
    .from('mentor_availability')
    .select('id, mentor_id, slot_start, slot_end, is_booked')
    .eq('id', slot_id)
    .single()

  if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
  if (slot.is_booked) return NextResponse.json({ error: 'Slot already booked' }, { status: 409 })

  // Generate a challenge prompt based on skill
  const challenge = `Demonstrate: ${skill_to_demonstrate}. Show your full setup, technique, and any applicable code verification steps.`

  // Create verification booking
  const { data: verification, error } = await supabase
    .from('live_verifications')
    .insert({
      tradesperson_id: tradesperson_id || null,
      mentor_id: slot.mentor_id,
      trade_id: trade_id || null,
      region_id: region_id || null,
      scheduled_at: slot.slot_start,
      duration_minutes: 10,
      meeting_link: `https://meet.certclip.com/verify/live-${Date.now().toString(36)}`,
      skill_to_demonstrate,
      challenge_prompt: challenge,
      code_standards: code_standards || [],
      status: 'scheduled',
      commissioned_by_type,
      price_charged: 7500,
      referral_source,
      metadata: {
        employer_name,
        employer_email,
        employer_company,
        booked_at: new Date().toISOString(),
      },
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark slot as booked
  await supabase
    .from('mentor_availability')
    .update({ is_booked: true, booked_by: verification.id })
    .eq('id', slot_id)

  return NextResponse.json({ verification, slot })
}
