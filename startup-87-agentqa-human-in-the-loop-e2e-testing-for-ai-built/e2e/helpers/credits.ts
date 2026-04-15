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
 * Set a user's balance to an exact amount by topping up from 0.
 * Reads current balance first and adds the difference.
 * Uses JWT auth.
 */
export async function setCreditsTo(
  request: APIRequestContext,
  token: string,
  targetBalance: number
): Promise<TopUpResult> {
  // Get current balance
  const creditsUrl = `${BASE_URL}/api/credits${BYPASS ? `?x-vercel-protection-bypass=${BYPASS}` : ''}`
  const checkRes = await request.get(creditsUrl, {
    headers: testHeaders(token),
    timeout: 10000,
  })

  const { balance: current = 0, held = 0 } = checkRes.ok() ? await checkRes.json() : {}

  // Release held credits first if needed — this is best-effort
  const effectiveCurrent = current - held

  if (effectiveCurrent >= targetBalance) {
    // Already at or above target — return current state
    return { ok: true, balance: current, held, available: effectiveCurrent, transaction_id: null, user_id: '' }
  }

  const topUpAmount = targetBalance - effectiveCurrent
  return topUpCredits(request, token, topUpAmount, `E2E setCreditsTo(${targetBalance})`)
}
