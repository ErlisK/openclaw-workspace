/**
 * proxy-router.ts — Playwright helper: route ALL target-app URLs through BetaWindow proxy
 *
 * When Playwright acts as the "tester's browser", any navigation to the target
 * app URL (direct, iframe, or fetch) should be intercepted and re-routed through
 * /api/proxy?url=...&session=<id> so that:
 *   - The betawindow-logger script is always injected
 *   - Network + console events are captured
 *   - X-Frame-Options / CSP are stripped so the iframe can render
 *
 * Usage:
 *   import { enableProxyRouting } from './helpers/proxy-router'
 *   await enableProxyRouting(page, 'https://target-app.com', sessionId, BASE_URL)
 */

import { Page, BrowserContext } from '@playwright/test'

const DEFAULT_BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

/**
 * Install a page.route() interceptor that catches all navigation requests to
 * `targetOrigin` (and sub-paths) that are NOT already going through the proxy,
 * and rewrites them to go through /api/proxy?url=...&session=<sessionId>.
 *
 * Works for:
 *  - Main-frame navigations
 *  - Sub-frame (iframe) navigations
 *  - Fetch/XHR requests to the target origin
 *
 * @param page       Playwright Page
 * @param targetUrl  The target app's base URL (e.g. "https://snippetci.com")
 * @param sessionId  BetaWindow session ID for event capture
 * @param proxyBase  BetaWindow deployment base URL (default: process.env.BASE_URL)
 */
export async function enableProxyRouting(
  page: Page,
  targetUrl: string,
  sessionId: string,
  proxyBase: string = DEFAULT_BASE_URL,
): Promise<void> {
  let targetOrigin: string
  try {
    targetOrigin = new URL(targetUrl).origin
  } catch {
    console.warn('[proxy-router] Invalid targetUrl:', targetUrl)
    return
  }

  // Do not intercept if target is same origin as proxy (e.g. /playground/target)
  const proxyOrigin = new URL(proxyBase).origin
  if (targetOrigin === proxyOrigin) {
    return
  }

  // Intercept all requests to the target origin
  await page.route(`${targetOrigin}/**`, async (route) => {
    const reqUrl = route.request().url()
    const resourceType = route.request().resourceType()

    // Already proxied? Pass through.
    if (
      reqUrl.includes('/api/proxy?url=') ||
      reqUrl.includes('/api/proxy-static/')
    ) {
      await route.continue()
      return
    }

    // For navigation requests (main-frame and sub-frame), redirect through proxy
    if (resourceType === 'document') {
      const proxiedUrl = `${proxyBase}/api/proxy?url=${encodeURIComponent(reqUrl)}&session=${encodeURIComponent(sessionId)}`
      await route.continue({ url: proxiedUrl })
      return
    }

    // For sub-resources (JS, CSS, images), route through proxy-static
    const parsedTarget = new URL(reqUrl)
    const proxiedStaticUrl =
      `${proxyBase}/api/proxy-static/${encodeURIComponent(sessionId)}` +
      `/${parsedTarget.protocol.replace(':', '')}` +
      `/${parsedTarget.host}` +
      parsedTarget.pathname +
      parsedTarget.search
    await route.continue({ url: proxiedStaticUrl })
  })
}

/**
 * Install proxy routing on an entire BrowserContext (affects all pages and iframes).
 *
 * Use this variant when you need to ensure every tab/frame in the context routes
 * through the proxy, not just a single page.
 */
export async function enableProxyRoutingOnContext(
  context: BrowserContext,
  targetUrl: string,
  sessionId: string,
  proxyBase: string = DEFAULT_BASE_URL,
): Promise<void> {
  let targetOrigin: string
  try {
    targetOrigin = new URL(targetUrl).origin
  } catch {
    console.warn('[proxy-router] Invalid targetUrl:', targetUrl)
    return
  }

  const proxyOrigin = new URL(proxyBase).origin
  if (targetOrigin === proxyOrigin) return

  await context.route(`${targetOrigin}/**`, async (route) => {
    const reqUrl = route.request().url()
    const resourceType = route.request().resourceType()

    if (
      reqUrl.includes('/api/proxy?url=') ||
      reqUrl.includes('/api/proxy-static/')
    ) {
      await route.continue()
      return
    }

    if (resourceType === 'document') {
      const proxiedUrl = `${proxyBase}/api/proxy?url=${encodeURIComponent(reqUrl)}&session=${encodeURIComponent(sessionId)}`
      await route.continue({ url: proxiedUrl })
      return
    }

    const parsedTarget = new URL(reqUrl)
    const proxiedStaticUrl =
      `${proxyBase}/api/proxy-static/${encodeURIComponent(sessionId)}` +
      `/${parsedTarget.protocol.replace(':', '')}` +
      `/${parsedTarget.host}` +
      parsedTarget.pathname +
      parsedTarget.search
    await route.continue({ url: proxiedStaticUrl })
  })
}

/**
 * Assert that a given URL is a proxy URL (goes through /api/proxy).
 * Use in tests to verify navigation goes through the proxy.
 */
export function isProxiedUrl(urlStr: string, proxyBase: string = DEFAULT_BASE_URL): boolean {
  try {
    const u = new URL(urlStr)
    const pb = new URL(proxyBase)
    return (
      u.origin === pb.origin &&
      (u.pathname === '/api/proxy' || u.pathname.startsWith('/api/proxy-static/'))
    )
  } catch {
    return false
  }
}

/**
 * Convert a target URL to a proxy URL.
 */
export function toProxyUrl(
  targetUrl: string,
  sessionId: string,
  proxyBase: string = DEFAULT_BASE_URL,
): string {
  return `${proxyBase}/api/proxy?url=${encodeURIComponent(targetUrl)}&session=${encodeURIComponent(sessionId)}`
}
