import { NextRequest, NextResponse } from 'next/server'
import { assignVariant, recordAssignment, recordConversion, getABTests, type ABVariant } from '@/lib/ab'

/**
 * POST /api/ab/assign
 * Assign a visitor to a variant and record it.
 * Body: { visitor_id, test_name, session_id? }
 * Returns: { variant: 'a' | 'b', label: string }
 */
export async function POST(request: NextRequest) {
  const { visitor_id, test_name, session_id } = await request.json().catch(() => ({}))

  if (!visitor_id || !test_name) {
    return NextResponse.json({ error: 'visitor_id and test_name required' }, { status: 400 })
  }

  const tests = await getABTests()
  const test = tests.find(t => t.testName === test_name)
  if (!test) {
    return NextResponse.json({ error: `test "${test_name}" not found` }, { status: 404 })
  }

  const variant = assignVariant(visitor_id, test_name)
  const label = variant === 'a' ? test.variantA : test.variantB

  // Record assignment (non-blocking)
  recordAssignment({
    testId: test.id,
    visitorId: visitor_id,
    variant,
    sessionId: session_id,
  }).catch(() => {})

  return NextResponse.json({ variant, label, test_id: test.id })
}
