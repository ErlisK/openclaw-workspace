/**
 * e2e/fixtures/datagen.ts
 *
 * Playwright fixture helpers that call /api/demo-data (no auth required)
 * to get pre-seeded synthetic transaction datasets for E2E tests.
 *
 * Usage:
 *   import { getDemoData, getDemoSummary, DEMO_SCENARIO_KEYS } from './datagen'
 *
 *   const data = await getDemoData(request, 'indie_template_pack')
 *   expect(data.n_transactions).toBeGreaterThan(50)
 */

import { APIRequestContext } from '@playwright/test'

export const DEMO_SCENARIO_KEYS = [
  'indie_template_pack',
  'micro_saas_starter',
  'appsumo_deal',
  'ebook_launch_decay',
  'saas_seasonal',
  'volatile_consulting',
] as const

export type DemoScenarioKey = typeof DEMO_SCENARIO_KEYS[number]

export interface DemoDataSummary {
  scenario: string
  product_name: string
  n_transactions: number
  n_months: number
  pattern: string
  total_revenue: number
  avg_price: number
  refund_rate_pct: number
  spike_transactions: number
  by_channel: Record<string, number>
  by_coupon: Record<string, number>
  cohorts: Record<string, unknown>
  price_schedule: Array<{ price: number; starts_month: number }>
  available_scenarios: string[]
  seed: number
}

export interface DemoDataFull extends DemoDataSummary {
  transactions: Array<{
    platform: string
    platform_txn_id: string
    amount_cents: number
    currency: string
    is_refunded: boolean
    customer_key: string
    purchased_at: string
    is_spike_cohort: boolean
    metadata: Record<string, string>
  }>
}

const BASE_URL = process.env.BASE_URL ?? 'https://pricingsim.com'

export async function getDemoSummary(
  request: APIRequestContext,
  scenario: DemoScenarioKey = 'indie_template_pack',
  seed = 42,
): Promise<DemoDataSummary> {
  const resp = await request.get(`${BASE_URL}/api/demo-data?scenario=${scenario}&seed=${seed}&summary=true`)
  if (!resp.ok()) throw new Error(`/api/demo-data returned ${resp.status()}`)
  return resp.json()
}

export async function getDemoData(
  request: APIRequestContext,
  scenario: DemoScenarioKey = 'indie_template_pack',
  seed = 42,
): Promise<DemoDataFull> {
  const resp = await request.get(`${BASE_URL}/api/demo-data?scenario=${scenario}&seed=${seed}`)
  if (!resp.ok()) throw new Error(`/api/demo-data returned ${resp.status()}`)
  return resp.json()
}

/**
 * Validate that a demo dataset has the expected structural properties
 */
export function assertDemoDataShape(data: DemoDataFull) {
  if (!data.transactions || !Array.isArray(data.transactions)) {
    throw new Error('Missing transactions array')
  }
  if (data.n_transactions < 3) {
    throw new Error(`Too few transactions: ${data.n_transactions}`)
  }
  for (const txn of data.transactions.slice(0, 5)) {
    if (typeof txn.amount_cents !== 'number') throw new Error('Missing amount_cents')
    if (!txn.purchased_at) throw new Error('Missing purchased_at')
    if (!txn.customer_key) throw new Error('Missing customer_key')
  }
}

/**
 * Get the channel distribution from a full dataset (for verification)
 */
export function getChannelDistribution(data: DemoDataFull): Record<string, number> {
  const dist: Record<string, number> = {}
  for (const t of data.transactions) {
    const ch = t.metadata?.channel ?? 'unknown'
    dist[ch] = (dist[ch] ?? 0) + 1
  }
  return dist
}

/**
 * Get coupon usage stats from a full dataset
 */
export function getCouponStats(data: DemoDataFull): { total: number; withCoupon: number; couponPct: number } {
  const total = data.transactions.length
  const withCoupon = data.transactions.filter(t => t.metadata?.coupon && t.metadata.coupon !== 'none').length
  return { total, withCoupon, couponPct: total > 0 ? (withCoupon / total) * 100 : 0 }
}
