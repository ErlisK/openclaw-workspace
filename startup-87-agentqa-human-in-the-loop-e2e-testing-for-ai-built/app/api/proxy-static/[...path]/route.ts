import { NextRequest, NextResponse } from 'next/server'
import { validateProxyUrl } from '@/lib/proxy-security'

/**
 * GET /api/proxy-static/:sessionId/:protocol/:host/...assetPath
 *
 * A path-based asset proxy that supports webpack public-path concatenation.
 * When webpack does `publicPath + chunkRelativePath`, string concatenation
 * produces a valid URL like:
 *   /api/proxy-static/SESSION/https/example.com/_next/static/chunks/foo.js
 *
 * This handler reconstructs the target as `https://example.com/_next/static/chunks/foo.js`
 * and proxies it with the correct Content-Type.
 */

const MAX_SIZE = 5 * 1024 * 1024

function inferMimeType(urlStr: string, upstream: string): string {
  const ct = upstream.toLowerCase()
  if (ct && !ct.startsWith('text/plain') && !ct.startsWith('application/octet-stream')) {
    return upstream
  }
  try {
    const { pathname } = new URL(urlStr)
    const ext = pathname.split('.').pop()?.toLowerCase() ?? ''
    const map: Record<string, string> = {
      js: 'application/javascript; charset=utf-8',
      mjs: 'application/javascript; charset=utf-8',
      css: 'text/css; charset=utf-8',
      json: 'application/json; charset=utf-8',
      svg: 'image/svg+xml',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      woff: 'font/woff',
      woff2: 'font/woff2',
      ttf: 'font/ttf',
      ico: 'image/x-icon',
    }
    if (ext && map[ext]) return map[ext]
  } catch { /* ignore */ }
  return upstream || 'application/octet-stream'
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  // path[0] = sessionId, path[1] = protocol (https/http), path[2] = host, path[3..] = asset path
  if (!path || path.length < 3) {
    return new NextResponse('Bad Request', { status: 400 })
  }

  const [_sessionId, protocol, host, ...rest] = path
  if (protocol !== 'https' && protocol !== 'http') {
    return new NextResponse('Invalid protocol', { status: 400 })
  }

  const assetPath = rest.join('/')
  const targetUrl = `${protocol}://${host}/${assetPath}`

  const urlCheck = await validateProxyUrl(targetUrl)
  if (!urlCheck.ok) {
    return new NextResponse(urlCheck.reason, { status: urlCheck.status })
  }

  let upstreamRes: Response
  try {
    upstreamRes = await fetch(urlCheck.url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'BetaWindow-Proxy/1.0 (testing-platform)',
        Accept: '*/*',
      },
      redirect: 'follow',
    })
  } catch {
    return new NextResponse('Upstream fetch failed', { status: 502 })
  }

  const upstreamCT = upstreamRes.headers.get('content-type') ?? ''
  const correctedType = inferMimeType(targetUrl, upstreamCT)
  const isJavascript = correctedType.includes('javascript')

  const respHeaders = new Headers()
  respHeaders.set('content-type', correctedType)
  respHeaders.set('cache-control', 'public, max-age=300')
  respHeaders.set('access-control-allow-origin', '*')

  // For JS: also rewrite any nested webpack public paths
  if (isJavascript) {
    const text = await upstreamRes.text()
    if (text.length > MAX_SIZE) return new NextResponse('Too large', { status: 413 })

    const reqUrl = new URL(req.url)
    const proxyStaticBase = `${reqUrl.origin}/api/proxy-static`
    const sessionId = _sessionId
    const targetOrigin = `${protocol}://${host}`

    // Rewrite webpack public path: __webpack_require__.p = "/_next/" → path-based proxy
    const patchedJs = text.replace(
      /(\b__webpack_require__\.p\s*=\s*)("(\/[^"]+)"|'(\/[^']+)')/g,
      (_m, prefix, _quoted, dq, sq) => {
        const assetBase = dq ?? sq  // e.g. "/_next/"
        // Build: /api/proxy-static/SESSION/https/host/_next/
        const proxied = `${proxyStaticBase}/${sessionId}/${protocol}/${host}${assetBase}`
        return `${prefix}"${proxied}"`
      }
    )
    return new NextResponse(patchedJs, { status: upstreamRes.status, headers: respHeaders })
  }

  const body = await upstreamRes.arrayBuffer()
  if (body.byteLength > MAX_SIZE) return new NextResponse('Too large', { status: 413 })

  return new NextResponse(body, { status: upstreamRes.status, headers: respHeaders })
}
