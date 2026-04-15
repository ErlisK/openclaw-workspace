/**
 * e2e/helpers/credits.ts — Shared credit top-up helper for E2E fixtures
 *
 * Call topUpCredits() in beforeAll BEFORE any transition→published call.
 * Uses Supabase service role to bypass RLS.
 */
import type { APIRequestContext } from '@playwright/test'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://sreaczlbclzysmntltdf.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * Set credits_balance directly via service role REST.
 * @param userId Supabase user id
 * @param amount Credits to set (default 100 — enough for any tier)
 */
export async function topUpCredits(
  request: APIRequestContext,
  userId: string,
  amount = 100
): Promise<void> {
  if (!SERVICE_ROLE_KEY || !userId) return
  await request.patch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
    data: { credits_balance: amount, credits_held: 0 },
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
  })
}

/**
 * Decode user id from JWT token
 */
export function getUserId(token: string): string {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1] + '==', 'base64').toString()).sub ?? ''
  } catch {
    return ''
  }
}
