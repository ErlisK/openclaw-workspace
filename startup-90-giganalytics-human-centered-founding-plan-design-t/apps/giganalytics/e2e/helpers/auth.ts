/**
 * E2E Auth Helper
 * Creates an ephemeral test user via Supabase Admin API, logs them in,
 * and returns a JWT for API-level authenticated tests.
 *
 * Strategy: POST to /auth/v1/signup with auto-confirm (service role bypasses email confirm).
 */

import { APIRequestContext } from '@playwright/test'

export interface TestUser {
  email: string
  password: string
  userId: string
  accessToken: string
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

/**
 * Create a test user and return credentials.
 * Uses the Admin API to create + confirm the user immediately.
 */
export async function createTestUser(request: APIRequestContext): Promise<TestUser> {
  const ts = Date.now()
  const email = `e2e-test-${ts}@giganalytics-test.invalid`
  const password = `TestPass_${ts}!`

  // 1. Create user via Admin API (auto-confirms)
  const createRes = await request.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    data: {
      email,
      password,
      email_confirm: true,
    },
  })
  const created = await createRes.json()
  if (!created.id) throw new Error(`Failed to create test user: ${JSON.stringify(created)}`)

  // 2. Sign in to get a real JWT
  const signInRes = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: {
      apikey: ANON_KEY,
      'Content-Type': 'application/json',
    },
    data: { email, password },
  })
  const session = await signInRes.json()
  if (!session.access_token) throw new Error(`Failed to sign in test user: ${JSON.stringify(session)}`)

  return {
    email,
    password,
    userId: created.id,
    accessToken: session.access_token,
  }
}

/**
 * Clean up test user after tests complete.
 */
export async function deleteTestUser(request: APIRequestContext, userId: string): Promise<void> {
  await request.delete(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })
}

/**
 * Auth headers for Supabase-authenticated API requests.
 * Uses cookie format matching what Supabase SSR client reads.
 */
export function authHeaders(accessToken: string): Record<string, string> {
  return {
    Cookie: `sb-weofiforpfamjdtvvmgu-auth-token=${JSON.stringify({
      access_token: accessToken,
      token_type: 'bearer',
    })}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Wait for a condition with retries.
 */
export async function waitFor(
  fn: () => Promise<boolean>,
  { maxMs = 5000, intervalMs = 500 } = {}
): Promise<void> {
  const deadline = Date.now() + maxMs
  while (Date.now() < deadline) {
    if (await fn()) return
    await new Promise(r => setTimeout(r, intervalMs))
  }
  throw new Error('waitFor timed out')
}
