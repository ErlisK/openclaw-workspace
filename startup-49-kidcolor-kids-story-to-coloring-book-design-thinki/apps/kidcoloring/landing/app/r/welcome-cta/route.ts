import { NextRequest, NextResponse } from 'next/server'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.SITE_URL ??
  'https://kidcoloring-landing.vercel.app'

/**
 * GET /r/welcome-cta
 *
 * Instrumented redirect: logs email_welcome_cta_clicked event then
 * 302-redirects the visitor to the examples section with UTM params.
 *
 * This route is linked from the welcome email CTA button.
 */
export async function GET(req: NextRequest) {
  // ── Fire tracking (best-effort, non-blocking) ──────────────────────────────
  try {
    const origin = new URL(req.url).origin
    await fetch(`${origin}/api/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'email_welcome_cta_clicked',
        props: {
          template: 'waitlist_welcome_v1',
          referrer: req.headers.get('referer') ?? null,
        },
      }),
    })
  } catch (_err) {
    // Tracking failure is non-critical; proceed to redirect regardless
  }

  const destination = `${SITE_URL}/#examples?utm_source=welcome&utm_medium=email&utm_campaign=waitlist_v1`

  return NextResponse.redirect(destination, { status: 302 })
}
