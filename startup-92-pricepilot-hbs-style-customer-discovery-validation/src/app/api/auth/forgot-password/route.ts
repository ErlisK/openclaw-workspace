import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const APP_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://startup-92-pricepilot-hbs-style-cus.vercel.app'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${APP_URL}/reset-password/update`,
    })

    if (error) {
      console.error('[forgot-password] Supabase error:', error.message)
      // Return success anyway to avoid email enumeration
    }

    return NextResponse.json(
      { message: 'If an account exists for that email, a reset link has been sent.' },
      { status: 200 }
    )
  } catch (err) {
    console.error('[forgot-password] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 400 })
  }
}
