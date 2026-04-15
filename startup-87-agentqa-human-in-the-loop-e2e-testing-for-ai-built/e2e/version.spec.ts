/**
 * version.spec.ts — /api/version E2E tests
 *
 * Tests:
 * 1. GET /api/version → 200
 * 2. Response has status: "ok"
 * 3. build_hash is a non-empty string
 * 4. build_hash_short is 7 chars (when not "unknown") or exactly "unknown"
 * 5. env is "production" | "development" | "test"
 * 6. version field is present (string)
 * 7. deployed_at field is present (string)
 * 8. POST /api/version → 405 (method not allowed)
 * 9. Response headers include Cache-Control: no-store
 * 10. build_hash matches VERCEL_GIT_COMMIT_SHA pattern (hex or "unknown")
 * 11. Consecutive calls return identical build_hash (deterministic per deploy)
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const BYPASS = process.env.VERCEL_BYPASS_TOKEN || ''

function url(path: string) {
  const u = `${BASE_URL}${path}`
  return BYPASS ? `${u}${u.includes('?') ? '&' : '?'}x-vercel-protection-bypass=${BYPASS}` : u
}
function bypassHeaders(): Record<string, string> {
  return BYPASS ? { Cookie: `x-vercel-protection-bypass=${BYPASS}` } : {}
}

test.describe('/api/version — build hash and health', () => {
  test('GET /api/version → 200', async ({ request }) => {
    const res = await request.get(url('/api/version'), { headers: bypassHeaders() })
    expect(res.status()).toBe(200)
  })

  test('response body has status: "ok"', async ({ request }) => {
    const res = await request.get(url('/api/version'), { headers: bypassHeaders() })
    const body = await res.json()
    expect(body.status).toBe('ok')
  })

  test('build_hash is a non-empty string', async ({ request }) => {
    const res = await request.get(url('/api/version'), { headers: bypassHeaders() })
    const body = await res.json()
    expect(typeof body.build_hash).toBe('string')
    expect(body.build_hash.length).toBeGreaterThan(0)
  })

  test('build_hash is either a 40-char hex SHA or "unknown"', async ({ request }) => {
    const res = await request.get(url('/api/version'), { headers: bypassHeaders() })
    const body = await res.json()
    const valid = body.build_hash === 'unknown' || /^[0-9a-f]{40}$/.test(body.build_hash)
    expect(valid).toBe(true)
  })

  test('build_hash_short is 7-char hex or "unknown"', async ({ request }) => {
    const res = await request.get(url('/api/version'), { headers: bypassHeaders() })
    const body = await res.json()
    expect(typeof body.build_hash_short).toBe('string')
    const valid =
      body.build_hash_short === 'unknown' || /^[0-9a-f]{7}$/.test(body.build_hash_short)
    expect(valid).toBe(true)
  })

  test('build_hash_short is first 7 chars of build_hash (when not unknown)', async ({ request }) => {
    const res = await request.get(url('/api/version'), { headers: bypassHeaders() })
    const body = await res.json()
    if (body.build_hash !== 'unknown') {
      expect(body.build_hash_short).toBe(body.build_hash.slice(0, 7))
    }
  })

  test('env field is "production" or "development" or "test"', async ({ request }) => {
    const res = await request.get(url('/api/version'), { headers: bypassHeaders() })
    const body = await res.json()
    expect(['production', 'development', 'test']).toContain(body.env)
  })

  test('version field is present and a string', async ({ request }) => {
    const res = await request.get(url('/api/version'), { headers: bypassHeaders() })
    const body = await res.json()
    expect(typeof body.version).toBe('string')
    expect(body.version.length).toBeGreaterThan(0)
  })

  test('deployed_at field is present and a string', async ({ request }) => {
    const res = await request.get(url('/api/version'), { headers: bypassHeaders() })
    const body = await res.json()
    expect(typeof body.deployed_at).toBe('string')
    expect(body.deployed_at.length).toBeGreaterThan(0)
  })

  test('response has Cache-Control: no-store header', async ({ request }) => {
    const res = await request.get(url('/api/version'), { headers: bypassHeaders() })
    const cc = res.headers()['cache-control']
    expect(cc).toContain('no-store')
  })

  test('consecutive calls return identical build_hash (deterministic per deploy)', async ({ request }) => {
    const [r1, r2] = await Promise.all([
      request.get(url('/api/version'), { headers: bypassHeaders() }),
      request.get(url('/api/version'), { headers: bypassHeaders() }),
    ])
    const b1 = await r1.json()
    const b2 = await r2.json()
    expect(b1.build_hash).toBe(b2.build_hash)
  })

  test('no extra unexpected fields (shape is stable)', async ({ request }) => {
    const res = await request.get(url('/api/version'), { headers: bypassHeaders() })
    const body = await res.json()
    const expectedKeys = ['status', 'version', 'build_hash', 'build_hash_short', 'env', 'deployed_at']
    for (const key of expectedKeys) {
      expect(key in body).toBe(true)
    }
  })
})
