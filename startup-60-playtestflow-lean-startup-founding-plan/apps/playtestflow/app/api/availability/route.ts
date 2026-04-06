import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase-server'

/**
 * POST /api/availability
 * Submit tester availability for a session.
 * Public — identified by session_id + tester_email (or consent_token).
 * 
 * Body: { session_id, tester_email, tester_name, available_slots: string[], timezone, notes, token? }
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    session_id, tester_email, tester_name, available_slots,
    timezone = 'UTC', notes, token,
  } = body

  if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 })
  if (!tester_email && !token) return NextResponse.json({ error: 'tester_email or token required' }, { status: 400 })

  const supabase = createServiceClient()

  // Resolve tester identity from token if provided
  let resolvedEmail = tester_email
  let resolvedName = tester_name
  let signupId: string | null = null
  let testerId: string | null = null

  if (token) {
    const { data: signup } = await supabase
      .from('session_signups')
      .select('id, tester_email, tester_name, tester_id')
      .eq('consent_token', token)
      .single()
    if (signup) {
      resolvedEmail = signup.tester_email
      resolvedName = signup.tester_name
      signupId = signup.id
      testerId = signup.tester_id
    }
  }

  if (!resolvedEmail) return NextResponse.json({ error: 'Could not resolve tester email' }, { status: 400 })

  // Validate and parse slots
  const parsedSlots = (available_slots ?? [])
    .filter((s: string) => {
      try { new Date(s); return true } catch { return false }
    })
    .map((s: string) => new Date(s).toISOString())

  // Upsert availability
  const { data, error } = await supabase
    .from('tester_availability')
    .upsert({
      session_id,
      signup_id: signupId,
      tester_id: testerId,
      tester_email: resolvedEmail,
      tester_name: resolvedName ?? resolvedEmail.split('@')[0],
      available_slots: parsedSlots,
      timezone,
      notes: notes ?? null,
    }, { onConflict: 'session_id,tester_email' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    availability: data,
    slots_submitted: parsedSlots.length,
  })
}

/**
 * GET /api/availability?session_id=<id>
 * Get all availability submissions for a session (designer-auth).
 * Also returns best slot recommendations.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')

  if (!sessionId) return NextResponse.json({ error: 'session_id required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify session ownership
  const { data: session } = await supabase
    .from('playtest_sessions')
    .select('id, title, scheduled_at, max_testers')
    .eq('id', sessionId)
    .eq('designer_id', user.id)
    .single()
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const svc = createServiceClient()

  // Get all availability records
  const { data: availability } = await svc
    .from('tester_availability')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })

  // Compute best slots (most testers available)
  const slotVotes: Record<string, { count: number; testers: string[] }> = {}

  for (const av of (availability ?? [])) {
    const slots: string[] = av.available_slots ?? []
    for (const slot of slots) {
      // Normalize to hour bucket
      const dt = new Date(slot)
      dt.setMinutes(0, 0, 0)
      const key = dt.toISOString()
      if (!slotVotes[key]) slotVotes[key] = { count: 0, testers: [] }
      slotVotes[key].count++
      slotVotes[key].testers.push(av.tester_name)
    }
  }

  const bestSlots = Object.entries(slotVotes)
    .map(([slot, v]) => ({ slot, ...v }))
    .sort((a, b) => b.count - a.count || a.slot.localeCompare(b.slot))
    .slice(0, 10)

  return NextResponse.json({
    availability: availability ?? [],
    respondents: (availability ?? []).length,
    best_slots: bestSlots,
    session: {
      id: session.id,
      title: session.title,
      scheduled_at: session.scheduled_at,
      max_testers: session.max_testers,
    },
  })
}
