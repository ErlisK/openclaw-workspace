import { NextResponse } from 'next/server'

const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY
const FROM_INBOX = 'hello-giganalytics@agentmail.to'

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json()
    if (!email) return NextResponse.json({ error: 'missing_email' }, { status: 400 })

    const firstName = name?.split(' ')[0] || 'there'

    const body_html = `<html><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
<p>Hi ${firstName},</p>
<p>It's been a week since you signed up for GigAnalytics — we just wanted to check in.</p>
<p>A lot of people sign up and then get busy. Totally understandable. But if you're still juggling 2–5 income streams without knowing which one earns the best hourly rate… that uncertainty is costing you real money.</p>
<p>GigAnalytics can tell you exactly where to focus — usually within a single session. Here's the fastest path:</p>
<p><a href="https://giganalytics.com/dashboard" style="background:#4F46E5;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Log in and upload one CSV file</a></p>
<p>If something wasn't working or felt confusing, we genuinely want to know. Just hit reply.</p>
<p>— The GigAnalytics Team<br><a href="mailto:support-giganalytics@agentmail.to">support-giganalytics@agentmail.to</a></p>
</body></html>`

    const res = await fetch(`https://api.agentmail.to/v0/inboxes/${FROM_INBOX}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AGENTMAIL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [{ email, name: name || email }],
        subject: 'Still figuring out your best-paying gig?',
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
