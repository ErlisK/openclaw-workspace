/**
 * scripts/make-gif.js
 * 
 * Assembles the demo GIF from PNG frames using pure Node.js
 * by encoding a minimal animated WebP/GIF using raw pixel data.
 * 
 * Since we don't have ffmpeg/imagemagick, we use the Playwright
 * browser to render an animated SVG and export it, OR we create
 * a simple HTML page that auto-advances screenshots and capture
 * it as a video via Playwright's recordVideo feature.
 */
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const OUT_DIR = path.join(__dirname, '../public/assets')
const FRAMES_JSON = path.join(OUT_DIR, 'demo-frames.json')

async function main() {
  const frames = JSON.parse(fs.readFileSync(FRAMES_JSON, 'utf8'))
  
  // Convert PNG frames to base64 for embedding
  const frameData = frames.map(f => {
    const buf = fs.readFileSync(f)
    return buf.toString('base64')
  })
  
  // Build an HTML slideshow page that auto-advances
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* { margin: 0; padding: 0; }
body { width: 1280px; height: 720px; overflow: hidden; background: #fff; }
img { width: 1280px; height: 720px; object-fit: cover; display: none; }
img.active { display: block; }
</style>
</head>
<body>
${frameData.map((b64, i) => `<img id="f${i}" class="${i === 0 ? 'active' : ''}" src="data:image/png;base64,${b64}">`).join('\n')}
<script>
let cur = 0;
const imgs = document.querySelectorAll('img');
setInterval(() => {
  imgs[cur].classList.remove('active');
  cur = (cur + 1) % imgs.length;
  imgs[cur].classList.add('active');
}, 400);
</script>
</body>
</html>`
  
  const htmlPath = path.join(OUT_DIR, 'demo-slideshow.html')
  fs.writeFileSync(htmlPath, html)
  
  // Use Playwright to record the slideshow as a video
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: OUT_DIR,
      size: { width: 1280, height: 720 }
    }
  })
  
  const page = await context.newPage()
  await page.goto(`file://${htmlPath}`)
  
  // Wait for enough cycles to show all frames (12 frames × 400ms + buffer)
  await page.waitForTimeout(6000)
  
  await page.close()
  await context.close()
  await browser.close()
  
  // Find the recorded video file
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.webm'))
  if (files.length > 0) {
    const videoPath = path.join(OUT_DIR, files[files.length - 1])
    const destPath = path.join(OUT_DIR, 'demo.webm')
    fs.renameSync(videoPath, destPath)
    console.log(`✅ Demo video: demo.webm (${Math.round(fs.statSync(destPath).size / 1024)}KB)`)
  }
  
  console.log('✅ Demo slideshow HTML also saved as demo-slideshow.html')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
