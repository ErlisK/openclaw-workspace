/**
 * Returns the canonical base URL for the app, trimmed of whitespace and trailing slashes.
 * Falls back to window.location.origin on the client side when env var is missing.
 */
export function getBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (typeof window !== 'undefined' ? window.location.origin : 'https://teachrepo.com');

  return raw.trim().replace(/\/+$/, '');
}
