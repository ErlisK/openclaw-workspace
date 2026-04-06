import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/auth/magic-link
 * Sends a magic link (email OTP) to the given email via Supabase Auth.
 * Used for interview scheduling and future authenticated features.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, redirect_to } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirect_to || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://playtestflow.vercel.app'}/auth/callback`,
      },
    })

    if (error) {
      console.error('Magic link error:', error)
      return NextResponse.json({ error: 'Failed to send login link. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Check your email for a login link.',
    })
  } catch (err) {
    console.error('Magic link error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
