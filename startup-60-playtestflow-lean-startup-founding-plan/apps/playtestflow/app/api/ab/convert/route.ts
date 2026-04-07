import { NextRequest, NextResponse } from 'next/server'
import { recordConversion, getABTests } from '@/lib/ab'

/**
 * POST /api/ab/convert
 * Record a conversion event for a visitor on a test.
 * Body: { visitor_id, test_name }
 */
export async function POST(request: NextRequest) {
  const { visitor_id, test_name } = await request.json().catch(() => ({}))

  if (!visitor_id || !test_name) {
    return NextResponse.json({ error: 'visitor_id and test_name required' }, { status: 400 })
  }

  const tests = await getABTests()
  const test = tests.find(t => t.testName === test_name)
  if (!test) {
    return NextResponse.json({ error: `test "${test_name}" not found` }, { status: 404 })
  }

  await recordConversion({ testId: test.id, visitorId: visitor_id })

  return NextResponse.json({ ok: true, test_name, visitor_id })
}
