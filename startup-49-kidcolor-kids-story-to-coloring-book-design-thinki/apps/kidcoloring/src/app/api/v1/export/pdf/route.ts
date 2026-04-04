import { checkRateLimit, rateLimit429 } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/logger'
/**
 * POST /api/v1/export/pdf
 *
 * Serverless function: generates a print-quality PDF coloring book from a trial session,
 * runs line-weight quality checks on each image, stores the PDF in Supabase Storage
 * (bucket: exports), saves the URL back to trial_sessions.pdf_url, and returns a
 * signed/public download URL.
 *
 * Schema: v1.8.0 - trial_sessions.pdf_url + trial_sessions.pdf_generated_at
 */

import { NextRequest, NextResponse }              from 'next/server'
import { createClient }                           from '@supabase/supabase-js'
import { PDFDocument, PDFFont, rgb, StandardFonts } from 'pdf-lib'

export const maxDuration = 60   // Vercel Pro / Edge Network limit
export const runtime = 'nodejs' // pdf-lib requires Node (not Edge)

// ── PDF dimensions (US Letter) ─────────────────────────────────────────────
const PW     = 612   // page width  (pts)
const PH     = 792   // page height (pts)
const MARGIN = 36    // 0.5 inch all sides
const INNER_W = PW - MARGIN * 2   // 540 pt = 7.5 in


// Violet brand colour
const VIOLET  = rgb(0.486, 0.227, 0.914)  // #7c3aed
const LGRAY   = rgb(0.6, 0.6, 0.6)
const BLACK   = rgb(0, 0, 0)

// ── Line-weight quality check ──────────────────────────────────────────────
interface CheckResult {
  ok: boolean
  reason?: string
  contentLength?: number
  contentType?: string
}

async function lineWeightCheck(imageUrl: string): Promise<CheckResult> {
  if (!imageUrl) return { ok: false, reason: 'no_url' }

  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8_000)   // 8s timeout per image

    const res = await fetch(imageUrl, {
      method: 'HEAD',
      signal: ctrl.signal,
      headers: { 'User-Agent': 'KidColoring-PDF-Export/1.0' },
    })
    clearTimeout(timer)

    if (!res.ok) return { ok: false, reason: `http_${res.status}` }

    const ct = res.headers.get('content-type') || ''
    if (!ct.startsWith('image/')) return { ok: false, reason: `bad_content_type:${ct.slice(0, 30)}` }

    const cl = parseInt(res.headers.get('content-length') || '0', 10)
    // Coloring pages with thick black outlines should be ≥15 KB.
    // Error / placeholder images from Pollinations are typically <5 KB.
    if (cl > 0 && cl < 15_000) {
      return { ok: false, reason: `image_too_small:${cl}b`, contentLength: cl, contentType: ct }
    }

    return { ok: true, contentLength: cl, contentType: ct }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, reason: `fetch_error:${msg.slice(0, 80)}` }
  }
}

// ── Fetch image bytes (GET, with retry) ────────────────────────────────────
async function fetchImageBytes(url: string): Promise<Uint8Array | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 15_000)
      const res = await fetch(url, { signal: ctrl.signal })
      clearTimeout(timer)
      if (!res.ok) continue
      const buf = await res.arrayBuffer()
      return new Uint8Array(buf)
    } catch { /* retry */ }
  }
  return null
}

// ── Helpers ────────────────────────────────────────────────────────────────
function buildTitle(config: Record<string, unknown>): string {
  const heroName  = config?.heroName  as string | undefined
  const interests = config?.interests as string[] | undefined
  if (heroName)              return `${heroName}'s Coloring Book`
  if (interests?.length)     return `${interests.slice(0, 3).join(', ')} Coloring Book`
  return 'My Coloring Book'
}

function drawCentredText(
  page: ReturnType<PDFDocument['addPage']>,
  text: string,
  font: PDFFont,
  size: number,
  y: number,
  colour = BLACK,
) {
  const w = font.widthOfTextAtSize(text, size)
  page.drawText(text, { x: (PW - w) / 2, y, size, font, color: colour })
}

function drawBorder(
  page: ReturnType<PDFDocument['addPage']>,
  inset: number,
  lineWidth: number,
  colour = VIOLET,
) {
  const x = inset, yb = inset
  const bw = PW - inset * 2, bh = PH - inset * 2
  page.drawRectangle({ x, y: yb, width: bw, height: bh, borderColor: colour, borderWidth: lineWidth, color: rgb(1,1,1) })
}

// ── Main handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const _ip = getClientIp(req.headers) ?? 'unknown'
  const _rl = await checkRateLimit(_ip, 'export_pdf')
  if (!_rl.allowed) return rateLimit429(_rl)

  // ── 1. Parse & validate request ─────────────────────────────────────────
  let sessionId: string
  try {
    const body = await req.json()
    sessionId = body.sessionId
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!sessionId) return NextResponse.json({ error: 'sessionId_required' }, { status: 400 })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // ── 2. Load session ──────────────────────────────────────────────────────
  const { data: session, error: sErr } = await sb
    .from('trial_sessions')
    .select('id, concept, config, page_count, status, share_slug')
    .eq('id', sessionId)
    .single()
  if (sErr || !session) {
    return NextResponse.json({ error: 'session_not_found' }, { status: 404 })
  }

  // ── 3. Load pages ────────────────────────────────────────────────────────
  const { data: pages, error: pErr } = await sb
    .from('trial_pages')
    .select('id, page_number, sort_order, image_url, subject, prompt, status')
    .eq('session_id', sessionId)
    .eq('status', 'complete')
    .order('sort_order')

  if (pErr || !pages || pages.length === 0) {
    return NextResponse.json({ error: 'no_completed_pages' }, { status: 400 })
  }

  // ── 4. Line-weight quality checks (parallel) ────────────────────────────
  const checkResults = await Promise.all(
    pages.map(async (p) => {
      const result = await lineWeightCheck(p.image_url || '')
      return { pageId: p.id, pageNumber: p.page_number, url: p.image_url, ...result }
    })
  )
  const passCount  = checkResults.filter(c => c.ok).length
  const failCount  = checkResults.length - passCount
  const failedUrls = checkResults.filter(c => !c.ok).map(c => c.reason)

  // Log line-weight check event (non-blocking)
  sb.from('events').insert({
    event_name: 'pdf_export_started',
    session_id: sessionId,
    properties: {
      page_count:   pages.length,
      check_pass:   passCount,
      check_fail:   failCount,
      failed_reasons: failedUrls,
      _ts: Date.now(),
    },
  }).then(() => {/* fire-and-forget */})

  // ── 5. Fetch image bytes (parallel, skip failed checks) ─────────────────
  const imageMap: Record<string, Uint8Array | null> = {}
  await Promise.all(
    pages.map(async (p) => {
      if (!p.image_url) { imageMap[p.id] = null; return }
      imageMap[p.id] = await fetchImageBytes(p.image_url)
    })
  )

  // ── 6. Build PDF ─────────────────────────────────────────────────────────
  const pdfDoc = await PDFDocument.create()
  const cfg    = session.config as Record<string, unknown>
  const title  = buildTitle(cfg)

  // Embed metadata
  pdfDoc.setTitle(title)
  pdfDoc.setAuthor('KidColoring')
  pdfDoc.setSubject('Personalized Coloring Book')
  pdfDoc.setKeywords(['coloring', 'kids', 'printable'])
  pdfDoc.setCreator('KidColoring - kidcoloring-research.vercel.app')
  pdfDoc.setProducer('KidColoring pdf-lib v1.8.0')
  pdfDoc.setCreationDate(new Date())

  const fontBold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

  // ── Cover page ──────────────────────────────────────────────────────────
  const coverPage = pdfDoc.addPage([PW, PH])
  // Background
  coverPage.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color: rgb(1, 1, 1) })
  // Outer violet border
  drawBorder(coverPage, 18, 6)
  // Inner dashed border (approximated with thin rectangle)
  drawBorder(coverPage, 28, 1.5, rgb(0.75, 0.60, 0.95))

  // Brand logo text
  drawCentredText(coverPage, '[ KidColoring ]', fontBold, 18, PH - 72, VIOLET)

  // Decorative star strip
  const stars = '*  *  *  *  *  *  *'
  drawCentredText(coverPage, stars, fontRegular, 10, PH - 98, rgb(0.75, 0.60, 0.95))

  // Main title
  const titleFontSize = title.length > 24 ? 36 : 42
  drawCentredText(coverPage, title, fontBold, titleFontSize, PH / 2 + 60, BLACK)

  // Subtitle line
  const interests = (cfg?.interests as string[] | undefined) || []
  if (interests.length > 0) {
    drawCentredText(coverPage, interests.join('  ·  '), fontRegular, 14, PH / 2 + 20, LGRAY)
  }

  // Page count
  const subtitle2 = `${pages.length} custom coloring page${pages.length !== 1 ? 's' : ''}`
  drawCentredText(coverPage, subtitle2, fontRegular, 18, PH / 2 - 16, LGRAY)

  // Decorative bottom stars
  drawCentredText(coverPage, stars, fontRegular, 10, MARGIN + 55, rgb(0.75, 0.60, 0.95))

  // Bottom brand line
  drawCentredText(coverPage, 'Made with love at kidcoloring-research.vercel.app', fontRegular, 9, MARGIN + 30, LGRAY)
  drawCentredText(coverPage, 'Print on any home printer · Color with crayons or markers', fontRegular, 9, MARGIN + 16, LGRAY)

  // ── Coloring pages ───────────────────────────────────────────────────────
  for (let i = 0; i < pages.length; i++) {
    const p         = pages[i]
    const imgBytes  = imageMap[p.id]
    const checkInfo = checkResults[i]

    const pg = pdfDoc.addPage([PW, PH])

    // White background
    pg.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color: rgb(1, 1, 1) })

    // Outer page border
    drawBorder(pg, MARGIN - 6, 3)

    // Header: "Page X of Y"
    const pageLabel = `Page ${i + 1} of ${pages.length}`
    pg.drawText(pageLabel, {
      x: MARGIN, y: PH - MARGIN - 18,
      size: 9, font: fontRegular, color: LGRAY,
    })

    // Header: concept / subject
    const subject = (p.subject as string | undefined) || title
    const subjectLabel = subject.length > 50 ? subject.slice(0, 47) + '...' : subject
    pg.drawText(subjectLabel, {
      x: MARGIN, y: PH - MARGIN - 30,
      size: 11, font: fontBold, color: BLACK,
    })
    pg.drawLine({
      start: { x: MARGIN, y: PH - MARGIN - 36 },
      end:   { x: PW - MARGIN, y: PH - MARGIN - 36 },
      thickness: 0.5, color: rgb(0.88, 0.88, 0.88),
    })

    // Image area
    const imgAreaTop = PH - MARGIN - 46   // below header
    const imgAreaBot = MARGIN + 20        // above footer
    const imgAreaH   = imgAreaTop - imgAreaBot
    const imgAreaW   = INNER_W

    if (imgBytes) {
      try {
        // Try PNG first, then JPEG
        let embedded
        try {
          embedded = await pdfDoc.embedPng(imgBytes)
        } catch {
          embedded = await pdfDoc.embedJpg(imgBytes)
        }

        // Scale to fit within image area (maintain aspect ratio)
        const origW = embedded.width,  origH = embedded.height
        const scaleW = imgAreaW / origW
        const scaleH = imgAreaH / origH
        const scale  = Math.min(scaleW, scaleH, 1)   // never upscale
        const drawW  = origW * scale
        const drawH  = origH * scale
        const drawX  = MARGIN + (imgAreaW - drawW) / 2
        const drawY  = imgAreaBot + (imgAreaH - drawH) / 2

        pg.drawImage(embedded, { x: drawX, y: drawY, width: drawW, height: drawH })

        // Thin border around image
        pg.drawRectangle({
          x: drawX - 1, y: drawY - 1,
          width: drawW + 2, height: drawH + 2,
          borderColor: rgb(0.88, 0.88, 0.88),
          borderWidth: 0.5,
          color: rgb(1, 1, 1),
        })

        // Line-weight check indicator (small badge, top-right of image)
        if (!checkInfo.ok) {
          pg.drawText('! re-generate recommended', {
            x: PW - MARGIN - 160, y: PH - MARGIN - 18,
            size: 7, font: fontRegular, color: rgb(0.9, 0.5, 0.1),
          })
        }
      } catch {
        // Fallback: draw placeholder frame with error note
        pg.drawRectangle({
          x: MARGIN, y: imgAreaBot, width: imgAreaW, height: imgAreaH,
          borderColor: LGRAY, borderWidth: 1, color: rgb(0.98, 0.98, 0.98),
        })
        drawCentredText(pg, '(image unavailable - please re-generate)', fontRegular, 10, imgAreaBot + imgAreaH / 2, LGRAY)
      }
    } else {
      // No image bytes: draw placeholder
      pg.drawRectangle({
        x: MARGIN, y: imgAreaBot, width: imgAreaW, height: imgAreaH,
        borderColor: LGRAY, borderWidth: 1, color: rgb(0.98, 0.98, 0.98),
      })
      drawCentredText(pg, '(coloring page will appear here)', fontRegular, 11, imgAreaBot + imgAreaH / 2, LGRAY)

      // Draw dotted lines as placeholder art for kids to free-draw
      for (let line = 0; line < 8; line++) {
        const ly = imgAreaBot + 60 + line * 60
        pg.drawLine({
          start: { x: MARGIN + 30, y: ly },
          end:   { x: PW - MARGIN - 30, y: ly },
          thickness: 0.5, color: rgb(0.9, 0.9, 0.9), dashArray: [4, 4],
        })
      }
    }

    // Footer
    pg.drawLine({
      start: { x: MARGIN, y: MARGIN + 18 },
      end:   { x: PW - MARGIN, y: MARGIN + 18 },
      thickness: 0.5, color: rgb(0.88, 0.88, 0.88),
    })
    drawCentredText(pg, 'KidColoring  --  Color me!', fontRegular, 8, MARGIN + 6, LGRAY)
  }

  // ── Back cover page ─────────────────────────────────────────────────────
  const backCover = pdfDoc.addPage([PW, PH])
  backCover.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color: rgb(1, 1, 1) })
  drawBorder(backCover, 18, 4)
  drawCentredText(backCover, '[ KidColoring ]', fontBold, 20, PH / 2 + 80, VIOLET)
  drawCentredText(backCover, 'Make more personalized coloring books!', fontRegular, 13, PH / 2 + 40, BLACK)
  drawCentredText(backCover, 'kidcoloring-research.vercel.app', fontBold, 14, PH / 2 + 14, VIOLET)
  drawCentredText(backCover, 'Free trial · 4 pages · No account needed', fontRegular, 11, PH / 2 - 16, LGRAY)
  drawCentredText(backCover, stars, fontRegular, 10, PH / 2 - 50, rgb(0.75, 0.60, 0.95))

  // ── 7. Serialize PDF ─────────────────────────────────────────────────────
  const pdfBytes = await pdfDoc.save()

  // ── 8. Upload to Supabase Storage ────────────────────────────────────────
  const storagePath = `pdfs/${sessionId}.pdf`
  const { error: uploadError } = await sb.storage
    .from('exports')
    .upload(storagePath, pdfBytes, {
      contentType: 'application/pdf',
      upsert: true,
      // Cache for 24h since books rarely change
      cacheControl: '86400',
    })

  if (uploadError) {
    console.error('[pdf/export] Storage upload failed:', uploadError)
    return NextResponse.json({ error: 'storage_upload_failed', detail: uploadError.message }, { status: 500 })
  }

  // Get public URL
  const { data: publicUrlData } = sb.storage.from('exports').getPublicUrl(storagePath)
  const pdfUrl = publicUrlData.publicUrl

  // ── 9. Save URL back to trial_sessions ───────────────────────────────────
  await sb
    .from('trial_sessions')
    .update({ pdf_url: pdfUrl, pdf_generated_at: new Date().toISOString() })
    .eq('id', sessionId)

  // ── 10. Fire export_clicked telemetry event ──────────────────────────────
  await sb.from('events').insert({
    event_name: 'export_clicked',
    session_id: sessionId,
    properties: {
      source:        'pdf_api',
      page_count:    pages.length,
      pdf_size_kb:   Math.round(pdfBytes.byteLength / 1024),
      check_pass:    passCount,
      check_fail:    failCount,
      storage_path:  storagePath,
      _ts:           Date.now(),
    },
  })

  // ── 11. Return result ────────────────────────────────────────────────────
  return NextResponse.json({
    ok:          true,
    pdfUrl,
    storagePath,
    pageCount:   pages.length,
    pdfSizeKb:   Math.round(pdfBytes.byteLength / 1024),
    qualityCheck: {
      pass:    passCount,
      fail:    failCount,
      details: checkResults.map(c => ({
        pageNumber: c.pageNumber,
        ok:         c.ok,
        reason:     c.reason,
        sizeKb:     c.contentLength ? Math.round(c.contentLength / 1024) : null,
      })),
    },
  })
}

// ── GET /api/v1/export/pdf?sessionId=... - check if PDF already exists ────────
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'sessionId_required' }, { status: 400 })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data } = await sb
    .from('trial_sessions')
    .select('pdf_url, pdf_generated_at')
    .eq('id', sessionId)
    .single()

  if (data?.pdf_url) {
    return NextResponse.json({ exists: true, pdfUrl: data.pdf_url, generatedAt: data.pdf_generated_at })
  }
  return NextResponse.json({ exists: false })
}

// Workaround: export stars reference used in cover/back
