import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { createRatelimit, checkRateLimit } from '@/lib/ratelimit'

const signupLimiter = createRatelimit(5, 60)

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
  const { limited, headers: rlHeaders } = await checkRateLimit(signupLimiter, `signup:${ip}`)
  if (limited) {
    return NextResponse.json(
      { error: 'Too many signup attempts. Please try again later.' },
      { status: 429, headers: rlHeaders }
    )
  }

  try {
    const body = await request.json()
    const { email, password, acceptedTerms } = body

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    if (!acceptedTerms) {
      return NextResponse.json({ error: 'You must accept the terms' }, { status: 400 })
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || ''
    const supabase = await createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    })

    if (error) {
      // Log details server-side but return generic message to avoid enumeration
      console.error('[signup] supabase error:', error.message)
    }

    // Always return generic success to prevent email enumeration
    return NextResponse.json(
      { success: true, message: 'If this email is not already registered, you will receive a confirmation email.' },
      { status: 200 }
    )
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
