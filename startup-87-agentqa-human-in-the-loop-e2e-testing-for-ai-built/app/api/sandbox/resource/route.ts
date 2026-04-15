/**
 * GET /api/sandbox/resource?u=<url>&session=<sessionId>
 * Proxy for static resources (CSS, JS, images) within sandboxed sessions.
 * Applies the same URL validation as the html endpoint.
 */
import { NextRequest, NextResponse } from 'next/server'
import { validateProxyUrl } from '@/lib/proxy-security'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB for resources

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const targetUrl = searchParams.get('u')

  const urlCheck = await validateProxyUrl(targetUrl)
  if (!urlCheck.ok) {
    return new NextResponse(urlCheck.reason, { status: urlCheck.status })
  }

  let res: Response
  try {
    res = await fetch(urlCheck.url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'AgentQA-Sandbox/1.0 (testing-platform)',
        Accept: '*/*',
      },
      redirect: 'follow',
    })
  } catch (err) {
    return new NextResponse(`Failed to fetch resource: ${String(err)}`, { status: 502 })
  }

  const contentType = res.headers.get('content-type') ?? 'application/octet-stream'
  const body = await res.arrayBuffer()

  if (body.byteLength > MAX_SIZE) {
    return new NextResponse('Resource too large', { status: 413 })
  }

  return new NextResponse(body, {
    status: res.status,
    headers: {
      'content-type': contentType,
      'cache-control': 'public, max-age=600',
      'x-frame-options': 'SAMEORIGIN',
    },
  })
}
