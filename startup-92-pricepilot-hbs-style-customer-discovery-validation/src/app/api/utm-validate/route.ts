/**
 * GET /api/utm-validate?url=<encoded-url>
 * Returns whether the supplied URL has all required UTM parameters.
 * Used by E2E tests to verify campaign links are properly tagged.
 *
 * GET /api/utm-validate
 * Returns the full list of pre-built campaign links from src/lib/utm.ts.
 */
import { NextResponse } from 'next/server'
import { CAMPAIGN_LINKS } from '@/lib/utm'

const REQUIRED_UTM = ['utm_source', 'utm_medium', 'utm_campaign'] as const

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const urlParam = searchParams.get('url')

  // If a URL to validate was provided, validate it
  if (urlParam) {
    let parsed: URL
    try {
      parsed = new URL(urlParam)
    } catch {
      return NextResponse.json({ valid: false, error: 'Invalid URL' }, { status: 400 })
    }

    const missing: string[] = []
    const present: Record<string, string> = {}

    for (const key of REQUIRED_UTM) {
      const val = parsed.searchParams.get(key)
      if (!val) {
        missing.push(key)
      } else {
        present[key] = val
      }
    }

    const content = parsed.searchParams.get('utm_content') || null
    const term    = parsed.searchParams.get('utm_term') || null

    return NextResponse.json({
      valid: missing.length === 0,
      url: urlParam,
      present,
      missing,
      ...(content && { utm_content: content }),
      ...(term    && { utm_term: term }),
    })
  }

  // Otherwise return all campaign links for inspection
  return NextResponse.json({
    total: Object.keys(CAMPAIGN_LINKS).length,
    links: CAMPAIGN_LINKS,
  })
}
