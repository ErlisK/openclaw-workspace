/**
 * Server-side PostHog event capture.
 * Called from API route handlers after core actions complete.
 * Uses the PostHog REST API directly (no browser required).
 *
 * Events tracked server-side:
 *   import_completed, timer_session, insights_viewed,
 *   upgrade_clicked, demo_data_loaded
 */

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? ''

function isConfigured(): boolean {
  return !!POSTHOG_KEY && !POSTHOG_KEY.startsWith('phc_placeholder')
}

export async function captureServerEvent(
  userId: string,
  event: string,
  properties: Record<string, unknown> = {}
): Promise<void> {
  if (!isConfigured()) return

  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event,
        distinct_id: userId,
        properties: {
          ...properties,
          $lib: 'posthog-node-server',
          environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
        },
        timestamp: new Date().toISOString(),
      }),
    })
  } catch {
    // PostHog capture is best-effort — never block the main flow
  }
}
