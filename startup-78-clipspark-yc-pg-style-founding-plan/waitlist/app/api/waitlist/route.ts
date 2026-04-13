import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const VALID_CREATOR_TYPES = ['Solo Podcaster', 'Livestream Host', 'Coach', 'Founder', 'Other']
const VALID_AUDIENCE_SIZES = ['<1k', '1k–5k', '5k–10k', '10k+']
const MAX_TEXT_LENGTH = 1000
const MAX_EMAIL_LENGTH = 254

// Simple in-memory rate limiter (per IP hash, resets on cold start — good enough for edge functions)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ipKey: string): boolean {
  const now = Date.now()
  const window = 60 * 60 * 1000 // 1 hour
  const maxRequests = 5

  const entry = rateLimitMap.get(ipKey)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ipKey, { count: 1, resetAt: now + window })
    return true
  }
  if (entry.count >= maxRequests) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting by IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many submissions from this IP. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const {
      name,
      email,
      creator_type,
      platform_focus,
      episodes_per_week,
      biggest_pain_point,
      current_workflow,
      channels_used,
      current_tooling,
      use_frequency,
    } = body

    // Required fields
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    // Length validation
    if (typeof email !== 'string' || email.length > MAX_EMAIL_LENGTH) {
      return NextResponse.json({ error: 'Email address is too long.' }, { status: 400 })
    }
    if (typeof name !== 'string' || name.length > 200) {
      return NextResponse.json({ error: 'Name is too long.' }, { status: 400 })
    }
    if (biggest_pain_point && (typeof biggest_pain_point !== 'string' || biggest_pain_point.length > MAX_TEXT_LENGTH)) {
      return NextResponse.json({ error: `Pain point field must be at most ${MAX_TEXT_LENGTH} characters.` }, { status: 400 })
    }
    if (current_workflow && (typeof current_workflow !== 'string' || current_workflow.length > MAX_TEXT_LENGTH)) {
      return NextResponse.json({ error: `Current workflow field must be at most ${MAX_TEXT_LENGTH} characters.` }, { status: 400 })
    }

    // Allowlist validation for enum fields
    if (creator_type && !VALID_CREATOR_TYPES.includes(creator_type)) {
      return NextResponse.json({ error: 'Invalid creator type.' }, { status: 400 })
    }
    if (body.audience_size && !VALID_AUDIENCE_SIZES.includes(body.audience_size)) {
      return NextResponse.json({ error: 'Invalid audience size.' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error } = await supabase.from('waitlist').insert([
      {
        name,
        email,
        creator_type,
        platform_focus,
        episodes_per_week: episodes_per_week ? parseInt(episodes_per_week) : null,
        biggest_pain_point,
        current_workflow,
        channels_used,
        current_tooling,
        use_frequency,
      },
    ])

    if (error) {
      // Postgres unique constraint violation = duplicate email
      if (error.code === '23505') {
        return NextResponse.json(
          { error: "You're already on the waitlist! We'll be in touch." },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Waitlist error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
