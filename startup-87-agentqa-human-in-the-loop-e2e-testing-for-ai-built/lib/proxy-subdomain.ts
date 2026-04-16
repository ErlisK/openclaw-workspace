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

const PROXY_PREFIX = 'proxy'

/** Encode a hostname for use as a subdomain label. */
export function encodeProxySubdomain(hostname: string): string {
  return hostname
    .replace(/-/g, '--')   // escape existing hyphens first
    .replace(/\./g, '-')   // dots → single hyphen
}

/** Decode a subdomain label back to the original hostname. */
export function decodeProxySubdomain(subdomain: string): string {
  const placeholder = '\x00'
  return subdomain
    .replace(/--/g, placeholder)  // protect double hyphens
    .replace(/-/g, '.')           // single hyphens → dots
    .replace(new RegExp(placeholder, 'g'), '-')  // restore double hyphens as single
}

/**
 * Derive the proxy suffix dynamically from the app's hostname.
 *
 * If the app runs at `betawindow.com`, the suffix is `proxy.betawindow.com`.
 * If the app runs at `localhost`, the suffix is `proxy.localhost`.
 * If the app runs at `my-app.vercel.app`, the suffix is `proxy.my-app.vercel.app`.
 *
 * Can be overridden with the NEXT_PUBLIC_PROXY_DOMAIN env var.
 *
 * @param appHostname - The app's hostname (e.g. from `window.location.hostname` or request Host header).
 *                      If omitted on the client, uses window.location.hostname.
 */
export function getProxySuffix(appHostname?: string): string {
  // Allow explicit override via env var
  if (process.env.NEXT_PUBLIC_PROXY_DOMAIN) {
    return process.env.NEXT_PUBLIC_PROXY_DOMAIN
  }

  // Derive from the provided hostname or window.location
  let host = appHostname
  if (!host && typeof window !== 'undefined') {
    host = window.location.hostname
  }
  if (!host) return `${PROXY_PREFIX}.localhost`

  return `${PROXY_PREFIX}.${host}`
}

/**
 * Parse a request hostname to check if it's a proxy subdomain request.
 * Detects the pattern: `<encoded-target>.proxy.<app-domain>`
 *
 * @param hostname - Full hostname from the request (may include port)
 * @param appHostname - The app's own hostname for comparison
 */
export function parseProxyRequest(
  hostname: string,
  appHostname?: string
): { targetHost: string; proxySubdomain: string } | null {
  const hostOnly = hostname.split(':')[0]

  // Determine the suffix to look for
  const suffix = getProxySuffix(appHostname)

  if (!hostOnly.endsWith(`.${suffix}`)) return null

  const proxySubdomain = hostOnly.slice(0, -(suffix.length + 1))
  if (!proxySubdomain) return null

  const targetHost = decodeProxySubdomain(proxySubdomain)
  return { targetHost, proxySubdomain }
}

/**
 * Get the app's own hostname from a request Host header.
 * Strips port and any proxy subdomain prefix to get the base app domain.
 *
 * For `snippetci-com.proxy.betawindow.com` → `betawindow.com`
 * For `betawindow.com` → `betawindow.com`
 * For `localhost:3000` → `localhost`
 */
export function extractAppHostname(requestHost: string): string {
  const hostOnly = requestHost.split(':')[0]

  // Check if this IS a proxy subdomain request — if so, extract the app domain
  // Pattern: <encoded>.proxy.<app-domain>
  const proxyIdx = hostOnly.indexOf(`.${PROXY_PREFIX}.`)
  if (proxyIdx !== -1) {
    return hostOnly.slice(proxyIdx + `.${PROXY_PREFIX}.`.length)
  }

  return hostOnly
}
