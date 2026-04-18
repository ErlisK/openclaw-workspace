import { test, expect } from '@playwright/test'

test('timer page redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/timer')
  await expect(page).toHaveURL(/\/login/)
})

test('timer API GET returns 401 without auth', async ({ request }) => {
  const res = await request.get('/api/timer')
  expect(res.status()).toBe(401)
})

test('timer API POST returns 401 without auth', async ({ request }) => {
  const res = await request.post('/api/timer', {
    data: { action: 'log', streamId: null, durationMinutes: 30, entryType: 'billable' }
  })
  expect(res.status()).toBe(401)
})

test('timer API PATCH returns 401 without auth', async ({ request }) => {
  const res = await request.patch('/api/timer', {
    data: { id: 'fake-id', durationMinutes: 45 }
  })
  expect(res.status()).toBe(401)
})

test('ICS API returns 401 without auth', async ({ request }) => {
  const res = await request.post('/api/ics', {
    multipart: {
      file: { name: 'test.ics', mimeType: 'text/calendar', buffer: Buffer.from('BEGIN:VCALENDAR\nEND:VCALENDAR') },
      preview: 'true',
    }
  })
  expect(res.status()).toBe(401)
})

test('sample ICS file is publicly accessible', async ({ request }) => {
  const res = await request.get('/samples/calendar-sample.ics')
  expect(res.status()).not.toBe(404)
})
