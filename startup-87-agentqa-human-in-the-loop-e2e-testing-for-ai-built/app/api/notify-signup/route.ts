/**
 * POST /api/notify-signup
 * Sends a Slack notification when a new user signs up.
 * Called client-side after successful signup.
 * Body: { email: string }
 */
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) return NextResponse.json({ ok: false, error: 'No webhook configured' })

    const payload = {
      text: `🎉 *New BetaWindow signup!*\n• Email: \`${email ?? 'unknown'}\`\n• Time: ${new Date().toISOString()}\n• First test: FREE (LAUNCH promo auto-applied)\n\n<https://betawindow.com/admin|View admin dashboard>`,
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
