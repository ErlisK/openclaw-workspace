/**
 * GET /api/structured-data/validate
 * Fetches each key page and verifies JSON-LD structured data is present and valid.
 * Returns a report of which pages have valid schemas and which are missing.
 */
import { NextResponse } from 'next/server'

const BASE_URL = 'https://startup-92-pricepilot-hbs-style-cus.vercel.app'

const EXPECTED_SCHEMAS: Record<string, string[]> = {
  '/':                                              ['Organization', 'WebSite', 'SoftwareApplication'],
  '/pricing':                                       ['SoftwareApplication'],
  '/calculator':                                    ['WebApplication'],
  '/blog/building-the-bayesian-pricing-engine':     ['Article'],
  '/blog/building-pricepilot-product-intro':        ['Article'],
  '/guides/micro-seller-pricing-experiments':       ['Article'],
  '/guides/gumroad-pricing-updates-and-churn-risk': ['Article'],
  '/guides/stripe-price-testing-without-code':      ['Article'],
  '/guides/cohort-aware-simulations-explained':     ['Article'],
}

function extractJsonLd(html: string): Array<Record<string, unknown>> {
  const matches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) ?? []
  const results: Array<Record<string, unknown>> = []
  for (const match of matches) {
    const inner = match.replace(/<script[^>]*>/, '').replace('</script>', '')
    try {
      results.push(JSON.parse(inner))
    } catch { /* skip malformed */ }
  }
  return results
}

export async function GET() {
  const report: Array<{
    path: string
    status: number
    schemas_found: string[]
    schemas_expected: string[]
    missing: string[]
    pass: boolean
  }> = []

  const checks = Object.entries(EXPECTED_SCHEMAS)

  for (const [path, expected] of checks) {
    let status = 0
    let schemasFound: string[] = []
    let missing: string[] = []

    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        headers: { 'User-Agent': 'PricePilot-StructuredData-Validator/1.0' },
        next: { revalidate: 0 },
      })
      status = res.status

      if (res.ok) {
        const html = await res.text()
        const schemas = extractJsonLd(html)
        schemasFound = schemas.map(s => String(s['@type'] ?? '?'))
        missing = expected.filter(e => !schemasFound.includes(e))
      } else {
        missing = [...expected]
      }
    } catch {
      status = 0
      missing = [...expected]
    }

    report.push({
      path,
      status,
      schemas_found: schemasFound,
      schemas_expected: expected,
      missing,
      pass: missing.length === 0 && status === 200,
    })
  }

  const totalPass = report.filter(r => r.pass).length
  const totalFail = report.filter(r => !r.pass).length

  return NextResponse.json({
    total: report.length,
    passing: totalPass,
    failing: totalFail,
    all_pass: totalFail === 0,
    report,
  })
}
