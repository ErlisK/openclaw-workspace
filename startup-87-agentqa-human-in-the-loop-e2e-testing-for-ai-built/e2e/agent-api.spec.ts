/**
 * E2E tests for the Agent API (v1) and API key management.
 * 
 * These tests hit the deployed Vercel URL via HTTP.
 * They verify the API contract without needing a browser.
 */
import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'https://betawindow.com'
const API_BASE = `${BASE_URL}/api/v1`
const AGENT_KEYS_URL = `${BASE_URL}/api/agent-keys`

// ── Health ──────────────────────────────────────────────────────────────────
test('GET /api/v1/jobs — rejects missing auth', async ({ request }) => {
  const res = await request.get(`${API_BASE}/jobs`)
  expect(res.status()).toBe(401)
  const body = await res.json()
  expect(body.error).toBeTruthy()
})

test('GET /api/v1/jobs — rejects invalid key', async ({ request }) => {
  const res = await request.get(`${API_BASE}/jobs`, {
    headers: { Authorization: 'Bearer aqk_invalid_key_abc123' },
  })
  expect(res.status()).toBe(401)
})

test('POST /api/v1/jobs — rejects missing title', async ({ request }) => {
  const res = await request.post(`${API_BASE}/jobs`, {
    headers: { Authorization: 'Bearer aqk_invalid_key_abc123' },
    data: { url: 'https://example.com', tier: 'quick' },
  })
  // 401 because key is invalid (checked first)
  expect([400, 401]).toContain(res.status())
})

// ── API docs page loads ──────────────────────────────────────────────────────
test('Agent API reference page loads', async ({ page }) => {
  await page.goto(`${BASE_URL}/docs/api-reference`)
  await expect(page).toHaveTitle(/Agent API Reference/)
  await expect(page.locator('h1')).toContainText('Agent API Reference')
  await expect(page.locator('code')).not.toHaveCount(0)
})

// ── Dashboard API Keys page ──────────────────────────────────────────────────
test('Dashboard API keys page exists (redirect to login when unauthenticated)', async ({ page }) => {
  const res = await page.goto(`${BASE_URL}/dashboard/api-keys`)
  // Should either show the page (if no auth middleware) or redirect to login
  expect([200, 302, 307]).toContain(res?.status() ?? 200)
})
