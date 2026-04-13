/**
 * lib/email.ts — Email sending via AgentMail API
 * Used by cron jobs for reminder and follow-up emails.
 */

const AGENTMAIL_API = 'https://api.agentmail.to/v0'

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
}

export interface SendResult {
  ok: boolean
  messageId?: string
  error?: string
}

export async function sendEmail(opts: SendEmailOptions): Promise<SendResult> {
  const apiKey = process.env.AGENTMAIL_API_KEY
  if (!apiKey) return { ok: false, error: 'AGENTMAIL_API_KEY not set' }

  const from = opts.from ?? 'hello@playtestflow.com'

  try {
    const res = await fetch(`${AGENTMAIL_API}/inboxes/scide-founder@agentmail.to/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text ?? stripHtml(opts.html),
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: `AgentMail ${res.status}: ${body.slice(0, 200)}` }
    }

    const data = await res.json()
    return { ok: true, messageId: data.id ?? data.message_id ?? 'sent' }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

// ── Email templates ───────────────────────────────────────────────────────────

export function buildReminderEmail({
  testerName,
  sessionTitle,
  sessionTime,
  sessionUrl,
  designerName,
  hoursUntil,
}: {
  testerName: string
  sessionTitle: string
  sessionTime: string
  sessionUrl: string
  designerName: string
  hoursUntil: number
}): { subject: string; html: string } {
  const timeLabel = hoursUntil <= 1 ? 'in about 1 hour' : `in ${hoursUntil} hours`
  const subject = `⏰ Reminder: "${sessionTitle}" is ${timeLabel}`

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:32px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
        <!-- Header -->
        <tr><td style="padding:0 0 24px">
          <span style="font-weight:800;font-size:18px;color:#ff6600">🎲 PlaytestFlow</span>
        </td></tr>
        <!-- Card -->
        <tr><td style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px">
          <p style="margin:0 0 8px;font-size:28px">⏰</p>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#f0f6fc">Session Reminder</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#8b949e">
            Hi ${testerName}, your playtest session starts <strong style="color:#f0f6fc">${timeLabel}</strong>.
          </p>
          <!-- Session info -->
          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;margin:0 0 24px;padding:16px">
            <tr><td>
              <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#8b949e">Session</p>
              <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#f0f6fc">${sessionTitle}</p>
              <p style="margin:0 0 4px;font-size:13px;color:#8b949e">
                📅 <strong style="color:#f0f6fc">${new Date(sessionTime).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', timeZoneName:'short' })}</strong>
              </p>
              <p style="margin:4px 0 0;font-size:13px;color:#8b949e">
                👤 Hosted by <strong style="color:#f0f6fc">${designerName}</strong>
              </p>
            </td></tr>
          </table>
          <!-- CTA -->
          <a href="${sessionUrl}" style="display:block;background:#ff6600;color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:12px;font-weight:700;font-size:15px">
            Join Session →
          </a>
          <p style="margin:16px 0 0;font-size:12px;color:#8b949e;text-align:center">
            Can't make it? Please reply to this email to let the designer know.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 0 0;text-align:center">
          <p style="margin:0;font-size:11px;color:#8b949e">
            PlaytestFlow · You're receiving this because you signed up as a tester.
            <br><a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://playtestflow.vercel.app'}" style="color:#ff6600;text-decoration:none">playtestflow.vercel.app</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return { subject, html }
}

export function buildFollowUpEmail({
  testerName,
  sessionTitle,
  feedbackUrl,
  designerName,
  rewardDescription,
}: {
  testerName: string
  sessionTitle: string
  feedbackUrl: string
  designerName: string
  rewardDescription?: string
}): { subject: string; html: string } {
  const subject = `Thanks for playtesting "${sessionTitle}" — quick feedback?`

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:32px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
        <tr><td style="padding:0 0 24px">
          <span style="font-weight:800;font-size:18px;color:#ff6600">🎲 PlaytestFlow</span>
        </td></tr>
        <tr><td style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px">
          <p style="margin:0 0 8px;font-size:28px">🙏</p>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#f0f6fc">Thanks for playtesting!</h1>
          <p style="margin:0 0 16px;font-size:15px;color:#8b949e">
            Hi ${testerName}, thanks for joining <strong style="color:#f0f6fc">"${sessionTitle}"</strong> hosted by ${designerName}.
            Your feedback helps indie designers make better games.
          </p>
          ${rewardDescription ? `<div style="background:rgba(255,102,0,0.1);border:1px solid rgba(255,102,0,0.2);border-radius:10px;padding:14px;margin:0 0 20px">
            <p style="margin:0;font-size:13px;color:#ff6600"><strong>🎁 Your reward:</strong> ${rewardDescription}</p>
          </div>` : ''}
          <p style="margin:0 0 20px;font-size:14px;color:#8b949e">
            It only takes 2 minutes — tell ${designerName} what worked, what was confusing, and what you'd change.
          </p>
          <a href="${feedbackUrl}" style="display:block;background:#ff6600;color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:12px;font-weight:700;font-size:15px">
            Leave Feedback →
          </a>
        </td></tr>
        <tr><td style="padding:20px 0 0;text-align:center">
          <p style="margin:0;font-size:11px;color:#8b949e">
            PlaytestFlow · <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://playtestflow.vercel.app'}" style="color:#ff6600;text-decoration:none">playtestflow.vercel.app</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return { subject, html }
}
