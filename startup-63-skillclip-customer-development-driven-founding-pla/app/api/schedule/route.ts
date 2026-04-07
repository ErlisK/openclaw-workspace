import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

/**
 * GET  /api/schedule?date=YYYY-MM-DD&trade_id=...&region_id=...
 *   Returns available mentor slots for a given date (grouped by mentor).
 *
 * GET  /api/schedule?verification_id=...
 *   Returns a single live_verification with related schedule record.
 *
 * GET  /api/schedule?mentor_id=...
 *   Returns upcoming scheduled verifications for a mentor.
 *
 * POST /api/schedule
 *   Book a slot: creates live_verification + schedules record, marks slot booked,
 *   returns confirmation token + meeting link.
 *
 * PATCH /api/schedule
 *   Update outcome (mentor confirmation, no_show, pass/fail).
 */

function generateMeetingLink(verificationId: string): string {
  const short = verificationId.slice(0, 8)
  return `https://meet.certclip.com/v/${short}`
}

function generateConfirmationToken(): string {
  return randomBytes(16).toString('hex')
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const trade_id = searchParams.get('trade_id')
  const region_id = searchParams.get('region_id')
  const verification_id = searchParams.get('verification_id')
  const mentor_id = searchParams.get('mentor_id')

  // Fetch availability slots for a date
  if (date) {
    let query = supabase
      .from('mentor_availability')
      .select(`
        id, slot_start, slot_end, timezone, is_booked, mentor_id,
        mentor:profiles!mentor_availability_mentor_id_fkey(
          id, full_name, bio, years_experience
        )
      `)
      .eq('slot_date', date)
      .eq('is_booked', false)
      .order('slot_start', { ascending: true })
      .limit(50)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Group by mentor
    const byMentor: Record<string, { mentor: any; slots: any[] }> = {}
    for (const slot of data || []) {
      const mid = slot.mentor_id
      if (!byMentor[mid]) byMentor[mid] = { mentor: (slot as any).mentor, slots: [] }
      byMentor[mid].slots.push({
        id: slot.id,
        slot_start: slot.slot_start,
        slot_end: slot.slot_end,
        timezone: slot.timezone,
      })
    }

    return NextResponse.json({
      date,
      mentors: Object.values(byMentor),
      total_slots: data?.length || 0,
    })
  }

  // Fetch single verification
  if (verification_id) {
    const { data, error } = await supabase
      .from('live_verifications')
      .select(`
        *,
        tradesperson:profiles!live_verifications_tradesperson_id_fkey(full_name, email),
        mentor:profiles!live_verifications_mentor_id_fkey(full_name, email),
        trade:trades!live_verifications_trade_id_fkey(name, slug),
        region:regions!live_verifications_region_id_fkey(name, region_code, code_standard),
        schedule:schedules!schedules_live_verification_id_fkey(*)
      `)
      .eq('id', verification_id)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 404 })
    return NextResponse.json(data)
  }

  // Fetch mentor's upcoming schedule
  if (mentor_id) {
    const { data, error } = await supabase
      .from('live_verifications')
      .select(`
        id, scheduled_at, duration_minutes, timezone, status,
        skill_to_demonstrate, meeting_link, challenge_prompt,
        mentor_confirmation_signed, tradesperson_confirmation_signed, outcome,
        tradesperson:profiles!live_verifications_tradesperson_id_fkey(full_name, email),
        trade:trades!live_verifications_trade_id_fkey(name, slug),
        region:regions!live_verifications_region_id_fkey(name, region_code, code_standard)
      `)
      .eq('mentor_id', mentor_id)
      .in('status', ['scheduled', 'confirmed'])
      .order('scheduled_at', { ascending: true })
      .limit(20)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  }

  return NextResponse.json({ error: 'date, verification_id, or mentor_id required' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()
  const {
    slot_id,
    tradesperson_id,
    employer_id,
    trade_id,
    region_id,
    skill_to_demonstrate,
    challenge_prompt,
    code_standards,
    commissioned_by_type,
    price_charged,
    timezone,
    org_id,
  } = body

  if (!slot_id || !trade_id) {
    return NextResponse.json({ error: 'slot_id and trade_id required' }, { status: 400 })
  }

  // Fetch slot (and lock it)
  const { data: slot, error: slotErr } = await supabase
    .from('mentor_availability')
    .select('id, mentor_id, slot_start, slot_end, timezone, is_booked')
    .eq('id', slot_id)
    .single()

  if (slotErr || !slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
  if (slot.is_booked) return NextResponse.json({ error: 'Slot already booked' }, { status: 409 })

  const confirmationToken = generateConfirmationToken()

  // Create live_verification
  const { data: verification, error: verErr } = await supabase
    .from('live_verifications')
    .insert({
      tradesperson_id: tradesperson_id || null,
      mentor_id: slot.mentor_id,
      commissioned_by: employer_id || null,
      trade_id,
      region_id: region_id || null,
      scheduled_at: slot.slot_start,
      duration_minutes: 15,
      timezone: timezone || slot.timezone,
      meeting_link: '', // will be set below
      skill_to_demonstrate,
      challenge_prompt,
      code_standards: code_standards || [],
      status: 'scheduled',
      commissioned_by_type: commissioned_by_type || 'employer',
      price_charged: price_charged || 7500,
      video_call_provider: 'certclip-meet',
      reschedule_count: 0,
    })
    .select()
    .single()

  if (verErr) return NextResponse.json({ error: verErr.message }, { status: 500 })

  // Generate meeting link with actual ID
  const meetingLink = generateMeetingLink(verification.id)
  await supabase
    .from('live_verifications')
    .update({ meeting_link: meetingLink })
    .eq('id', verification.id)

  // Create schedules record
  const { data: schedule, error: schedErr } = await supabase
    .from('schedules')
    .insert({
      live_verification_id: verification.id,
      org_id: org_id || null,
      tradesperson_id: tradesperson_id || null,
      mentor_id: slot.mentor_id,
      slot_id,
      scheduled_at: slot.slot_start,
      timezone: timezone || slot.timezone,
      meeting_link: meetingLink,
      meeting_provider: 'certclip-meet',
      status: 'scheduled',
      calendar_invite_sent: false,
      employer_joined: false,
      tradesperson_joined: false,
      mentor_joined: false,
      confirmation_token: confirmationToken,
    })
    .select()
    .single()

  if (schedErr) console.error('Schedule record error:', schedErr.message)

  // Mark slot as booked
  await supabase
    .from('mentor_availability')
    .update({ is_booked: true, booked_by: tradesperson_id || employer_id || null })
    .eq('id', slot_id)

  // Create payment record
  if (price_charged && price_charged > 0) {
    await supabase.from('payments').insert({
      org_id: org_id || null,
      payment_type: 'live_verification',
      status: 'pending',
      amount_cents: price_charged,
      description: `Live verification — ${skill_to_demonstrate?.slice(0, 60) || 'skill assessment'}`,
      metadata: { verification_id: verification.id, slot_id, mentor_id: slot.mentor_id },
    })
  }

  const scheduledTime = new Date(slot.slot_start)
  return NextResponse.json({
    verification: { ...verification, meeting_link: meetingLink },
    schedule,
    meeting_link: meetingLink,
    confirmation_token: confirmationToken,
    scheduled_at: slot.slot_start,
    mentor_id: slot.mentor_id,
    calendar: {
      title: `CertClip Live Verification — ${skill_to_demonstrate?.slice(0, 50) || 'Skill Assessment'}`,
      start: slot.slot_start,
      end: slot.slot_end,
      location: meetingLink,
      description: `CertClip live skill verification. Join at: ${meetingLink}\n\nSkill: ${skill_to_demonstrate}\nChallenge: ${challenge_prompt || 'See platform for details'}`,
    },
  })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()
  const {
    verification_id,
    schedule_id,
    actor_type, // 'mentor' | 'tradesperson' | 'employer'
    confirmation_signed,
    outcome,
    outcome_notes,
    no_show,
    tradesperson_rating,
    employer_perceived_value,
    employer_value_notes,
    mentor_notes,
    cancellation_reason,
    status,
  } = body

  if (!verification_id) return NextResponse.json({ error: 'verification_id required' }, { status: 400 })

  const now = new Date().toISOString()
  const verUpdate: Record<string, any> = { updated_at: now }

  if (status) verUpdate.status = status
  if (outcome) verUpdate.outcome = outcome
  if (outcome_notes) verUpdate.outcome_notes = outcome_notes
  if (no_show !== undefined) verUpdate.no_show = no_show
  if (tradesperson_rating) verUpdate.tradesperson_rating = tradesperson_rating
  if (employer_perceived_value) verUpdate.employer_perceived_value = employer_perceived_value
  if (employer_value_notes) verUpdate.employer_value_notes = employer_value_notes
  if (mentor_notes) verUpdate.mentor_notes = mentor_notes
  if (cancellation_reason) verUpdate.cancellation_reason = cancellation_reason

  // Handle signed confirmations
  if (confirmation_signed && actor_type === 'mentor') {
    verUpdate.mentor_confirmation_signed = true
    verUpdate.mentor_confirmation_signed_at = now
  }
  if (confirmation_signed && actor_type === 'tradesperson') {
    verUpdate.tradesperson_confirmation_signed = true
    verUpdate.tradesperson_confirmation_signed_at = now
  }

  // Auto-complete if outcome provided
  if (outcome && ['pass', 'fail', 'no_show_tradesperson', 'no_show_mentor', 'cancelled'].includes(outcome)) {
    verUpdate.status = outcome.startsWith('no_show') ? 'no_show' : outcome === 'cancelled' ? 'cancelled' : 'completed'
    if (!outcome.startsWith('no_show') && outcome !== 'cancelled') {
      verUpdate.mentor_confirmation_signed = true
      verUpdate.mentor_confirmation_signed_at = now
    }
    if (outcome.includes('no_show')) verUpdate.no_show = true
  }

  const { data, error } = await supabase
    .from('live_verifications')
    .update(verUpdate)
    .eq('id', verification_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update schedule record if provided
  if (schedule_id) {
    const schedUpdate: Record<string, any> = {}
    if (actor_type === 'mentor' && confirmation_signed) schedUpdate.mentor_confirmed = true
    if (actor_type === 'tradesperson' && confirmation_signed) schedUpdate.tradesperson_confirmed = true
    if (actor_type === 'employer' && confirmation_signed) schedUpdate.employer_confirmed = true
    if (outcome) { schedUpdate.outcome = outcome; schedUpdate.status = verUpdate.status }
    if (no_show !== undefined) schedUpdate.no_show_reason = outcome_notes
    if (Object.keys(schedUpdate).length > 0) {
      await supabase.from('schedules').update(schedUpdate).eq('id', schedule_id)
    }
  }

  return NextResponse.json({ verification: data })
}
