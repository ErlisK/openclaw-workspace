/**
 * lib/html-renderer.ts
 * Renders a generated contract to self-contained styled HTML.
 * Embeds JSON-LD provenance metadata in <head>.
 * Suitable for download or iframe embedding.
 */

import { buildJsonLd } from './jsonld';

export interface HtmlRenderInput {
  legalText:        string;
  plainText:        string;
  documentId:       string;
  templateSlug:     string;
  templateVersion:  string;
  creatorName:      string | null;
  productName:      string | null;
  jurisdictionCode: string | null;
  platformCode:     string | null;
  verificationHash: string | null;
  templateHash:     string | null;
  clauseHashes:     Record<string, string> | null;
  changelog:        string[] | null;
  generatorVersion: string | null;
  generatedAt:      string;
  appUrl?:          string;
  // Optional template version metadata
  tvVersion?:        string | null;
  tvChangelog?:      string | null;
  tvPublishedAt?:    string | null;
  tvLawyerName?:     string | null;
  tvLawyerReviewedAt?: string | null;
}

const APP_URL = 'https://pacttailor.com';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function markdownToHtml(md: string): string {
  return md
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^---+$/gm, '<hr/>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');
}

/** Parse legal text into clause sections */
function parseSectionsHtml(legalText: string): Array<{ heading: string; body: string; isMeta: boolean }> {
  const sections: Array<{ heading: string; body: string; isMeta: boolean }> = [];
  const parts = legalText.split(/\n\*\*(\d+\.\s+[^*]+)\*\*/);

  if (parts[0]?.trim()) {
    sections.push({ heading: 'Header', body: parts[0].trim(), isMeta: true });
  }
  for (let i = 1; i < parts.length; i += 2) {
    const heading = parts[i]?.trim() ?? '';
    const body    = (parts[i + 1] ?? '').trim();
    if (heading) sections.push({ heading, body, isMeta: false });
  }
  return sections;
}

export function renderToHtml(input: HtmlRenderInput): string {
  const appUrl = input.appUrl ?? APP_URL;
  const verifyUrl = input.verificationHash
    ? `${appUrl}/verify/${input.verificationHash.slice(0, 16)}`
    : null;

  const title = escapeHtml(input.productName ?? input.templateSlug ?? 'Contract');
  const docType = (input.templateSlug ?? '').replace(/-/g, ' ');
  const genDate = new Date(input.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // Build JSON-LD
  const jsonLd = buildJsonLd({
    documentId:       input.documentId,
    templateSlug:     input.templateSlug,
    templateName:     input.productName ?? input.templateSlug,
    templateVersion:  input.templateVersion,
    documentType:     input.templateSlug,
    creatorName:      input.creatorName,
    productName:      input.productName,
    jurisdictionCode: input.jurisdictionCode,
    platformCode:     input.platformCode,
    verificationHash: input.verificationHash,
    templateHash:     input.templateHash,
    clauseHashes:     input.clauseHashes,
    changelog:        input.changelog,
    generatorVersion: input.generatorVersion,
    generatedAt:      input.generatedAt,
  });

  // Render clause sections
  const sections = parseSectionsHtml(input.legalText);
  let clausesHtml = '';

  for (const section of sections) {
    if (section.isMeta) {
      const lines = section.body.split('\n').map(l => {
        const clean = l.trim().replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        return clean ? `<p class="meta-line">${clean}</p>` : '';
      }).join('');
      clausesHtml += `<div class="preamble">${lines}</div>`;
    } else {
      const bodyHtml = markdownToHtml(escapeHtml(section.body));
      clausesHtml += `
        <section class="clause">
          <h3 class="clause-heading">${escapeHtml(section.heading)}</h3>
          <div class="clause-body"><p>${bodyHtml}</p></div>
        </section>`;
    }
  }

  // Clause hash table
  const clauseHashRows = input.clauseHashes
    ? Object.entries(input.clauseHashes).map(([k, v]) =>
        `<tr><td>${escapeHtml(k)}</td><td class="mono">${v}</td></tr>`
      ).join('')
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title} | PactTailor</title>
  <meta name="description" content="Generated contract: ${title}. Jurisdiction: ${input.jurisdictionCode ?? 'US'}. Template: ${input.templateSlug}."/>
  <meta name="generator" content="PactTailor v${input.generatorVersion ?? '2.0.0'}"/>
  <meta name="document-id" content="${input.documentId}"/>
  ${verifyUrl ? `<link rel="canonical" href="${verifyUrl}"/>` : ''}
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, 'Times New Roman', serif; font-size: 14px; line-height: 1.6;
           color: #111; background: #fff; max-width: 800px; margin: 0 auto; padding: 40px 32px; }
    .brand-bar { background: #4338ca; color: #fff; padding: 12px 20px; margin: -40px -32px 32px;
                 display: flex; justify-content: space-between; align-items: center; }
    .brand-bar .logo { font-family: sans-serif; font-size: 18px; font-weight: 700; }
    .brand-bar .tagline { font-family: sans-serif; font-size: 11px; opacity: 0.7; }
    .disclaimer-banner { background: #fffbeb; border: 1px solid #f59e0b; border-left: 4px solid #f59e0b;
                         padding: 10px 14px; margin-bottom: 24px; font-family: sans-serif;
                         font-size: 12px; color: #92400e; font-weight: 600; }
    h1 { font-size: 24px; font-weight: 700; color: #111; margin-bottom: 6px; font-family: sans-serif; }
    .doc-meta { font-family: sans-serif; font-size: 12px; color: #666; margin-bottom: 24px; }
    .doc-meta span { margin-right: 12px; }
    hr.section-break { border: none; border-top: 1px solid #e5e5e5; margin: 20px 0; }
    .preamble { background: #f8f9fa; border: 1px solid #e5e5e5; padding: 16px; margin-bottom: 24px;
                border-radius: 6px; font-family: sans-serif; font-size: 13px; }
    .preamble .meta-line { margin-bottom: 4px; color: #444; }
    .clause { margin-bottom: 24px; page-break-inside: avoid; }
    .clause-heading { font-family: sans-serif; font-size: 13px; font-weight: 700; color: #4338ca;
                      background: #f0f0ff; padding: 8px 12px; border-radius: 4px; margin-bottom: 10px; }
    .clause-body { padding: 0 12px; font-size: 13px; line-height: 1.7; color: #222; }
    .clause-body p { margin-bottom: 8px; }
    .provenance-block { background: #f8f9fa; border: 1px solid #e5e5e5; padding: 20px;
                        margin-top: 40px; border-radius: 6px; font-family: sans-serif; font-size: 12px; }
    .provenance-block h2 { font-size: 14px; margin-bottom: 12px; color: #111; }
    .prov-row { display: flex; gap: 12px; margin-bottom: 6px; }
    .prov-label { color: #666; width: 140px; flex-shrink: 0; }
    .prov-value { color: #111; word-break: break-all; }
    .mono { font-family: 'Courier New', monospace; font-size: 11px; }
    .clause-hash-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
    .clause-hash-table th { background: #f0f0f0; text-align: left; padding: 4px 8px; font-family: sans-serif; }
    .clause-hash-table td { padding: 3px 8px; border-bottom: 1px solid #f0f0f0; font-family: sans-serif; }
    .clause-hash-table td.mono { font-family: 'Courier New', monospace; color: #666; }
    .verify-link { display: inline-block; margin-top: 12px; color: #4338ca; font-weight: 600; }
    .final-disclaimer { background: #fffbeb; border: 1px solid #f59e0b; padding: 14px 16px;
                        margin-top: 24px; font-family: sans-serif; font-size: 12px; color: #92400e;
                        border-radius: 6px; }
    @media print {
      .brand-bar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .clause { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="brand-bar">
    <span class="logo">PactTailor</span>
    <span class="tagline">pacttailor.com · Templates only, not legal advice</span>
  </div>

  <div class="disclaimer-banner">
    ⚠️ Templates only — not legal advice. This document was generated using PactTailor clause templates.
    Consult a licensed attorney for jurisdiction-specific guidance.
  </div>

  <h1>${title}</h1>
  <div class="doc-meta">
    ${input.creatorName ? `<span><strong>Creator:</strong> ${escapeHtml(input.creatorName)}</span>` : ''}
    ${input.jurisdictionCode ? `<span><strong>Jurisdiction:</strong> ${input.jurisdictionCode}</span>` : ''}
    ${input.platformCode ? `<span><strong>Platform:</strong> ${input.platformCode}</span>` : ''}
    <span><strong>Generated:</strong> ${genDate}</span>
    <span><strong>Template:</strong> ${escapeHtml(docType)} v${input.templateVersion}</span>
  </div>

  <hr class="section-break"/>

  ${clausesHtml}

  <!-- Provenance block -->
  <div class="provenance-block">
    <h2>📋 Document Provenance</h2>
    <div class="prov-row"><span class="prov-label">Document ID</span><span class="prov-value mono">${input.documentId}</span></div>
    <div class="prov-row"><span class="prov-label">Template</span><span class="prov-value">${escapeHtml(input.templateSlug)} v${input.templateVersion}</span></div>
    <div class="prov-row"><span class="prov-label">Generator</span><span class="prov-value">PactTailor v${input.generatorVersion ?? '2.0.0'}</span></div>
    <div class="prov-row"><span class="prov-label">Verification hash</span><span class="prov-value mono">${input.verificationHash ?? '—'}</span></div>
    ${verifyUrl ? `<a href="${verifyUrl}" class="verify-link">🔗 Verify provenance at PactTailor →</a>` : ''}
    ${clauseHashRows ? `
    <details style="margin-top:14px">
      <summary style="cursor:pointer;font-weight:600;color:#444">Clause hashes (${Object.keys(input.clauseHashes ?? {}).length})</summary>
      <table class="clause-hash-table" style="margin-top:8px">
        <thead><tr><th>Clause</th><th>Hash (SHA-256, 16 chars)</th></tr></thead>
        <tbody>${clauseHashRows}</tbody>
      </table>
    </details>` : ''}
  </div>

  <div class="final-disclaimer">
    <strong>⚠️ Not Legal Advice.</strong> This document was generated using PactTailor clause templates.
    It is not a substitute for legal advice. PactTailor is not a law firm. Consult a licensed attorney
    for jurisdiction-specific guidance. Contact: <a href="mailto:hello@pacttailor.com">hello@pacttailor.com</a>
  </div>
</body>
</html>`;
}
