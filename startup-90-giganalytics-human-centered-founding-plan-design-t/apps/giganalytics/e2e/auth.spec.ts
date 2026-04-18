import { test, expect } from '@playwright/test'

test('login page loads and has form', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('form')).toBeVisible()
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
})

test('signup page loads and has form', async ({ page }) => {
  await page.goto('/signup')
  await expect(page.locator('form')).toBeVisible()
  await expect(page.locator('input[type="email"]')).toBeVisible()
})

test('dashboard redirects unauthenticated user to login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
})

test('import page redirects unauthenticated user to login', async ({ page }) => {
  await page.goto('/import')
  await expect(page).toHaveURL(/\/login/)
})

test('timer page redirects unauthenticated user to login', async ({ page }) => {
  await page.goto('/timer')
  await expect(page).toHaveURL(/\/login/)
})

test('heatmap page redirects unauthenticated user to login', async ({ page }) => {
  await page.goto('/heatmap')
  await expect(page).toHaveURL(/\/login/)
})

test('login error shows on wrong credentials', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[type="email"]', 'notareal@example.com')
  await page.fill('input[type="password"]', 'wrongpassword')
  await page.click('button[type="submit"]')
  // Wait for error state
  await expect(page.locator('text=/invalid|error|incorrect/i')).toBeVisible({ timeout: 10000 })
})
