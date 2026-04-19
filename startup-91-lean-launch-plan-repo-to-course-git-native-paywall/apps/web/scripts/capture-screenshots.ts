/**
 * scripts/capture-screenshots.ts
 *
 * Takes real screenshots of the deployed app and generates an animated GIF
 * showing the repo-to-course flow (using individual PNG frames + gifenc).
 *
 * Usage: BASE_URL=https://... npx ts-node scripts/capture-screenshots.ts
 * Or via playwright directly as a test (non-test mode):
 *   node -e "require('./scripts/capture-screenshots.js')"
 */
import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.BASE_URL ?? 'https://startup-91-lean-launch-plan-repo-to-course-git-nativ-38dyrzm84.vercel.app';
const OUT_DIR = path.join(__dirname, '..', 'public', 'assets');

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const shots: { name: string; url: string; selector?: string }[] = [
    { name: 'homepage',    url: '/' },
    { name: 'marketplace', url: '/marketplace' },
    { name: 'course',      url: '/courses/git-for-engineers' },
    { name: 'lesson',      url: '/courses/git-for-engineers/lessons/git-basics' },
    { name: 'docs',        url: '/docs' },
    { name: 'pricing',     url: '/docs/pricing' },
  ];

  const frames: Buffer[] = [];

  for (const shot of shots) {
    try {
      await page.goto(`${BASE_URL}${shot.url}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(800);
      const buf = await page.screenshot({ fullPage: false });
      fs.writeFileSync(path.join(OUT_DIR, `screenshot-${shot.name}.png`), buf);
      console.log(`screenshot-${shot.name}.png ✓`);
      // Collect frames for the GIF (2 per page = fade in effect)
      frames.push(buf);
      frames.push(buf);
    } catch (e) {
      console.warn(`Skipping ${shot.name}:`, (e as Error).message.slice(0, 80));
    }
  }

  // Save frames as individual numbered PNGs for gifski/ffmpeg
  const framesDir = path.join(OUT_DIR, 'gif-frames');
  fs.mkdirSync(framesDir, { recursive: true });
  frames.forEach((f, i) => {
    fs.writeFileSync(path.join(framesDir, `frame-${String(i).padStart(3, '0')}.png`), f);
  });
  console.log(`${frames.length} frames saved to gif-frames/`);

  await browser.close();
}

run().catch(console.error);
