import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { sessionId, name, email, role, consent } = body

  if (!sessionId || !name || !email || !consent) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = await createClient()

  // Verify session is open
  const { data: session } = await supabase
    .from('playtest_sessions')
    .select('id, max_testers, status')
    .eq('id', sessionId)
    .in('status', ['recruiting', 'scheduled'])
    .single()

  if (!session) {
    return NextResponse.json({ success: false, error: 'Session not found or no longer recruiting' }, { status: 404 })
  }

  // Check spot availability
  const { count } = await supabase
    .from('session_signups')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .in('status', ['registered', 'confirmed'])

  if ((count ?? 0) >= session.max_testers) {
    return NextResponse.json({ success: false, error: 'Session is full' }, { status: 409 })
  }

  // Check if already signed up
  const { data: existing } = await supabase
    .from('session_signups')
    .select('id')
    .eq('session_id', sessionId)
    .eq('tester_email', email)
    .single()

  if (existing) {
    return NextResponse.json({ success: false, error: 'You are already signed up for this session' }, { status: 409 })
  }

  const { error } = await supabase.from('session_signups').insert({
    session_id: sessionId,
    tester_name: name,
    tester_email: email,
    role: role || null,
    consent_given: true,
    consent_given_at: new Date().toISOString(),
    status: 'registered',
  })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: "You're signed up! We'll send details before the session." })
}
