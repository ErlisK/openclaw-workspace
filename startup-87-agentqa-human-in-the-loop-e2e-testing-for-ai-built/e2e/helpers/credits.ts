/**
 * e2e/helpers/credits.ts
 *
 * Shared helpers for credit operations in E2E tests.
 * Uses /api/test/credit-topup instead of direct Supabase service-role calls,
 * so the service role key is never needed in test environments.
 */
import type { APIRequestContext } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const BYPASS = process.env.VERCEL_BYPASS_TOKEN || ''
const E2E_SECRET = process.env.E2E_TEST_SECRET || ''

function url(path: string) {
  const u = `${BASE_URL}${path}`
  return BYPASS ? `${u}${u.includes('?') ? '&' : '?'}x-vercel-protection-bypass=${BYPASS}` : u
}

function testHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (BYPASS) h['Cookie'] = `x-vercel-protection-bypass=${BYPASS}`
  if (E2E_SECRET) h['x-e2e-secret'] = E2E_SECRET
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

interface TopUpResult {
  ok: boolean
  balance: number
  held: number
  available: number
  transaction_id: string | null
  user_id: string
}

/**
 * Top up credits for the authenticated user (via JWT token).
 * Preferred when you have the user's JWT.
 */
export async function topUpCredits(
  request: APIRequestContext,
  token: string,
  amount: number,
  description?: string
): Promise<TopUpResult> {
  const res = await request.post(url('/api/test/credit-topup'), {
    data: { amount, description },
    headers: testHeaders(token),
    timeout: 15000,
  })

  if (!res.ok()) {
    const body = await res.text()
    throw new Error(`topUpCredits failed (${res.status()}): ${body}`)
  }

  return res.json()
}

/**
 * Top up credits for a specific user by user_id (requires E2E_TEST_SECRET).
 * Use this in beforeAll when you have the userId but no token context.
 */
export async function topUpCreditsByUserId(
  request: APIRequestContext,
  userId: string,
  amount: number,
  description?: string
): Promise<TopUpResult> {
  if (!E2E_SECRET) {
    throw new Error('E2E_TEST_SECRET env var required for topUpCreditsByUserId')
  }

  const res = await request.post(url('/api/test/credit-topup'), {
    data: { user_id: userId, amount, description },
    headers: testHeaders(),
    timeout: 15000,
  })

  if (!res.ok()) {
    const body = await res.text()
    throw new Error(`topUpCreditsByUserId failed (${res.status()}): ${body}`)
  }

  return res.json()
}

/**
 * Set a user's balance to an exact amount (JWT auth).
 * Resets held to 0 — use before a fresh test scenario.
 */
export async function setCreditsTo(
  request: APIRequestContext,
  token: string,
  targetBalance: number
): Promise<TopUpResult> {
  const res = await request.post(url('/api/test/credit-topup'), {
    data: { set_to: targetBalance, description: `E2E setCreditsTo(${targetBalance})` },
    headers: testHeaders(token),
    timeout: 15000,
  })

  if (!res.ok()) {
    const body = await res.text()
    throw new Error(`setCreditsTo failed (${res.status()}): ${body}`)
  }

  return res.json()
}

/**
 * Set a user's balance to an exact amount by user_id (requires E2E_TEST_SECRET).
 * Resets held to 0 — use in beforeAll for clean fixture setup.
 */
export async function setCreditsToByUserId(
  request: APIRequestContext,
  userId: string,
  targetBalance: number
): Promise<TopUpResult> {
  if (!E2E_SECRET) {
    throw new Error('E2E_TEST_SECRET env var required for setCreditsToByUserId')
  }

  const res = await request.post(url('/api/test/credit-topup'), {
    data: { user_id: userId, set_to: targetBalance, description: `E2E setCreditsToByUserId(${targetBalance})` },
    headers: testHeaders(),
    timeout: 15000,
  })

  if (!res.ok()) {
    const body = await res.text()
    throw new Error(`setCreditsToByUserId failed (${res.status()}): ${body}`)
  }

  return res.json()
}
