import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'https://startup-87-agentqa-human-in-the-loop-e2e-testing-ctl5eo3rx.vercel.app'
const BYPASS = process.env.VERCEL_BYPASS_TOKEN || '6QxulLdZOqxuUMLF9vZ7pW2MevpMdn1W'

test.describe('AgentQA API', () => {
  test('homepage loads', async ({ page }) => {
    const res = await page.goto(`${BASE_URL}/?x-vercel-protection-bypass=${BYPASS}`)
    expect(res?.status()).toBe(200)
    await expect(page.locator('h1')).toContainText('AgentQA')
  })

  test('cluster API returns themed analysis', async ({ request }) => {
    const res = await request.post(
      `${BASE_URL}/api/ai/cluster?x-vercel-protection-bypass=${BYPASS}`,
      { headers: { 'Content-Type': 'application/json' }, data: {} }
    )
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.themes).toBeDefined()
    expect(body.themes.length).toBeGreaterThanOrEqual(5)
    expect(body.top_insight).toBeTruthy()
    expect(body.recommended_wedge).toBeTruthy()

    const themeIds = body.themes.map((t: { id: string }) => t.id)
    expect(themeIds).toContain('agent_hallucinated_ui')
    expect(themeIds).toContain('broken_auth_flows')
    expect(themeIds).toContain('needs_human_sanity_check')
  })

  test('cluster API themes have required fields', async ({ request }) => {
    const res = await request.post(
      `${BASE_URL}/api/ai/cluster?x-vercel-protection-bypass=${BYPASS}`,
      { headers: { 'Content-Type': 'application/json' }, data: {} }
    )
    const body = await res.json()
    for (const theme of body.themes) {
      expect(theme.id).toBeTruthy()
      expect(theme.label).toBeTruthy()
      expect(theme.severity).toMatch(/critical|high|medium/)
      expect(theme.pain_point_ids).toBeInstanceOf(Array)
      expect(theme.pain_point_ids.length).toBeGreaterThan(0)
    }
  })
})
