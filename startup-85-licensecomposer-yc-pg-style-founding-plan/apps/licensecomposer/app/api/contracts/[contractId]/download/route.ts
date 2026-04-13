/**
 * app/api/contracts/[contractId]/download/route.ts
 * GET /api/contracts/:id/download?format=pdf|html|md|txt|jsonld
 *     &store=1    — upload to Supabase Storage and return signed URL
 *     &inline=1   — serve inline (no Content-Disposition download)
 *
 * Formats:
 *   pdf    — PDF with branding, sections, provenance footer (pdf-lib)
 *   html   — Styled standalone HTML with JSON-LD <head>
 *   md     — Markdown with provenance metadata block + JSON-LD code block
 *   txt    — Plain text with JSON-LD comment block
 *   jsonld — Raw JSON-LD provenance file
 */
import { NextResponse } from 'next/server';
import { createServiceClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { buildJsonLd, jsonLdToDocumentComment, jsonLdToMarkdownBlock } from '@/lib/jsonld';
import { renderToPdf } from '@/lib/pdf-renderer';
import { renderToHtml } from '@/lib/html-renderer';
import { storeExport, type ExportFormat } from '@/lib/export-storage';

export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const { contractId } = await params;
  const { searchParams } = new URL(request.url);
  const format  = (searchParams.get('format') ?? 'pdf') as ExportFormat;
  const store   = searchParams.get('store') === '1';
  const inline  = searchParams.get('inline') === '1';

  const validFormats: ExportFormat[] = ['pdf', 'html', 'md', 'txt', 'jsonld'];
  if (!validFormats.includes(format)) {
    return NextResponse.json({ error: `Invalid format. Use: ${validFormats.join(', ')}` }, { status: 400 });
  }

  const svc = createServiceClient();

  // Fetch contract data
  const { data: contract, error } = await svc
    .from('generated_contracts')
    .select(`
      filled_legal_text, filled_plain_text, document_id,
      template_slug, template_version, template_version_id,
      creator_name, product_name, document_type,
      jurisdiction_code, platform_code,
      verification_hash, template_hash, clause_hashes,
      changelog, generator_version, generated_at
    `)
    .eq('document_id', contractId)
    .single();

  if (error || !contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  }

  // Fetch template version for enriched provenance
  let tv: Record<string, unknown> | null = null;
  if (contract.template_version_id) {
    const { data } = await svc
      .from('template_versions')
      .select('version, changelog, published_at, lawyer_name, lawyer_reviewed_at')
      .eq('id', contract.template_version_id)
      .single();
    tv = data;
  }

  // Get authenticated user (optional — exports work without auth for now)
  let userId: string | null = null;
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    userId = user?.id ?? null;
  } catch { /* anon access OK */ }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pacttailor.com';

  // Build shared input objects
  const renderInput = {
    legalText:        contract.filled_legal_text ?? '',
    plainText:        contract.filled_plain_text ?? '',
    documentId:       contract.document_id,
    templateSlug:     contract.template_slug ?? '',
    templateVersion:  contract.template_version ?? tv?.version as string ?? '1.0.0',
    creatorName:      contract.creator_name,
    productName:      contract.product_name,
    jurisdictionCode: contract.jurisdiction_code,
    platformCode:     contract.platform_code,
    verificationHash: contract.verification_hash,
    templateHash:     contract.template_hash,
    clauseHashes:     contract.clause_hashes as Record<string, string> | null,
    changelog:        contract.changelog as string[] | null,
    generatorVersion: contract.generator_version,
    generatedAt:      contract.generated_at,
    appUrl,
    tvVersion:        tv?.version as string | null,
    tvChangelog:      tv?.changelog as string | null,
    tvPublishedAt:    tv?.published_at as string | null,
    tvLawyerName:     tv?.lawyer_name as string | null,
    tvLawyerReviewedAt: tv?.lawyer_reviewed_at as string | null,
  };

  // ── Render ──────────────────────────────────────────────────────────────

  let content: Uint8Array | string;
  let mimeType: string;
  let filename: string;
  const slug = contract.template_slug ?? 'contract';

  if (format === 'pdf') {
    content  = await renderToPdf(renderInput);
    mimeType = 'application/pdf';
    filename = `pacttailor-${contract.document_id}.pdf`;

  } else if (format === 'html') {
    content  = renderToHtml(renderInput);
    mimeType = 'text/html; charset=utf-8';
    filename = `pacttailor-${contract.document_id}.html`;

  } else if (format === 'md') {
    const jsonLd = buildJsonLd({ ...renderInput, templateName: slug, documentType: slug });
    content  = (contract.filled_legal_text ?? '') + jsonLdToMarkdownBlock(jsonLd);
    mimeType = 'text/markdown; charset=utf-8';
    filename = `pacttailor-${contract.document_id}.md`;

  } else if (format === 'txt') {
    const jsonLd = buildJsonLd({ ...renderInput, templateName: slug, documentType: slug });
    const stripped = (contract.filled_legal_text ?? '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^---+$/gm, '---');
    content  = stripped + '\n' + jsonLdToDocumentComment(jsonLd);
    mimeType = 'text/plain; charset=utf-8';
    filename = `pacttailor-${contract.document_id}.txt`;

  } else {
    // jsonld
    const jsonLd = buildJsonLd({ ...renderInput, templateName: slug, documentType: slug });
    content  = JSON.stringify(jsonLd, null, 2);
    mimeType = 'application/ld+json';
    filename = `pacttailor-${contract.document_id}-provenance.json`;
  }

  // ── Store to Supabase Storage (if requested) ─────────────────────────────

  if (store) {
    const stored = await storeExport(svc, {
      contractId,
      userId,
      format,
      content,
      templateSlug: slug,
    });

    if (stored) {
      return NextResponse.json({
        ok: true,
        format,
        filename,
        signedUrl: stored.signedUrl,
        storagePath: stored.storagePath,
        exportId: stored.exportId,
        sizeBytes: typeof content === 'string' ? content.length : content.byteLength,
      });
    }
    // Fall through to direct serve if storage fails
  }

  // ── Serve directly ────────────────────────────────────────────────────────

  const disposition = inline ? 'inline' : `attachment; filename="${filename}"`;

  const responseBody = content instanceof Uint8Array
    ? Buffer.from(content)
    : content;

  return new Response(responseBody, {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': disposition,
      'Cache-Control': 'private, max-age=0',
    },
  });
}
