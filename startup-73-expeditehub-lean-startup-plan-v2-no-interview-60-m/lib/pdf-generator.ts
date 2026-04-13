/**
 * PDF Generator for Austin ADU Permit Packet
 * Uses pdf-lib to produce a clean, multi-section permit application PDF.
 */

import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib'
import { PacketDraft } from './autofill'
import { FilledField } from './form-template'

const BRAND_BLUE   = rgb(0.09, 0.36, 0.84)
const BRAND_LIGHT  = rgb(0.93, 0.96, 1.0)
const GRAY_TEXT    = rgb(0.35, 0.35, 0.35)
const GRAY_LINE    = rgb(0.85, 0.85, 0.85)
const GREEN        = rgb(0.13, 0.62, 0.35)
const AMBER        = rgb(0.80, 0.54, 0.02)
const RED_C        = rgb(0.72, 0.16, 0.16)
const BLACK        = rgb(0.1,  0.1,  0.1)
const WHITE        = rgb(1, 1, 1)

const MARGIN = 50
const PAGE_W = PageSizes.Letter[0]
const PAGE_H = PageSizes.Letter[1]
const COL_W  = PAGE_W - MARGIN * 2
const LINE_H = 16

function confidenceColor(c: FilledField['confidence']) {
  if (c === 'high')    return GREEN
  if (c === 'medium')  return AMBER
  if (c === 'low')     return AMBER
  return RED_C
}

function confidenceLabel(c: FilledField['confidence']) {
  if (c === 'high')    return 'OK'
  if (c === 'medium')  return '~'
  return '!'
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

export async function generatePacketPdf(packet: PacketDraft, projectAddress: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle('ExpediteHub ADU Permit Packet Draft')
  doc.setAuthor('ExpediteHub (AI-assisted)')
  doc.setSubject(`Austin ADU Permit Application - ${projectAddress}`)
  doc.setCreationDate(new Date())

  const font      = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold  = await doc.embedFont(StandardFonts.HelveticaBold)

  let page = doc.addPage(PageSizes.Letter)
  let y = PAGE_H - MARGIN

  // Helper: add new page and reset y
  const newPage = () => {
    page = doc.addPage(PageSizes.Letter)
    y = PAGE_H - MARGIN
    drawPageHeader()
  }

  const checkY = (needed: number) => {
    if (y < MARGIN + needed) newPage()
  }

  const drawText = (text: string, x: number, size: number, isBold = false, color = BLACK) => {
    page.drawText(truncate(text, 120), { x, y, size, font: isBold ? fontBold : font, color })
  }

  const drawLine = (x1: number, x2: number, yy = y, thickness = 0.5, color = GRAY_LINE) => {
    page.drawLine({ start: { x: x1, y: yy }, end: { x: x2, y: yy }, thickness, color })
  }

  const drawPageHeader = () => {
    // Blue header bar
    page.drawRectangle({ x: 0, y: PAGE_H - 40, width: PAGE_W, height: 40, color: BRAND_BLUE })
    page.drawText('ExpediteHub · Austin ADU Permit Packet Draft', {
      x: MARGIN, y: PAGE_H - 26, size: 11, font: fontBold, color: WHITE,
    })
    page.drawText(`DRAFT - NOT FOR OFFICIAL SUBMISSION`, {
      x: PAGE_W - 230, y: PAGE_H - 26, size: 8, font, color: rgb(0.8, 0.9, 1),
    })
  }

  // ── Cover Page ───────────────────────────────────────────────────────────────
  drawPageHeader()
  y = PAGE_H - 70

  // Score badge
  const scoreColor = packet.autofill_score >= 70 ? GREEN : packet.autofill_score >= 50 ? AMBER : RED_C
  page.drawRectangle({ x: MARGIN, y: y - 5, width: COL_W, height: 80, color: BRAND_LIGHT, borderColor: BRAND_BLUE, borderWidth: 1 })
  page.drawText('AI AUTOFILL SUMMARY', { x: MARGIN + 15, y: y + 60, size: 9, font: fontBold, color: BRAND_BLUE })
  page.drawText(`${packet.autofill_score}%`, { x: MARGIN + 15, y: y + 32, size: 32, font: fontBold, color: scoreColor })
  page.drawText('of required fields pre-filled', { x: MARGIN + 80, y: y + 32, size: 10, font, color: GRAY_TEXT })
  page.drawText(`${packet.filled_required} / ${packet.total_required} required fields · Version ${packet.version}`, {
    x: MARGIN + 80, y: y + 18, size: 9, font, color: GRAY_TEXT,
  })
  page.drawText(`Generated: ${new Date(packet.generated_at).toLocaleString()}`, {
    x: MARGIN + 80, y: y + 5, size: 8, font, color: GRAY_TEXT,
  })
  y -= 20

  // Missing fields callout
  if (packet.missing_fields.length > 0) {
    y -= 20
    page.drawRectangle({ x: MARGIN, y: y - 5, width: COL_W, height: 14 * Math.ceil(packet.missing_fields.length / 3) + 20,
      color: rgb(1, 0.97, 0.93), borderColor: AMBER, borderWidth: 1 })
    page.drawText('Fields requiring manual input:', { x: MARGIN + 10, y: y + 8, size: 9, font: fontBold, color: AMBER })
    y -= 15
    const cols = 3
    packet.missing_fields.forEach((f, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      page.drawText(`• ${f}`, {
        x: MARGIN + 10 + col * (COL_W / cols),
        y: y - row * 14,
        size: 8, font, color: rgb(0.5, 0.3, 0),
      })
    })
    y -= (Math.ceil(packet.missing_fields.length / cols) * 14) + 10
  }

  y -= 30
  drawLine(MARGIN, PAGE_W - MARGIN)
  y -= 15
  page.drawText('INSTRUCTIONS FOR EXPEDITER', { x: MARGIN, y, size: 10, font: fontBold, color: BRAND_BLUE })
  y -= 14
  const instructions = [
    '1. Review all fields marked with "~" (medium confidence) and "!" (low/missing).',
    '2. Fields from Section A (parcel/legal) and Section F (contractor) require manual lookup.',
    '3. Setbacks (Section D) are code minimums - verify against actual site plan.',
    '4. Construction value (Section G) is an AI estimate - update with contractor bid.',
    '5. Sign and certify Section E before submission to Austin DSD.',
  ]
  instructions.forEach(line => {
    page.drawText(line, { x: MARGIN + 5, y, size: 9, font, color: GRAY_TEXT })
    y -= 13
  })

  y -= 15
  drawLine(MARGIN, PAGE_W - MARGIN)
  y -= 5

  // ── Form Sections ────────────────────────────────────────────────────────────
  const sections = [...new Set(packet.fields.map(f => f.section))]

  for (const section of sections) {
    const sectionFields = packet.fields.filter(f => f.section === section)
    checkY(30)

    // Section header
    y -= 18
    page.drawRectangle({ x: MARGIN, y: y - 2, width: COL_W, height: 18, color: BRAND_BLUE })
    page.drawText(section, { x: MARGIN + 8, y: y + 3, size: 10, font: fontBold, color: WHITE })
    y -= 8

    // Fields
    for (const field of sectionFields) {
      checkY(18)
      y -= LINE_H

      const isRequired = field.required
      const hasValue = field.value !== null && field.value !== undefined && field.value !== ''

      // Field label
      page.drawText(`${isRequired ? '* ' : '  '}${field.label}`, {
        x: MARGIN + 4, y: y, size: 8,
        font: isRequired ? fontBold : font,
        color: isRequired ? BLACK : GRAY_TEXT,
      })

      // Value box
      const boxX = MARGIN + 190
      const boxW = COL_W - 190 - 30
      page.drawRectangle({
        x: boxX, y: y - 3, width: boxW, height: 13,
        color: hasValue ? WHITE : rgb(0.97, 0.97, 0.97),
        borderColor: hasValue ? GRAY_LINE : rgb(0.85, 0.85, 0.85),
        borderWidth: 0.5,
      })

      if (hasValue) {
        const displayValue = field.type === 'checkbox'
          ? (field.value ? 'YES' : 'NO')
          : String(field.value)
        page.drawText(truncate(displayValue, 60), {
          x: boxX + 3, y: y, size: 8, font, color: BLACK,
        })
      } else {
        page.drawText('[ needs input ]', {
          x: boxX + 3, y: y, size: 7, font, color: RED_C,
        })
      }

      // Confidence indicator
      const confColor = confidenceColor(field.confidence)
      const confLabel = confidenceLabel(field.confidence)
      page.drawText(confLabel, {
        x: MARGIN + 190 + boxW + 5, y: y, size: 10, font: fontBold, color: confColor,
      })

      // Source tag
      page.drawText(field.source, {
        x: MARGIN + 190 + boxW + 18, y: y, size: 6, font, color: GRAY_TEXT,
      })
    }

    y -= 6
    drawLine(MARGIN, PAGE_W - MARGIN, y)
  }

  // ── Legend page footer ────────────────────────────────────────────────────────
  checkY(40)
  y -= 20
  drawLine(MARGIN, PAGE_W - MARGIN)
  y -= 12
  page.drawText('CONFIDENCE LEGEND:', { x: MARGIN, y, size: 8, font: fontBold, color: BLACK })
  y -= 11
  const legendItems = [
    { symbol: 'OK HIGH',   color: GREEN,  desc: 'Directly from intake form or verified GIS data' },
    { symbol: '~ MEDIUM', color: AMBER,  desc: 'Estimated/inferred from rules - review before submission' },
    { symbol: '! LOW',    color: RED_C,  desc: 'Assumed default or flagged for manual verification' },
  ]
  legendItems.forEach(item => {
    page.drawText(`${item.symbol} - ${item.desc}`, { x: MARGIN + 5, y, size: 8, font, color: item.color })
    y -= 11
  })

  y -= 8
  page.drawText(
    `This packet draft was automatically generated by ExpediteHub AI. It is for professional review only and does not constitute a completed permit application.`,
    { x: MARGIN, y, size: 7, font, color: GRAY_TEXT, maxWidth: COL_W }
  )

  const pdfBytes = await doc.save()
  return pdfBytes
}
