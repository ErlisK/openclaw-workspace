/**
 * Fires an optional webhook_url stored on a test job when its status changes.
 * Best-effort: errors are swallowed and never block the main response path.
 */

export interface WebhookPayload {
  event: 'job.assigned' | 'job.complete' | 'job.expired' | 'job.cancelled'
  job_id: string
  status: string
  timestamp: string
  [key: string]: unknown
}

/**
 * POST the payload to webhook_url with a 10-second timeout.
 * Silently fails on any error.
 */
export async function fireWebhook(webhookUrl: string, payload: WebhookPayload): Promise<void> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'BetaWindow/1.0' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    clearTimeout(timeout)
  } catch {
    // best-effort — never throw
  }
}
