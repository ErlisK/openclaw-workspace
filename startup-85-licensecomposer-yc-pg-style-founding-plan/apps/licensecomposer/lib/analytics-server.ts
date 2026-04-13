/**
 * lib/analytics-server.ts
 * PostHog server-side event capture.
 * Used in Route Handlers for server-side events (generate, checkout, webhook).
 * Uses the HTTP API directly — no SDK needed server-side.
 */

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '';
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = Record<string, any>;

/**
 * Capture a server-side PostHog event.
 * Fire-and-forget (non-blocking).
 */
export async function serverTrack(
  event:        string,
  userId:       string | null,
  props:        Props = {},
): Promise<void> {
  if (!POSTHOG_KEY) return;

  const distinctId = userId ?? 'anonymous';

  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key:     POSTHOG_KEY,
        event,
        distinct_id: distinctId,
        properties:  { ...props, $lib: 'posthog-node/server' },
        timestamp:   new Date().toISOString(),
      }),
      // Non-blocking - don't await response or throw
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // Analytics must never break product
  }
}
