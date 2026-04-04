/**
 * AgentMail transactional email helper (server-side only).
 * NEVER import this in client components — it reads server env vars.
 *
 * AgentMail API:
 *   POST /v0/inboxes/{encoded_inbox_id}/messages/send
 *   Authorization: Bearer <AGENTMAIL_API_KEY>
 *   Response: { message_id, thread_id }
 */

const AGENTMAIL_BASE_URL =
  process.env.AGENTMAIL_BASE_URL ?? 'https://api.agentmail.to/v0'

/** The inbox we send from — URL-encode the @ for path segments */
const AGENTMAIL_INBOX = 'hello-kidcoloring@agentmail.to'
const INBOX_ENCODED = encodeURIComponent(AGENTMAIL_INBOX)

export interface SendEmailParams {
  to: string
  subject: string
  html: string
  text: string
  /** Logical template name stored in email_sends for analytics */
  template: string
  meta?: Record<string, unknown>
}

export interface SendEmailResult {
  status: 'sent' | 'failed' | 'skipped'
  /** AgentMail message_id on success */
  responseId?: string
  error?: string
}

/**
 * Send a transactional email via AgentMail.
 *
 * - Returns { status: 'skipped' } if AGENTMAIL_API_KEY is not set (does not throw).
 * - Returns { status: 'failed', error } on non-2xx or network error (does not throw).
 * - Returns { status: 'sent', responseId } on success.
 */
export async function sendTransactionalEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  const apiKey = process.env.AGENTMAIL_API_KEY

  if (!apiKey) {
    console.warn('[agentmail] AGENTMAIL_API_KEY not set — skipping send')
    return { status: 'skipped', error: 'AGENTMAIL_API_KEY not configured' }
  }

  const sendUrl = `${AGENTMAIL_BASE_URL}/inboxes/${INBOX_ENCODED}/messages/send`

  try {
    const res = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error(`[agentmail] Send failed ${res.status}:`, errText)
      return {
        status: 'failed',
        error: `HTTP ${res.status}: ${errText.slice(0, 500)}`,
      }
    }

    const data = (await res.json()) as {
      message_id?: string
      thread_id?: string
    }

    console.log(
      `[agentmail] Sent to ${params.to} | message_id=${data.message_id}`
    )
    return { status: 'sent', responseId: data.message_id }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[agentmail] Network error:', msg)
    return { status: 'failed', error: msg }
  }
}
