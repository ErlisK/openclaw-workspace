/**
 * POST /api/auth/login
 * JSON wrapper for Supabase email/password login.
 * The primary login flow is client-side, but this endpoint supports
 * programmatic/API consumers (tests, native apps, integrations).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRatelimit, checkRateLimit } from '@/lib/ratelimit'

const loginLimiter = createRatelimit(10, 60)

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') || 'unknown'
  const { limited, headers: rlHeaders } = await checkRateLimit(loginLimiter, `login:${ip}`)
  if (limited) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429, headers: rlHeaders }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email || !password) {
    return NextResponse.json({ error: 'email and password are required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  return NextResponse.json({
    success: true,
    token_type: 'bearer',
    expires_in: data.session?.expires_in,
    user: { id: data.user?.id, email: data.user?.email },
  }, { headers: rlHeaders })
}
