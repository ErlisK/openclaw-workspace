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
<p>We noticed you've been putting GigAnalytics through its paces — thank you. Seeing real users get value from the product is why we built it.</p>
<p>We'd love 3 minutes of your time to ask two things:</p>
<ol>
<li>What's working well? What insight surprised you most?</li>
<li>What's missing or frustrating? What would make GigAnalytics a permanent part of your workflow?</li>
</ol>
<p>You can reply directly to this email — no forms, no surveys, just a conversation.</p>
<p>Also: if GigAnalytics has been useful, we'd be thrilled if you mentioned it to a colleague or shared it in a community you're part of. Word of mouth is how we're growing.</p>
<p>Thanks for being an early adopter.</p>
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
        subject: 'You\'re one of our most active users — quick question',
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
