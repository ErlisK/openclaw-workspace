/**
 * lib/ab.ts — A/B test variant assignment and conversion tracking
 *
 * Deterministic hash-based assignment:
 * variant = sha256(visitorId + testName)[0] % 2 → 'a' or 'b'
 *
 * This guarantees:
 * - Same visitor always gets same variant (no cookie needed server-side)
 * - Even 50/50 distribution across large populations
 * - No state needed at assignment time
 */

import { createServiceClient } from './supabase-server'

export type ABVariant = 'a' | 'b'

// ── Active test definitions ─────────────────────────────────────────────────

export interface ABTest {
  id: string
  testName: string
  variantA: string
  variantB: string
  metric: string
  description: string
}

/** Returns the variant label for a given test */
export function getVariantLabel(test: ABTest, variant: ABVariant): string {
  return variant === 'a' ? test.variantA : test.variantB
}

/**
 * Deterministic variant assignment.
 * Uses a simple hash of visitorId + testName to assign 50/50.
 */
export function assignVariant(visitorId: string, testName: string): ABVariant {
  let hash = 0
  const str = `${visitorId}::${testName}`
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % 2 === 0 ? 'a' : 'b'
}

/**
 * Get visitor ID from cookie or generate a new one.
 * Call this from client components.
 */
export function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return `ssr_${Date.now()}`
  const KEY = 'ptf_vid'
  let vid = localStorage.getItem(KEY)
  if (!vid) {
    vid = `vis_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    localStorage.setItem(KEY, vid)
  }
  return vid
}

/**
 * Server-side: record an A/B assignment.
 * Non-throwing.
 */
export async function recordAssignment({
  testId,
  visitorId,
  variant,
  sessionId,
  designerId,
}: {
  testId: string
  visitorId: string
  variant: ABVariant
  sessionId?: string
  designerId?: string
}): Promise<void> {
  try {
    const svc = createServiceClient()
    await svc
      .from('ab_assignments')
      .insert({
        test_id: testId,
        visitor_id: visitorId,
        variant,
        session_id: sessionId ?? null,
        designer_id: designerId ?? null,
        converted: false,
      })
  } catch (err) {
    console.error('[ab] recordAssignment error:', err)
  }
}

/**
 * Server-side: mark conversion for a visitor on a test.
 * Non-throwing. Updates the most recent unconverted assignment.
 */
export async function recordConversion({
  testId,
  visitorId,
}: {
  testId: string
  visitorId: string
}): Promise<void> {
  try {
    const svc = createServiceClient()
    // Find the most recent un-converted assignment for this visitor+test
    const { data: assignment } = await svc
      .from('ab_assignments')
      .select('id')
      .eq('test_id', testId)
      .eq('visitor_id', visitorId)
      .eq('converted', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!assignment) return

    await svc
      .from('ab_assignments')
      .update({ converted: true, converted_at: new Date().toISOString() })
      .eq('id', assignment.id)
  } catch (err) {
    console.error('[ab] recordConversion error:', err)
  }
}

/**
 * Fetch all active A/B tests from the database.
 */
export async function getABTests(): Promise<ABTest[]> {
  const svc = createServiceClient()
  const { data } = await svc
    .from('ab_tests')
    .select('id, test_name, variant_a, variant_b, metric')
    .order('created_at', { ascending: true })

  return (data ?? []).map((t: any) => ({
    id: t.id,
    testName: t.test_name,
    variantA: t.variant_a,
    variantB: t.variant_b,
    metric: t.metric,
    description: t.test_name.replace(/_/g, ' '),
  }))
}

/**
 * Compute A/B test results with z-test statistics.
 */
export interface ABTestResult {
  testId: string
  testName: string
  variantA: { label: string; n: number; conversions: number; rate: number }
  variantB: { label: string; n: number; conversions: number; rate: number }
  diffPp: number          // percentage points difference (B - A)
  relativeLift: number    // % lift of B over A
  zScore: number
  pValue: number
  ci95: { lo: number; hi: number }
  winner: 'a' | 'b' | 'tie'
  significant: boolean    // p < 0.05
  confidence: number      // (1 - p_value) * 100
  sampleSize: number      // total
  minNFor80pct: number    // min n per variant for 80% power at 5pp MDE
}

export async function getABTestResults(): Promise<ABTestResult[]> {
  const svc = createServiceClient()

  const { data: tests } = await svc
    .from('ab_tests')
    .select('id, test_name, variant_a, variant_b, metric')
    .order('created_at', { ascending: true })

  const { data: assignments } = await svc
    .from('ab_assignments')
    .select('test_id, variant, converted')

  if (!tests || !assignments) return []

  const byTest: Record<string, { a: { n: number; conv: number }; b: { n: number; conv: number } }> = {}
  for (const a of assignments) {
    if (!byTest[a.test_id]) byTest[a.test_id] = { a: { n: 0, conv: 0 }, b: { n: 0, conv: 0 } }
    byTest[a.test_id][a.variant as ABVariant].n++
    if (a.converted) byTest[a.test_id][a.variant as ABVariant].conv++
  }

  return tests.map((t: any) => {
    const d = byTest[t.id] ?? { a: { n: 0, conv: 0 }, b: { n: 0, conv: 0 } }
    return computeStats(t, d)
  })
}

function computeStats(
  t: { id: string; test_name: string; variant_a: string; variant_b: string },
  d: { a: { n: number; conv: number }; b: { n: number; conv: number } }
): ABTestResult {
  const { n: n_a, conv: conv_a } = d.a
  const { n: n_b, conv: conv_b } = d.b

  const p_a = n_a > 0 ? conv_a / n_a : 0
  const p_b = n_b > 0 ? conv_b / n_b : 0
  const p_pool = (n_a + n_b) > 0 ? (conv_a + conv_b) / (n_a + n_b) : 0
  const se = Math.sqrt(p_pool * (1 - p_pool) * (1 / Math.max(n_a, 1) + 1 / Math.max(n_b, 1)))
  const z = se > 0 ? (p_b - p_a) / se : 0

  // Two-tailed p-value (erfc approximation)
  const pValue = Math.min(1, 2 * (1 - normalCDF(Math.abs(z))))
  const diffPp = (p_b - p_a) * 100
  const margin = 1.96 * Math.sqrt(p_a * (1 - p_a) / Math.max(n_a, 1) + p_b * (1 - p_b) / Math.max(n_b, 1))

  // Minimum sample size for 80% power at 5pp MDE
  const p_avg = (p_a + (p_a + 0.05)) / 2
  const minN = se > 0 ? Math.ceil(
    Math.pow(1.96 * Math.sqrt(2 * p_avg * (1 - p_avg)) + 0.842 * Math.sqrt(p_a * (1 - p_a) + (p_a + 0.05) * (1 - p_a - 0.05)), 2) /
    Math.pow(0.05, 2)
  ) : 0

  return {
    testId: t.id,
    testName: t.test_name,
    variantA: { label: t.variant_a, n: n_a, conversions: conv_a, rate: Math.round(p_a * 10000) / 100 },
    variantB: { label: t.variant_b, n: n_b, conversions: conv_b, rate: Math.round(p_b * 10000) / 100 },
    diffPp: Math.round(diffPp * 100) / 100,
    relativeLift: p_a > 0 ? Math.round(((p_b - p_a) / p_a) * 1000) / 10 : 0,
    zScore: Math.round(z * 1000) / 1000,
    pValue: Math.round(pValue * 10000) / 10000,
    ci95: {
      lo: Math.round((diffPp - margin * 100) * 100) / 100,
      hi: Math.round((diffPp + margin * 100) * 100) / 100,
    },
    winner: Math.abs(z) < 0.1 ? 'tie' : p_b > p_a ? 'b' : 'a',
    significant: pValue < 0.05,
    confidence: Math.round((1 - pValue) * 1000) / 10,
    sampleSize: n_a + n_b,
    minNFor80pct: minN,
  }
}

function normalCDF(z: number): number {
  // Abramowitz & Stegun approximation
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989423 * Math.exp(-z * z / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))))
  return z > 0 ? 1 - p : p
}
