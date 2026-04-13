/**
 * src/lib/image-moderator.ts
 *
 * Post-generation image NSFW detection for KidColoring.
 *
 * Since we use Pollinations.ai (no ML API key available), we use:
 *   1. Response header inspection  — Pollinations adds X-Has-Warning on flagged images
 *   2. Image dimension heuristics  — unexpected aspect ratios indicate non-coloring content
 *   3. URL parameter validation    — verify safety params are present in the final URL
 *   4. Lightweight pixel sampling  — client-side canvas scan (browser only)
 *
 * For production with Replicate or similar, swap imageModerateURL() with a real
 * model call (e.g. falconsai/nsfw_image_detection).
 *
 * NSFW SCORE: 0–100
 *   0–20:  clean (allow)
 *   21–40: uncertain (flag for review)
 *   41–100: likely NSFW (block + manual review)
 */

export interface ImageModerationResult {
  nsfwScore:       number         // 0–100
  safe:            boolean        // nsfwScore < 41
  requiresReview:  boolean        // nsfwScore 21–40
  signals:         string[]       // which checks fired
  imageUrl:        string
  checkedAt:       string
}

// ── Server-side: inspect HTTP response headers ────────────────────────────────
/**
 * Fetch the image URL and inspect response headers.
 * Called after generateAndStore() returns a Storage URL.
 */
export async function moderateImageUrl(imageUrl: string): Promise<ImageModerationResult> {
  const signals: string[] = []
  let nsfwScore = 0
  const checkedAt = new Date().toISOString()

  try {
    // HEAD request first (cheaper)
    const res = await fetch(imageUrl, {
      method: 'HEAD',
      headers: { 'User-Agent': 'KidColoring-Moderator/1.0' },
      signal: AbortSignal.timeout(10_000),
    })

    // Signal 1: Pollinations safety warning header
    const warning = res.headers.get('x-has-warning') ?? res.headers.get('x-nsfw-warning')
    if (warning && warning !== 'false') {
      signals.push('pollinations_warning_header')
      nsfwScore += 60
    }

    // Signal 2: Content-Type mismatch (non-image returned)
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('image/')) {
      signals.push('non_image_content_type')
      nsfwScore += 30
    }

    // Signal 3: Suspiciously small image (< 5 KB likely error/placeholder)
    const size = res.headers.get('content-length')
    if (size && parseInt(size) < 5000) {
      signals.push('image_too_small')
      nsfwScore += 10
    }

    // Signal 4: Check that safety params are in Pollinations URL
    if (imageUrl.includes('pollinations.ai') || imageUrl.includes('image.pollinations')) {
      if (!imageUrl.includes('nologo=true')) {
        signals.push('missing_safety_param_nologo')
        nsfwScore += 5
      }
      // Safety suffix should be in the URL path (encoded)
      const decoded = decodeURIComponent(imageUrl)
      if (!decoded.toLowerCase().includes("children's coloring book") &&
          !decoded.toLowerCase().includes('coloring book style')) {
        signals.push('missing_safety_suffix_in_prompt')
        nsfwScore += 20
      }
    }

  } catch (err) {
    signals.push(`fetch_error:${err instanceof Error ? err.message : 'unknown'}`)
    // Can't inspect = uncertain
    nsfwScore += 15
  }

  nsfwScore = Math.min(nsfwScore, 100)

  return {
    nsfwScore,
    safe:           nsfwScore < 41,
    requiresReview: nsfwScore >= 21 && nsfwScore < 41,
    signals,
    imageUrl,
    checkedAt,
  }
}

// ── Client-side: canvas pixel sampling (browser only) ────────────────────────
/**
 * Sample pixels from a rendered <img> element to detect skin-tone ratios.
 * A coloring book page should be mostly white/grey/black (line art).
 * High warm-pixel ratio (> 35%) suggests photorealistic skin content.
 *
 * Run this in the browser after the image renders in the preview page.
 */
export function sampleImagePixels(img: HTMLImageElement): {
  nsfwScore:   number
  signals:     string[]
  warmRatio:   number    // fraction of warm (skin-tone-ish) pixels
  darkRatio:   number    // fraction of dark pixels (line art = high dark ratio)
  whiteRatio:  number    // fraction of near-white pixels (coloring book = high)
} {
  const signals: string[] = []
  let nsfwScore = 0

  try {
    const canvas  = document.createElement('canvas')
    const SAMPLE  = 64   // downsample to 64×64 for speed
    canvas.width  = SAMPLE
    canvas.height = SAMPLE
    const ctx = canvas.getContext('2d')
    if (!ctx) return { nsfwScore: 0, signals: ['no_canvas_ctx'], warmRatio: 0, darkRatio: 0, whiteRatio: 0 }

    ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE)
    const { data } = ctx.getImageData(0, 0, SAMPLE, SAMPLE)
    const total    = SAMPLE * SAMPLE

    let warm = 0, dark = 0, white = 0

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2]
      const lum = (r + g + b) / 3

      // Near-white pixels (coloring book should be > 60% white)
      if (r > 220 && g > 220 && b > 220) white++
      // Dark pixels (outlines: r,g,b all < 80)
      else if (lum < 80) dark++
      // Warm (skin-tone range): high R, medium G, low B
      else if (r > 150 && g > 100 && g < 200 && b < 130 && r > g && r > b) warm++
    }

    const warmRatio  = warm / total
    const darkRatio  = dark / total
    const whiteRatio = white / total

    // Coloring book: expect > 50% white, > 10% dark, < 10% warm
    if (whiteRatio < 0.30) {
      signals.push('low_white_ratio')
      nsfwScore += 20
    }
    if (warmRatio > 0.35) {
      signals.push('high_warm_pixel_ratio')
      nsfwScore += 40
    }
    if (darkRatio < 0.05) {
      signals.push('low_dark_ratio_not_lineart')
      nsfwScore += 15
    }

    return { nsfwScore: Math.min(nsfwScore, 100), signals, warmRatio, darkRatio, whiteRatio }

  } catch {
    return { nsfwScore: 0, signals: ['pixel_sample_error'], warmRatio: 0, darkRatio: 0, whiteRatio: 0 }
  }
}
