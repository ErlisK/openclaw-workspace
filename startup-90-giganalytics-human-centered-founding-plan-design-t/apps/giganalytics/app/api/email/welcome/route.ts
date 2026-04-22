import { NextResponse } from 'next/server'

const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY
const FROM_INBOX = 'hello@hourlyroi.com'

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json()
    if (!email) return NextResponse.json({ error: 'missing_email' }, { status: 400 })

    const firstName = name?.split(' ')[0] || 'there'

    const body_html = `<html><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
<p>Hi ${firstName},</p>
<p>Welcome to GigAnalytics! We're glad you're here.</p>
<p>GigAnalytics exists to answer one question: across everything you're working on, <strong>where is your time actually worth the most?</strong> Most people with 2–5 income streams have no idea — because the data lives in five different places and nobody's done the math.</p>
<p>Here's how to get your first insight in under 5 minutes:</p>
<ol>
<li><strong>Import your payment data</strong> — upload a CSV from Stripe, PayPal, or your platform of choice. Takes about 60 seconds.</li>
<li><strong>Log your time</strong> — use the one-tap timer the next time you start a gig, or let us infer from your calendar.</li>
<li><strong>See your true hourly rate</strong> — per income stream, with fees and ad spend factored in.</li>
</ol>
<p><a href="https://giganalytics.com/dashboard" style="background:#4F46E5;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Get started now</a></p>
<p>If you hit any snags or have questions, just reply to this email. We read every one.</p>
<p>— The GigAnalytics Team<br><a href="mailto:hello@hourlyroi.com">hello@hourlyroi.com</a></p>
</body></html>`

    const res = await fetch(`https://api.agentmail.to/v0/inboxes/${FROM_INBOX}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AGENTMAIL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [{ email, name: name || email }],
        subject: 'Welcome to GigAnalytics — let\'s find your highest-ROI gig',
        body_html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: 'send_failed', detail: err }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
