import { test, expect } from '@playwright/test'
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
test('debug - check form exists', async ({ page }) => {
  // Listen for console messages
  const consoleLogs: string[] = []
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`))
  
  await page.goto(`${BASE_URL}/calculator`)
  
  // Check if form exists
  const formCount = await page.locator('form').count()
  console.log('form count:', formCount)
  
  const inputNames = await page.evaluate(() => 
    Array.from(document.querySelectorAll('input')).map(i => i.name + '/' + i.type + '/' + i.placeholder)
  )
  console.log('inputs:', inputNames.join(', '))
  
  const selectNames = await page.evaluate(() =>
    Array.from(document.querySelectorAll('select')).map(s => s.name + '/' + s.value)
  )
  console.log('selects:', selectNames.join(', '))
  
  // Fill using name attributes
  await page.locator('input[name="revenue"]').fill('3000')
  await page.locator('input[name="hours"]').fill('40')
  await page.locator('input[name="goal"]').fill('50')
  
  // Check form validity
  const isValid = await page.evaluate(() => {
    const form = document.querySelector('form') as HTMLFormElement
    return form ? form.checkValidity() : null
  })
  console.log('form checkValidity:', isValid)
  
  // Submit
  await page.locator('[data-testid="calc-submit"]').click()
  await page.waitForTimeout(1000)
  
  // Any console errors?
  console.log('console logs:', consoleLogs.join('\n'))
})
