/**
 * lib/pdf-renderer.ts
 * Server-side PDF generation using pdf-lib.
 * Renders a generated contract's legal text into a structured PDF document
 * with PactTailor branding, metadata, provenance footer, and all clause sections.
 */

import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib';

export interface PdfRenderInput {
  legalText:        string;
  documentId:       string;
  templateSlug:     string;
  templateVersion:  string;
  creatorName:      string | null;
  productName:      string | null;
  jurisdictionCode: string | null;
  platformCode:     string | null;
  verificationHash: string | null;
  generatedAt:      string;
  appUrl?:          string;
}

const APP_URL = 'https://pacttailor.com';

// ─── Colours ─────────────────────────────────────────────────────────────────

const INDIGO    = rgb(0.31, 0.22, 0.90); // #4f38e6 approx
const DARK      = rgb(0.07, 0.07, 0.09); // near black
const GREY      = rgb(0.44, 0.44, 0.50);
const LIGHT_GREY = rgb(0.93, 0.93, 0.95);
const AMBER     = rgb(0.92, 0.60, 0.10);
const WHITE     = rgb(1, 1, 1);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')   // bold
    .replace(/\*([^*]+)\*/g, '$1')        // italic
    .replace(/^#{1,6}\s+/gm, '')          // headings
    .replace(/^---+$/gm, '')              // horizontal rules
    .replace(/`([^`]+)`/g, '$1')          // inline code
    // Remove emoji and non-WinAnsi characters
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{27FF}]/gu, '')
    .replace(/[^\x00-\xFF]/g, '');         // keep only Latin-1
}

/** Wrap text to fit within a given pixel width, returning lines */
function wrapText(text: string, font: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>, fontSize: number, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const para of paragraphs) {
    if (!para.trim()) { lines.push(''); continue; }
    const words = para.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  return lines;
}

/** Parse legal text into sections split by numbered headings */
function parseSections(legalText: string): Array<{ heading: string; body: string; isMeta: boolean }> {
  const sections: Array<{ heading: string; body: string; isMeta: boolean }> = [];
  const parts = legalText.split(/\n\*\*(\d+\.\s+[^*]+)\*\*/);

  // Preamble (header block)
  if (parts[0]?.trim()) {
    sections.push({ heading: 'Header', body: parts[0].trim(), isMeta: true });
  }

  for (let i = 1; i < parts.length; i += 2) {
    const heading = parts[i]?.trim() ?? '';
    const body    = (parts[i + 1] ?? '').trim();
    if (heading) {
      sections.push({ heading, body, isMeta: false });
    }
  }

  return sections;
}

// ─── Main render function ─────────────────────────────────────────────────────

export async function renderToPdf(input: PdfRenderInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // Set document metadata
  pdfDoc.setTitle(input.productName ?? input.templateSlug ?? 'PactTailor Contract');
  pdfDoc.setAuthor(input.creatorName ?? 'PactTailor');
  pdfDoc.setSubject(`${input.templateSlug} v${input.templateVersion} · ${input.jurisdictionCode ?? 'US'}`);
  pdfDoc.setCreator('PactTailor v2.0.0 · pacttailor.com');
  pdfDoc.setProducer('PactTailor · pdf-lib');
  pdfDoc.setCreationDate(new Date(input.generatedAt));
  pdfDoc.setKeywords([
    'contract', 'license', 'pacttailor',
    input.jurisdictionCode ?? 'US',
    input.platformCode ?? '',
    input.documentId,
  ]);

  const appUrl = input.appUrl ?? APP_URL;
  const verifyUrl = input.verificationHash
    ? `${appUrl}/verify/${input.verificationHash.slice(0, 16)}`
    : null;

  // ── Fonts ────────────────────────────────────────────────────────────────
  const fontBold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMono    = await pdfDoc.embedFont(StandardFonts.Courier);

  // ── Page dimensions ──────────────────────────────────────────────────────
  const [pageW, pageH] = PageSizes.Letter;  // 612 x 792
  const marginL = 54;
  const marginR = 54;
  const marginT = 60;
  const marginB = 54;
  const contentW = pageW - marginL - marginR;

  let page = pdfDoc.addPage([pageW, pageH]);
  let y = pageH - marginT;

  // ── Helper: add new page ─────────────────────────────────────────────────
  const newPage = () => {
    page = pdfDoc.addPage([pageW, pageH]);
    y = pageH - marginT;
    // Footer on each page
    const pageNum = pdfDoc.getPageCount();
    page.drawText(`PactTailor · pacttailor.com · ${input.documentId} · Page ${pageNum}`, {
      x: marginL, y: marginB - 10,
      size: 7, font: fontReg, color: GREY,
    });
  };

  // ── Helper: ensure space ─────────────────────────────────────────────────
  const ensureSpace = (needed: number) => {
    if (y - needed < marginB + 30) newPage();
  };

  // ── Cover / header block ──────────────────────────────────────────────────

  // PactTailor branding bar
  page.drawRectangle({ x: 0, y: pageH - 44, width: pageW, height: 44, color: INDIGO });
  page.drawText('PactTailor', { x: marginL, y: pageH - 28, size: 18, font: fontBold, color: WHITE });
  page.drawText('pacttailor.com', { x: pageW - marginR - 70, y: pageH - 28, size: 9, font: fontReg, color: rgb(0.8, 0.8, 1) });

  y = pageH - 44 - 24;

  // Disclaimer banner
  page.drawRectangle({ x: marginL, y: y - 22, width: contentW, height: 22, color: rgb(1, 0.97, 0.90) });
  page.drawRectangle({ x: marginL, y: y - 22, width: 3, height: 22, color: AMBER });
  page.drawText('[!] Templates only — not legal advice. Consult a licensed attorney.', {
    x: marginL + 8, y: y - 14,
    size: 8, font: fontBold, color: rgb(0.55, 0.35, 0),
  });
  y -= 38;

  // Title
  const title = input.productName ?? input.templateSlug ?? 'Contract';
  page.drawText(title, { x: marginL, y, size: 18, font: fontBold, color: DARK });
  y -= 24;

  // Meta row
  const metaItems = [
    input.creatorName ? `Creator: ${input.creatorName}` : null,
    input.jurisdictionCode ? `Jurisdiction: ${input.jurisdictionCode}` : null,
    input.platformCode ? `Platform: ${input.platformCode}` : null,
    `Generated: ${new Date(input.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
  ].filter(Boolean).join('  ·  ');

  page.drawText(metaItems, { x: marginL, y, size: 9, font: fontReg, color: GREY });
  y -= 14;

  // Separator line
  page.drawLine({ start: { x: marginL, y }, end: { x: pageW - marginR, y }, thickness: 0.5, color: LIGHT_GREY });
  y -= 18;

  // ── Parse and render sections ─────────────────────────────────────────────

  const sections = parseSections(input.legalText);

  for (const section of sections) {
    if (section.isMeta) {
      // Render preamble lines (Between:, Governing Law:, etc.)
      const lines = section.body.split('\n').filter(l => l.trim());
      for (const line of lines) {
        const clean = stripMarkdown(line).trim();
        if (!clean || clean === '---') continue;
        ensureSpace(16);
        page.drawText(clean.slice(0, 90), { x: marginL, y, size: 9, font: fontReg, color: GREY });
        y -= 13;
      }
      y -= 6;
      continue;
    }

    // Section heading
    ensureSpace(32);
    page.drawRectangle({ x: marginL, y: y - 16, width: contentW, height: 20, color: rgb(0.95, 0.95, 0.98) });
    page.drawText(section.heading, { x: marginL + 6, y: y - 11, size: 10, font: fontBold, color: INDIGO });
    y -= 26;

    // Section body
    const bodyLines = wrapText(stripMarkdown(section.body), fontReg, 9.5, contentW - 12);
    for (const line of bodyLines) {
      if (!line.trim()) { y -= 6; continue; }
      ensureSpace(14);
      page.drawText(line, { x: marginL + 6, y, size: 9.5, font: fontReg, color: DARK });
      y -= 13;
    }
    y -= 10;
  }

  // ── Provenance footer block ───────────────────────────────────────────────

  ensureSpace(80);
  y -= 10;
  page.drawLine({ start: { x: marginL, y }, end: { x: pageW - marginR, y }, thickness: 0.5, color: LIGHT_GREY });
  y -= 14;

  page.drawText('Document Provenance', { x: marginL, y, size: 10, font: fontBold, color: DARK });
  y -= 14;

  const provenanceLines: [string, string][] = [
    ['Document ID',       input.documentId],
    ['Template',          `${input.templateSlug} v${input.templateVersion}`],
    ['Generator',         'PactTailor v2.0.0'],
    ['Verification hash', (input.verificationHash ?? '—').slice(0, 40) + (input.verificationHash && input.verificationHash.length > 40 ? '…' : '')],
    ['Verify at',         verifyUrl ?? '—'],
  ];

  for (const [k, v] of provenanceLines) {
    ensureSpace(14);
    page.drawText(`${k}:`, { x: marginL, y, size: 8, font: fontBold, color: GREY });
    page.drawText(v, { x: marginL + 100, y, size: 8, font: fontMono, color: DARK });
    y -= 12;
  }

  y -= 8;
  const disclaimerText = 'This document was generated using PactTailor clause templates. It is NOT legal advice.';
  page.drawText(disclaimerText, { x: marginL, y, size: 7.5, font: fontReg, color: GREY });

  // Footer on first page
  const totalPages = pdfDoc.getPageCount();
  const firstPage = pdfDoc.getPage(0);
  firstPage.drawText(`PactTailor · pacttailor.com · ${input.documentId} · Page 1 of ${totalPages}`, {
    x: marginL, y: marginB - 10,
    size: 7, font: fontReg, color: GREY,
  });

  return pdfDoc.save();
}
