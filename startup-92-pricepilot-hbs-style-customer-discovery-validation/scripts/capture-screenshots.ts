/**
 * capture-screenshots.ts
 * Take production screenshots for launch assets.
 * Run: BASE_URL=https://... npx ts-node --esm capture-screenshots.ts
 */
import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'https://startup-92-pricepilot-hbs-style-cus.vercel.app';
const ASSETS_DIR = path.join(process.cwd(), 'public', 'assets');
fs.mkdirSync(ASSETS_DIR, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });

  // 1. Homepage
  console.log('📸 homepage...');
  let page = await ctx.newPage();
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(ASSETS_DIR, 'screenshot-homepage.png'), fullPage: false });
  await page.close();

  // 2. Pricing page
  console.log('📸 pricing...');
  page = await ctx.newPage();
  await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(ASSETS_DIR, 'screenshot-pricing.png'), fullPage: false });
  await page.close();

  // 3. Blog listing
  console.log('📸 blog...');
  page = await ctx.newPage();
  await page.goto(`${BASE_URL}/blog`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(ASSETS_DIR, 'screenshot-blog.png'), fullPage: false });
  await page.close();

  // 4. Docs
  console.log('📸 docs...');
  page = await ctx.newPage();
  await page.goto(`${BASE_URL}/docs`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(ASSETS_DIR, 'screenshot-docs.png'), fullPage: false });
  await page.close();

  // 5. Import guide
  console.log('📸 import guide...');
  page = await ctx.newPage();
  await page.goto(`${BASE_URL}/import/guide`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(ASSETS_DIR, 'screenshot-import-guide.png'), fullPage: false });
  await page.close();

  await browser.close();
  console.log('✅ All screenshots saved to public/assets/');
}

main().catch(e => { console.error(e); process.exit(1); });
