import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { sendTransactionalEmail } from '../../../lib/agentmail'

// ── Supabase service-role client (bypasses RLS) ──────────────────────────────
function getServiceClient() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error(
      'Missing Supabase server env vars (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)'
    )
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

const WELCOME_TEMPLATE = 'waitlist_welcome_v1'
const WELCOME_SUBJECT = "Welcome to KidColoring! You're on the list 🎨"

// ── Derive canonical site origin ─────────────────────────────────────────────
function getSiteOrigin(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '')
  const host = req.headers.get('host') ?? 'kidcoloring-landing.vercel.app'
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  return `${proto}://${host}`
}

// ── Email composer ────────────────────────────────────────────────────────────
function buildWelcomeEmail(
  origin: string,
  parentFirstName: string | null | undefined,
  unsubscribeToken: string
): { html: string; text: string } {
  const greeting = parentFirstName ? `Hi ${parentFirstName}!` : 'Hi there!'
  const unsubscribeUrl = `${origin}/api/unsubscribe?token=${unsubscribeToken}`
  const ctaUrl = `${origin}/r/welcome-cta?utm_source=welcome&utm_medium=email&utm_campaign=waitlist_v1`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Welcome to KidColoring!</title>
</head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;background:#fff;">
  <div style="text-align:center;margin-bottom:28px;">
    <h1 style="color:#7c3aed;font-size:30px;margin:0;letter-spacing:-0.5px;">🖍️ KidColoring</h1>
    <p style="color:#6b7280;font-size:14px;margin:4px 0 0;">Where every story becomes a coloring adventure</p>
  </div>

  <div style="background:#f9f7ff;border-radius:12px;padding:28px;margin-bottom:24px;">
    <h2 style="color:#1f2937;margin-top:0;">${greeting} You're on the list! 🎉</h2>
    <p style="font-size:16px;line-height:1.7;margin:0;">
      Thank you for joining the <strong>KidColoring</strong> waitlist! We're building something 
      magical — a place where kids can turn their own stories and interests into personalized 
      coloring books. 🌈✏️
    </p>
  </div>

  <h3 style="color:#7c3aed;margin-bottom:12px;">What happens next?</h3>
  <ul style="font-size:15px;line-height:2;padding-left:20px;margin:0 0 24px;">
    <li>We're putting the finishing touches on our app</li>
    <li>Early waitlist members get <strong>first access</strong> and a special surprise 🎁</li>
    <li>We'll email you the moment we're ready to launch</li>
  </ul>

  <div style="text-align:center;margin:32px 0;">
    <a href="${ctaUrl}"
       style="display:inline-block;background:#7c3aed;color:#fff;font-size:16px;font-weight:bold;
              padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">
      🎨 See Examples
    </a>
    <p style="font-size:12px;color:#9ca3af;margin-top:8px;">Check out what kids will be creating!</p>
  </div>

  <p style="font-size:15px;line-height:1.7;">
    Know another parent who'd love this? Share the magic! ✨
  </p>

  <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">
      <a href="${origin}/contact" style="color:#7c3aed;text-decoration:none;">Contact Us</a>
      &nbsp;&nbsp;·&nbsp;&nbsp;
      <a href="${origin}/privacy" style="color:#7c3aed;text-decoration:none;">Privacy Policy</a>
      &nbsp;&nbsp;·&nbsp;&nbsp;
      <a href="${origin}/terms" style="color:#7c3aed;text-decoration:none;">Terms of Service</a>
    </p>
    <p style="margin:0;font-size:12px;color:#9ca3af;">
      You're receiving this because you signed up at KidColoring.<br>
      <a href="${unsubscribeUrl}" style="color:#9ca3af;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>`

  const text = `${greeting} You're on the KidColoring waitlist! 🎉

Thank you for joining KidColoring! We're building a place where kids can turn 
their own stories and interests into personalized coloring books.

What happens next?
- We're putting the finishing touches on our app
- Early waitlist members get first access and a special surprise
- We'll email you the moment we're ready to launch

See examples of what kids will create: ${ctaUrl}

Know another parent who'd love this? Share the magic!

---
Questions? ${origin}/contact
Privacy Policy: ${origin}/privacy
Terms of Service: ${origin}/terms

You're receiving this because you signed up at KidColoring.
To unsubscribe: ${unsubscribeUrl}`

  return { html, text }
}

// ── POST /api/waitlist ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, parent_first_name, child_age_bracket, interests, consent } =
      body

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'valid email required' }, { status: 400 })
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    const user_agent = req.headers.get('user-agent') ?? null

    const path: string | null = body.path ?? null
    const utm_source: string | null = body.utm_source ?? null
    const utm_campaign: string | null = body.utm_campaign ?? null
    const utm_medium: string | null = body.utm_medium ?? null

    const normalizedEmail = (email as string).toLowerCase().trim()

    const payload: Record<string, unknown> = {
      email: normalizedEmail,
      source: utm_source ?? 'landing',
      consent: consent ?? false,
      user_agent,
    }

    if (parent_first_name) payload.parent_first_name = parent_first_name
    if (child_age_bracket) payload.child_age_bracket = child_age_bracket

    if (Array.isArray(interests) && interests.length > 0) {
      payload.interests = interests
    } else if (typeof interests === 'string' && interests.trim()) {
      payload.interests = interests
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
    }

    if (ip) payload.ip = ip
    if (path) payload.notes = `path=${path}`
    if (utm_source) payload.utm_source = utm_source
    if (utm_campaign) payload.utm_campaign = utm_campaign
    if (utm_medium) payload.utm_medium = utm_medium

    const client = getServiceClient()
    const origin = getSiteOrigin(req)

    // ── 1. Upsert the signup row ──────────────────────────────────────────────
    const { data: upsertData, error } = await client
      .from('waitlist_signups')
      .upsert([payload], { onConflict: 'email', ignoreDuplicates: false })
      .select(
        'id, email, parent_first_name, unsubscribe_token, unsubscribed'
      )
      .single()

    if (error) {
      console.error('Waitlist upsert error:', error.message, error.details)
      if (error.code === '23505') {
        return NextResponse.json({ ok: true, note: 'already_registered' })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    type SignupRow = {
      id: string
      email: string
      parent_first_name: string | null
      unsubscribe_token: string | null
      unsubscribed: boolean
    }
    const row = upsertData as SignupRow

    // ── 2. Ensure unsubscribe_token is set ───────────────────────────────────
    let unsubscribeToken = row.unsubscribe_token
    if (!unsubscribeToken) {
      unsubscribeToken = randomBytes(32).toString('hex')
      await client
        .from('waitlist_signups')
        .update({ unsubscribe_token: unsubscribeToken })
        .eq('id', row.id)
    }

    // ── 3. Skip if already unsubscribed ─────────────────────────────────────
    if (row.unsubscribed) {
      return NextResponse.json({ ok: true, note: 'already_registered' })
    }

    // ── 4. Idempotency: skip if sent/queued within last 10 minutes ────────────
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: recentSends } = await client
      .from('email_sends')
      .select('id')
      .eq('to_email', normalizedEmail)
      .eq('template', WELCOME_TEMPLATE)
      .in('status', ['queued', 'sent'])
      .gte('created_at', tenMinutesAgo)
      .limit(1)

    if (recentSends && recentSends.length > 0) {
      await client.from('email_sends').insert([
        {
          to_email: normalizedEmail,
          template: WELCOME_TEMPLATE,
          subject: WELCOME_SUBJECT,
          status: 'skipped',
          provider: 'agentmail',
          meta: { reason: 'duplicate_suppressed', signup_id: row.id },
        },
      ])
      return NextResponse.json({ ok: true, note: 'already_registered' })
    }

    // ── 5. Insert queued log row ─────────────────────────────────────────────
    // Note: run this synchronously so log persists even if send times out
    let logRowId: string | null = null
    try {
      const { data: logRow } = await client.from('email_sends').insert([
        {
          to_email: normalizedEmail,
          template: WELCOME_TEMPLATE,
          subject: WELCOME_SUBJECT,
          status: 'queued',
          provider: 'agentmail',
          meta: { signup_id: row.id },
        },
      ]).select('id').single()
      logRowId = logRow?.id ?? null
    } catch (logErr) {
      console.error('[waitlist] Failed to insert queued email_sends row:', logErr)
    }

    // ── 6. Compose & send welcome email (sync — serverless functions must    ─
    //    complete all work before returning or the process is terminated)    ──
    const { html, text } = buildWelcomeEmail(
      origin,
      row.parent_first_name,
      unsubscribeToken!
    )

    let sendStatus: 'sent' | 'failed' | 'skipped' = 'failed'
    let sendResponseId: string | undefined
    let sendError: string | undefined

    try {
      const sendResult = await sendTransactionalEmail({
        to: normalizedEmail,
        subject: WELCOME_SUBJECT,
        html,
        text,
        template: WELCOME_TEMPLATE,
        meta: { signup_id: row.id },
      })
      sendStatus = sendResult.status
      sendResponseId = sendResult.responseId
      sendError = sendResult.error
    } catch (sendErr: unknown) {
      sendError = sendErr instanceof Error ? sendErr.message : String(sendErr)
      console.error('[waitlist] sendTransactionalEmail threw:', sendError)
    }

    // ── 7. Update log row with final status ──────────────────────────────────
    if (logRowId) {
      try {
        await client.from('email_sends')
          .update({
            status: sendStatus,
            response_id: sendResponseId ?? null,
            error: sendError ?? null,
          })
          .eq('id', logRowId)
      } catch (updateErr) {
        console.error('[waitlist] Failed to update email_sends row:', updateErr)
      }
    }

    // ── 8. Track via /api/track ──────────────────────────────────────────────
    const trackEvent = sendStatus === 'sent' ? 'email_welcome_sent' : 'email_welcome_failed'
    const trackProps: Record<string, unknown> = { template: WELCOME_TEMPLATE }
    if (sendStatus !== 'sent') trackProps.error = sendError

    try {
      await fetch(`${origin}/api/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_name: trackEvent, props: trackProps }),
      })
    } catch (_trackErr) {
      // Tracking is non-critical
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('Waitlist error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
