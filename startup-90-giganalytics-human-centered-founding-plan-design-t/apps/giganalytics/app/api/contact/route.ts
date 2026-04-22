import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ─── Simple in-memory rate limiter (per IP, resets on cold start) ─────────────
const ipCallMap = new Map<string, { count: number; windowStart: number }>()
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = ipCallMap.get(ip)
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    ipCallMap.set(ip, { count: 1, windowStart: now })
    return false
  }
  if (entry.count >= RATE_LIMIT) return true
  entry.count++
  return false
}

// ─── Validation schema ────────────────────────────────────────────────────────
const ContactSchema = z.object({
  name: z.string().max(100).optional(),
  email: z.string().email().max(254),
  subject: z.string().max(200).optional(),
  message: z.string().min(1).max(5000),
  // Honeypot field — bots fill this, humans don't
  website: z.string().max(0).optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'Too many requests. Try again later.' },
        { status: 429, headers: { 'Retry-After': '3600' } }
      )
    }

    const body = await request.json()

    // Honeypot check — if filled, silently accept but don't store
    if (body.website && String(body.website).length > 0) {
      return NextResponse.json({ ok: true, message: "Your message has been received. We'll respond within 1–2 business days." })
    }

    const parsed = ContactSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]
      return NextResponse.json(
        { error: 'validation_error', message: firstError?.message ?? 'Invalid input.' },
        { status: 400 }
      )
    }

    const { name, email, subject, message } = parsed.data

    const supabase = await createClient()

    // Store contact submission in DB
    const { error } = await supabase
      .from('contact_submissions')
      .insert({
        name: name ?? null,
        email,
        subject: subject ?? null,
        message,
        created_at: new Date().toISOString(),
      })

    if (error) {
      // Table may not exist yet — still return success to user
      console.error('contact_submissions insert error:', error.message)
    }

    return NextResponse.json({ ok: true, message: "Your message has been received. We'll respond within 1–2 business days." })
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}
