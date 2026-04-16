/**
 * Subdomain-based proxy encoding/decoding.
 *
 * Transforms target hostnames into safe subdomain labels and back.
 * Algorithm (same as Google AMP Cache):
 *   - Existing hyphens in hostname → double hyphens (--)
 *   - Dots → single hyphens (-)
 *
 * Examples:
 *   snippetci.com        → snippetci-com
 *   my-app.vercel.app    → my--app-vercel-app
 *   sub.domain.example.com → sub-domain-example-com
 */

/** The proxy subdomain suffix (without leading dot). */
export const PROXY_SUBDOMAIN_SUFFIX = 'proxy.localhost'

/** Encode a hostname for use as a subdomain label. */
export function encodeProxySubdomain(hostname: string): string {
  return hostname
    .replace(/-/g, '--')   // escape existing hyphens first
    .replace(/\./g, '-')   // dots → single hyphen
}

/** Decode a subdomain label back to the original hostname. */
export function decodeProxySubdomain(subdomain: string): string {
  // Strategy: replace single hyphens (not preceded/followed by hyphen) with dots,
  // then replace double hyphens with single hyphens.
  // We use a two-pass approach with a placeholder to avoid ambiguity.
  const placeholder = '\x00'
  return subdomain
    .replace(/--/g, placeholder)  // protect double hyphens
    .replace(/-/g, '.')           // single hyphens → dots
    .replace(new RegExp(placeholder, 'g'), '-')  // restore double hyphens as single
}

/**
 * Build the full proxy URL for a target URL.
 * In dev:  http://snippetci-com.proxy.localhost:3000/path
 * In prod: https://snippetci-com.proxy.betawindow.com/path
 */
export function buildProxyUrl(targetUrl: string, sessionId: string, proxyHost?: string): string {
  const parsed = new URL(targetUrl)
  const encodedHost = encodeProxySubdomain(parsed.hostname)
  const suffix = proxyHost ?? PROXY_SUBDOMAIN_SUFFIX

  // Use the target's protocol and the proxy subdomain
  const protocol = parsed.protocol // 'https:' or 'http:'
  const port = parsed.port ? `:${parsed.port}` : ''

  // In development, the proxy subdomain resolves on the dev server's port
  const proxyOrigin = `${protocol}//${encodedHost}.${suffix}`
  const path = parsed.pathname + parsed.search + parsed.hash

  // Pass session ID as a query parameter (won't collide with target params
  // because it uses a unique prefix)
  const separator = parsed.search ? '&' : '?'
  return `${proxyOrigin}${path}${separator}_bw_session=${encodeURIComponent(sessionId)}`
}

/**
 * Extract the target hostname and session from a proxy subdomain request.
 * Returns null if the request is not a proxy subdomain request.
 */
export function parseProxyRequest(
  hostname: string,
  proxySuffix?: string
): { targetHost: string; proxySubdomain: string } | null {
  const suffix = proxySuffix ?? PROXY_SUBDOMAIN_SUFFIX
  // hostname might include port (e.g., "snippetci-com.proxy.localhost:3000")
  const hostOnly = hostname.split(':')[0]

  if (!hostOnly.endsWith(`.${suffix}`)) return null

  const proxySubdomain = hostOnly.slice(0, -(suffix.length + 1)) // strip ".proxy.localhost"
  if (!proxySubdomain) return null

  const targetHost = decodeProxySubdomain(proxySubdomain)
  return { targetHost, proxySubdomain }
}

/**
 * Get the proxy suffix for the current environment.
 * In dev: 'proxy.localhost' (browsers resolve *.localhost to 127.0.0.1)
 * In prod: configured via NEXT_PUBLIC_PROXY_DOMAIN env var or default
 */
export function getProxySuffix(): string {
  return process.env.NEXT_PUBLIC_PROXY_DOMAIN ?? PROXY_SUBDOMAIN_SUFFIX
}
