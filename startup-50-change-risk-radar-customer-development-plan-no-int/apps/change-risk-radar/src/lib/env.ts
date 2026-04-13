/**
 * Environment utilities for Change Risk Radar.
 * Safe runtime access to Vercel / Node environment variables.
 */

/** Vercel deployment environment: 'production' | 'preview' | 'development' */
export const VERCEL_ENV: string =
  process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development';

/** True only in Vercel production deployments */
export const isProduction: boolean = VERCEL_ENV === 'production';

/** Allowed Slack webhook host — enforced only in production */
export const SLACK_WEBHOOK_HOST = 'hooks.slack.com';

/** Git SHA for diagnostics */
export const GIT_SHA: string = process.env.VERCEL_GIT_COMMIT_SHA ?? 'unknown';

/**
 * Validate a webhook URL for outbound use.
 * - Must be https
 * - In production: only hooks.slack.com is allowed
 * - In preview / development: any https host is allowed for testing
 */
export function validateWebhookUrl(
  url: string,
): { ok: true } | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: 'Invalid URL format' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'Webhook URL must use HTTPS' };
  }

  if (isProduction && parsed.hostname !== SLACK_WEBHOOK_HOST) {
    return {
      ok: false,
      error: `In production, webhook URL host must be ${SLACK_WEBHOOK_HOST}`,
    };
  }

  return { ok: true };
}
