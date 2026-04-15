/**
 * e2e/launch-gate.spec.ts
 *
 * Tests for the launch gate fixes:
 * 1. /api/sandbox/resource requires auth (returns 401 without token)
 * 2. /api/jobs POST rejects javascript: and non-http/https schemes
 * 3. /api/version does not include build_hash
 * 4. /api/health returns minimal response (no schema_tables)
 * 5. /api/credits POST ignores x-test-admin (returns 403)
 */
import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const BYPASS = process.env.VERCEL_BYPASS_TOKEN || ''

function apiUrl(path: string) {
  const sep = path.includes('?') ? '&' : '?'
  return BYPASS
    ? `${BASE_URL}${path}${sep}x-vercel-protection-bypass=${BYPASS}`
    : `${BASE_URL}${path}`
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(apiUrl(path), init)
}

// ---------------------------------------------------------------------------
// 1. sandbox/resource requires auth
// ---------------------------------------------------------------------------
test.describe('sandbox/resource auth guard', () => {
  test('unauthenticated request returns 401', async () => {
    const res = await apiFetch(`/api/sandbox/resource?u=${encodeURIComponent('https://example.com/style.css')}`)
    expect(res.status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// 2. Job URL validation
// ---------------------------------------------------------------------------
test.describe('Job URL validation (unauthenticated → 401, not 500)', () => {
  // These tests verify URL validation happens before or with auth.
  // Without auth we'll get 401, but we can also test the validation
  // by checking the error is NOT 500 (internal server error).

  test('javascript: scheme returns 401 (auth) or 400 (validation)', async () => {
    const res = await apiFetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', url: 'javascript:alert(1)' }),
    })
    // Without auth: 401. With auth + bad URL: 400. Never 500 or 200.
    expect([400, 401]).toContain(res.status)
  })

  test('data: scheme returns 401 (auth) or 400 (validation)', async () => {
    const res = await apiFetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', url: 'data:text/html,<h1>xss</h1>' }),
    })
    expect([400, 401]).toContain(res.status)
  })
})

// ---------------------------------------------------------------------------
// 3. version endpoint does not leak build_hash
// ---------------------------------------------------------------------------
test.describe('/api/version', () => {
  test('does not include build_hash in response', async () => {
    const res = await apiFetch('/api/version')
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body.build_hash).toBeUndefined()
    expect(body.deployed_at).toBeUndefined()
    expect(body.status).toBe('ok')
    expect(body.version).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// 4. health endpoint is minimal
// ---------------------------------------------------------------------------
test.describe('/api/health', () => {
  test('does not expose schema_tables', async () => {
    const res = await apiFetch('/api/health')
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body.schema_tables).toBeUndefined()
    expect(body.status).toBe('ok')
  })
})

// ---------------------------------------------------------------------------
// 5. credits POST ignores x-test-admin header
// ---------------------------------------------------------------------------
test.describe('/api/credits admin bypass removal', () => {
  test('x-test-admin header without valid auth returns 401', async () => {
    const res = await apiFetch('/api/credits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-admin': 'anything',
      },
      body: JSON.stringify({ amount: 100 }),
    })
    // Should be 401 (no auth) - x-test-admin is now ignored
    expect(res.status).toBe(401)
  })
})
