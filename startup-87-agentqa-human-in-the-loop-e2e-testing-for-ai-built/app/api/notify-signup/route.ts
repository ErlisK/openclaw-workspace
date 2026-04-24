/**
 * POST /api/notify-signup
 * Sends a Slack notification when a new user signs up.
 * Called client-side after successful signup.
 * Body: { email: string }
 *
 * Rate-limited: max 5 notifications per IP per 15 minutes to prevent Slack spam.
 */
import { NextRequest, NextResponse } from 'next/server'

// In-memory store: ip → [timestamps]
// Resets on cold start; good enough for serverless abuse prevention.
const RATE_STORE = new Map<string, number[]>()
const RATE_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT = 5 // max notifications per window per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const cutoff = now - RATE_WINDOW_MS
  const hits = (RATE_STORE.get(ip) ?? []).filter(t => t > cutoff)
  if (hits.length >= RATE_LIMIT) return false
  RATE_STORE.set(ip, [...hits, now])
  return true
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ ok: false, error: 'Rate limit exceeded' }, { status: 429 })
    }

    const { email } = await req.json()

    // Basic email sanity check — must look like an email
    if (!email || typeof email !== 'string' || !email.includes('@') || email.length > 254) {
      return NextResponse.json({ ok: false, error: 'Invalid email' }, { status: 400 })
    }

    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) return NextResponse.json({ ok: false, error: 'No webhook configured' })

    const payload = {
      text: `🎉 *New BetaWindow signup!*\n• Email: \`${email}\`\n• Time: ${new Date().toISOString()}\n• First test: FREE (LAUNCH promo auto-applied)\n\n<https://betawindow.com/admin|View admin dashboard>`,
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    return NextResponse.json({ ok: res.ok })
  } catch (err) {
    return NextResponse.json({ ok: false })
  }
}
