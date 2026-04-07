/**
 * Server-side analytics — Node.js only (posthog-node).
 * Import this ONLY from API routes, Server Actions, or server components.
 * Never import this in client components or pages.
 */

import { hashEmail } from './index'

export { hashEmail }

/**
 * Server-side event tracking via posthog-node.
 * - Safe to call from API routes and Server Actions.
 * - Never include raw PII — always hash emails before calling.
 * - No-op when POSTHOG_KEY is absent.
 */
export async function trackServer(
  event: string,
  props: Record<string, unknown> = {},
  distinctId = 'anonymous'
): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    console.debug('[analytics:server]', event, props)
  }

  const key = process.env.POSTHOG_KEY
  if (!key) return

  try {
    const { PostHog } = await import('posthog-node')
    const host =
      process.env.POSTHOG_HOST ||
      process.env.NEXT_PUBLIC_POSTHOG_HOST ||
      'https://app.posthog.com'

    const client = new PostHog(key, { host, flushAt: 1, flushInterval: 0 })
    client.capture({ distinctId, event, properties: props })
    await client.shutdown()
  } catch (err) {
    // Analytics must never crash the API route
    if (process.env.NODE_ENV === 'development') {
      console.error('[analytics:server] error', err)
    }
  }
}
