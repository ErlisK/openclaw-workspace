/**
 * scripts/capture-assets.js
 *
 * Uses Playwright to take screenshots of the live app for marketing assets.
 * Run: node scripts/capture-assets.js
 */
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const DEPLOYED = process.env.BASE_URL || 'https://startup-87-agentqa-human-in-the-loop-e2e-testing-j93ivfu33.vercel.app'
const BYPASS = process.env.BYPASS || '6QxulLdZOqxuUMLF9vZ7pW2MevpMdn1W'
const OUT_DIR = path.join(__dirname, '../public/assets')

function url(p) {
  return `${DEPLOYED}${p}?x-vercel-protection-bypass=${BYPASS}`
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const browser = await chromium.launch({ args: ['--no-sandbox'] })

  async function screenshot(page, name, opts = {}) {
    const file = path.join(OUT_DIR, name)
    await page.screenshot({ path: file, fullPage: opts.fullPage || false })
    console.log(`  ✓ ${name} (${Math.round(fs.statSync(file).size / 1024)}KB)`)
    return file
  }

  // --- 1. Homepage hero (1280x800) ---
  console.log('\n📸 Capturing marketing screenshots...')
  {
    const page = await browser.newPage()
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(url('/'))
    await page.waitForLoadState('networkidle')
    await screenshot(page, 'screenshot-homepage.png')
    await page.close()
  }

  // --- 2. Pricing page ---
  {
    const page = await browser.newPage()
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(url('/pricing'))
    await page.waitForLoadState('networkidle')
    await screenshot(page, 'screenshot-pricing.png')
    await page.close()
  }

  // --- 3. Marketplace ---
  {
    const page = await browser.newPage()
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(url('/marketplace'))
    await page.waitForLoadState('networkidle')
    await screenshot(page, 'screenshot-marketplace.png')
    await page.close()
  }

  // --- 4. Docs / how-it-works ---
  {
    const page = await browser.newPage()
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(url('/docs/how-it-works'))
    await page.waitForLoadState('networkidle')
    await screenshot(page, 'screenshot-docs.png')
    await page.close()
  }

  // --- 5. OG image (1200x630) ---
  {
    const page = await browser.newPage()
    await page.setViewportSize({ width: 1200, height: 630 })
    await page.goto(url('/og?x-vercel-protection-bypass=' + BYPASS))
    await page.waitForLoadState('networkidle')
    await screenshot(page, 'og-image.png')
    await page.close()
  }

  // --- 6. Demo GIF frames: homepage → pricing → marketplace ---
  console.log('\n🎬 Capturing demo frames...')
  const frames = []
  {
    const page = await browser.newPage()
    await page.setViewportSize({ width: 1280, height: 720 })

    const steps = [
      { path: '/', label: 'homepage', wait: 1500 },
      { path: '/pricing', label: 'pricing', wait: 1500 },
      { path: '/marketplace', label: 'marketplace', wait: 1500 },
      { path: '/docs/how-it-works', label: 'docs', wait: 1500 },
    ]

    for (const step of steps) {
      await page.goto(url(step.path))
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(step.wait)
      // Capture 3 frames per page (for smoother GIF)
      for (let i = 0; i < 3; i++) {
        const framePath = path.join(OUT_DIR, `frame_${step.label}_${i}.png`)
        await page.screenshot({ path: framePath })
        frames.push(framePath)
        if (i < 2) await page.waitForTimeout(300)
      }
    }
    await page.close()
  }

  console.log(`  ✓ Captured ${frames.length} frames`)

  // Write frame list for GIF assembly
  fs.writeFileSync(
    path.join(OUT_DIR, 'demo-frames.json'),
    JSON.stringify(frames, null, 2)
  )

  await browser.close()
  console.log('\n✅ All assets captured to public/assets/')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
