import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

// ── Supabase admin client (same pattern as /api/track) ──────────────────────
function getServiceClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase server env vars (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

// ── Validation schema ────────────────────────────────────────────────────────
const contactSchema = z.object({
  name: z.string().max(100).optional(),
  email: z.string().email().max(254),
  subject: z.enum(['General', 'Support', 'Privacy/Deletion']),
  message: z.string().min(10).max(2000),
})

// ── In-memory IP rate limiting (5 requests / hour / IP) ─────────────────────
interface RateBucket {
  count: number
  resetAt: number
}

const ipBuckets = new Map<string, RateBucket>()
const RATE_LIMIT = 5
const WINDOW_MS = 60 * 60 * 1000 // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const bucket = ipBuckets.get(ip)
  if (!bucket || now >= bucket.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  if (bucket.count >= RATE_LIMIT) return true
  bucket.count += 1
  return false
}

// ── Helper: partially redact email ──────────────────────────────────────────
function redactEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***@***'
  const visible = local.length > 2 ? local.slice(0, 2) : local[0] ?? '*'
  return `${visible}***@${domain}`
}

// ── POST /api/contact ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // IP rate limiting
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      'unknown'

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.' },
        { status: 429 }
      )
    }

    // Parse + validate body
    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const parsed = contactSchema.safeParse(raw)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.message).join(', ')
      return NextResponse.json({ error: `Validation error: ${issues}` }, { status: 400 })
    }

    const { email, subject, message } = parsed.data
    const now = new Date().toISOString()
    const client = getServiceClient()

    // Log contact_submit event (no full message — privacy)
    const submitMeta = {
      subject,
      email_redacted: redactEmail(email),
      message_length: message.length,
    }

    const { error: insertError } = await client.from('events').insert([
      {
        event_name: 'contact_submit',
        properties: submitMeta,
        created_at: now,
      },
    ])

    if (insertError) {
      console.error('contact_submit insert error:', insertError.message)
      // Non-critical — continue
    }

    // Log contact_success after persistence
    await client
      .from('events')
      .insert([
        {
          event_name: 'contact_success',
          properties: { subject, email_redacted: redactEmail(email) },
          created_at: new Date().toISOString(),
        },
      ])
      .then(({ error }) => {
        if (error) console.warn('contact_success insert error:', error.message)
      })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('Contact API error:', msg)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
