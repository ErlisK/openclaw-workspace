import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── Supabase service-role client ─────────────────────────────────────────────
function getServiceClient() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase server env vars')
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

const DOMAIN = 'https://kidcoloring-landing.vercel.app'

function htmlResponse(body: string, status = 200) {
  return new NextResponse(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// ── GET /api/unsubscribe?token={token} ───────────────────────────────────────
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  // ── Validate token param ──────────────────────────────────────────────────
  if (!token || token.trim().length < 10) {
    return htmlResponse(
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Invalid Link — KidColoring</title>
</head>
<body style="font-family:Arial,sans-serif;max-width:520px;margin:80px auto;padding:24px;text-align:center;color:#333;">
  <h1 style="color:#7c3aed;font-size:28px;">🖍️ KidColoring</h1>
  <h2 style="color:#1f2937;">Invalid Unsubscribe Link</h2>
  <p style="font-size:15px;line-height:1.6;">
    This unsubscribe link is invalid or has expired.
  </p>
  <p style="font-size:15px;">
    If you need help, please <a href="${DOMAIN}/contact" style="color:#7c3aed;">contact us</a>.
  </p>
  <p style="margin-top:32px;">
    <a href="${DOMAIN}" style="color:#7c3aed;text-decoration:none;">← Back to KidColoring</a>
  </p>
</body>
</html>`,
      400
    )
  }

  try {
    const client = getServiceClient()

    // ── Look up signup by unsubscribe_token ───────────────────────────────
    const { data: signup, error } = await client
      .from('waitlist_signups')
      .select('id, email, unsubscribed')
      .eq('unsubscribe_token', token.trim())
      .single()

    if (error || !signup) {
      return htmlResponse(
        `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Link Not Found — KidColoring</title>
</head>
<body style="font-family:Arial,sans-serif;max-width:520px;margin:80px auto;padding:24px;text-align:center;color:#333;">
  <h1 style="color:#7c3aed;font-size:28px;">🖍️ KidColoring</h1>
  <h2 style="color:#1f2937;">Unsubscribe Link Not Found</h2>
  <p style="font-size:15px;line-height:1.6;">
    We couldn't find a subscription associated with this link. It may have already been processed.
  </p>
  <p style="font-size:15px;">
    Need help? <a href="${DOMAIN}/contact" style="color:#7c3aed;">Contact us</a>.
  </p>
  <p style="margin-top:32px;">
    <a href="${DOMAIN}" style="color:#7c3aed;text-decoration:none;">← Back to KidColoring</a>
  </p>
</body>
</html>`,
        400
      )
    }

    type SignupRow = { id: string; email: string; unsubscribed: boolean }
    const row = signup as SignupRow

    // ── Already unsubscribed ──────────────────────────────────────────────
    if (row.unsubscribed) {
      return htmlResponse(
        `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Already Unsubscribed — KidColoring</title>
</head>
<body style="font-family:Arial,sans-serif;max-width:520px;margin:80px auto;padding:24px;text-align:center;color:#333;">
  <h1 style="color:#7c3aed;font-size:28px;">🖍️ KidColoring</h1>
  <h2 style="color:#1f2937;">You're already unsubscribed ✅</h2>
  <p style="font-size:15px;line-height:1.6;">
    You've already been removed from our mailing list. We won't send you any more emails.
  </p>
  <p style="margin-top:32px;">
    <a href="${DOMAIN}" style="color:#7c3aed;text-decoration:none;">← Back to KidColoring</a>
  </p>
  <p style="font-size:12px;color:#9ca3af;margin-top:16px;">
    <a href="${DOMAIN}/privacy" style="color:#9ca3af;">Privacy Policy</a>
  </p>
</body>
</html>`
      )
    }

    // ── Mark as unsubscribed ──────────────────────────────────────────────
    await client
      .from('waitlist_signups')
      .update({
        unsubscribed: true,
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('id', row.id)

    // ── Log unsubscribe event (best-effort) ───────────────────────────────
    try {
      await client.from('events').insert([
        {
          event_type: 'email_unsubscribe',
          email: row.email,
          meta: { source: 'email_link' },
        },
      ])
    } catch (_err) {
      // events table column schema may differ — skip gracefully
    }

    return htmlResponse(
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Unsubscribed — KidColoring</title>
</head>
<body style="font-family:Arial,sans-serif;max-width:520px;margin:80px auto;padding:24px;text-align:center;color:#333;">
  <h1 style="color:#7c3aed;font-size:28px;">🖍️ KidColoring</h1>
  <h2 style="color:#1f2937;">You've been unsubscribed 💙</h2>
  <p style="font-size:15px;line-height:1.6;">
    We've removed you from our mailing list. You won't receive any more emails from us.
  </p>
  <p style="font-size:15px;line-height:1.6;">
    Changed your mind? You can always 
    <a href="${DOMAIN}" style="color:#7c3aed;">sign up again</a> on our website.
  </p>
  <p style="margin-top:32px;">
    <a href="${DOMAIN}" style="color:#7c3aed;text-decoration:none;">← Back to KidColoring</a>
  </p>
  <p style="font-size:12px;color:#9ca3af;margin-top:16px;">
    <a href="${DOMAIN}/privacy" style="color:#9ca3af;">Privacy Policy</a>
    &nbsp;&nbsp;·&nbsp;&nbsp;
    <a href="${DOMAIN}/contact" style="color:#9ca3af;">Contact Us</a>
  </p>
</body>
</html>`
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[unsubscribe] Error:', msg)
    return htmlResponse(
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Error — KidColoring</title>
</head>
<body style="font-family:Arial,sans-serif;max-width:520px;margin:80px auto;padding:24px;text-align:center;color:#333;">
  <h1 style="color:#7c3aed;font-size:28px;">🖍️ KidColoring</h1>
  <h2 style="color:#1f2937;">Something went wrong</h2>
  <p style="font-size:15px;line-height:1.6;">
    We encountered an error processing your request. Please try again or 
    <a href="${DOMAIN}/contact" style="color:#7c3aed;">contact us</a> for help.
  </p>
</body>
</html>`,
      500
    )
  }
}
