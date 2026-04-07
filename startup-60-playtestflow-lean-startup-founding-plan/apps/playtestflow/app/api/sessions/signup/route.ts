import { createClient, createServiceClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { generateTesterCredentials } from '@/lib/anonymize'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { sessionId, name, email, role, consent } = body

  if (!sessionId || !name || !email || !consent) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields' },
      { status: 400, headers: CORS }
    )
  }

  const supabase = createServiceClient()
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://playtestflow.vercel.app'

  // Verify session is open
  const { data: session } = await supabase
    .from('playtest_sessions')
    .select('id, max_testers, status, title, projects(name)')
    .eq('id', sessionId)
    .in('status', ['recruiting', 'scheduled'])
    .single()

  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Session not found or no longer recruiting' },
      { status: 404, headers: CORS }
    )
  }

  // Check spot availability
  const { count } = await supabase
    .from('session_signups')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .in('status', ['registered', 'confirmed'])

  if ((count ?? 0) >= session.max_testers) {
    return NextResponse.json(
      { success: false, error: 'This session is full' },
      { status: 409, headers: CORS }
    )
  }

  // Check for duplicate email in this session
  const { data: existing } = await supabase
    .from('session_signups')
    .select('id')
    .eq('session_id', sessionId)
    .eq('tester_email', email)
    .single()

  if (existing) {
    return NextResponse.json(
      { success: false, error: 'You are already signed up for this session' },
      { status: 409, headers: CORS }
    )
  }

  // Generate anonymized tester ID + unique consent token
  const { testerId, salt, consentToken } = await generateTesterCredentials(email, sessionId)

  // Capture fraud signals at signup time
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? null
  const userAgent = request.headers.get('user-agent') ?? null
  const signupTimeMs = typeof body.signupTimeMs === 'number' ? body.signupTimeMs : null

  const { data: signup, error } = await supabase
    .from('session_signups')
    .insert({
      session_id: sessionId,
      tester_name: name,
      tester_email: email,
      role: role || null,
      consent_given: true,
      consent_given_at: new Date().toISOString(),
      status: 'registered',
      tester_id: testerId,
      tester_id_salt: salt,
      consent_token: consentToken,
      consent_version: 'v1',
      utm_source: body.utm_source || null,
      ip_address: ipAddress,
      user_agent: userAgent,
      signup_time_ms: signupTimeMs,
    })
    .select('id, tester_id, consent_token')
    .single()

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: CORS }
    )
  }

  // Build the pre-survey URL for inclusion in email
  const preSurveyUrl = `${origin}/survey/pre/${consentToken}`
  const consentPageUrl = `${origin}/consent/${consentToken}`

  return NextResponse.json(
    {
      success: true,
      message: "You're signed up! Check your email for session details.",
      testerId,
      consentToken,
      preSurveyUrl,
      consentPageUrl,
    },
    { headers: CORS }
  )
}
