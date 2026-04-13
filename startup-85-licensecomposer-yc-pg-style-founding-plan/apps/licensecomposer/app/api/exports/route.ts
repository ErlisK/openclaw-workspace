/**
 * app/api/exports/route.ts
 * GET  /api/exports?contract_id=xxx  — list exports for a contract (with signed URLs)
 * POST /api/exports                  — trigger export render + store to Supabase Storage
 *
 * POST body: { contractId: string, formats: ('pdf'|'html'|'md'|'txt')[] }
 * POST response: { exports: [{ format, signedUrl, storagePath, sizeBytes }] }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { listContractExports, storeExport, type ExportFormat } from '@/lib/export-storage';
import { renderToPdf } from '@/lib/pdf-renderer';
import { renderToHtml } from '@/lib/html-renderer';
import { buildJsonLd, jsonLdToMarkdownBlock, jsonLdToDocumentComment } from '@/lib/jsonld';
import { rateLimit } from '@/lib/rate-limit';
import { ExportsSchema } from '@/lib/validation';

export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contractId = searchParams.get('contract_id');

  if (!contractId) {
    return NextResponse.json({ ok: false, error: 'Missing contract_id' }, { status: 400 });
  }

  // Require authentication
  let userId: string | null = null;
  try {
    const auth = await createServerSupabaseClient();
    const { data: { user } } = await auth.auth.getUser();
    userId = user?.id ?? null;
  } catch { /* ignore */ }

  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
  }

  const svc = createServiceClient();

  // Verify the contract belongs to this user
  const { data: contract } = await svc
    .from('generated_contracts')
    .select('document_id, user_id')
    .eq('document_id', contractId)
    .single();

  if (!contract) {
    return NextResponse.json({ ok: false, error: 'Contract not found' }, { status: 404 });
  }
  if (contract.user_id && contract.user_id !== userId) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const exports = await listContractExports(svc, contractId);

  const response = NextResponse.json({ ok: true, exports });
  response.headers.set('Vary', 'Cookie');
  return response;
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { limit: 30, window: 60, prefix: 'exports' });
  if (limited) return limited;

  try {
    const rawBody = await request.json();
    const parsed = ExportsSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }
    const { contractId, formats = ['pdf', 'md', 'txt'] } = parsed.data;

    const svc = createServiceClient();

    // Get user
    let userId: string | null = null;
    try {
      const auth = await createServerSupabaseClient();
      const { data: { user } } = await auth.auth.getUser();
      userId = user?.id ?? null;
    } catch { /* anon */ }

    // Fetch contract
    const { data: contract, error } = await svc
      .from('generated_contracts')
      .select(`
        filled_legal_text, filled_plain_text, document_id,
        template_slug, template_version, template_version_id,
        creator_name, product_name, document_type, jurisdiction_code, platform_code,
        verification_hash, template_hash, clause_hashes, changelog, generator_version, generated_at
      `)
      .eq('document_id', contractId)
      .single();

    if (error || !contract) {
      return NextResponse.json({ ok: false, error: 'Contract not found' }, { status: 404 });
    }

    // Fetch template version
    let tv: Record<string, unknown> | null = null;
    if (contract.template_version_id) {
      const { data } = await svc
        .from('template_versions')
        .select('version, changelog, published_at, lawyer_name, lawyer_reviewed_at')
        .eq('id', contract.template_version_id)
        .single();
      tv = data;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pacttailor.com';
    const slug = contract.template_slug ?? 'contract';

    const renderInput = {
      legalText:        contract.filled_legal_text ?? '',
      plainText:        contract.filled_plain_text ?? '',
      documentId:       contract.document_id,
      templateSlug:     slug,
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
    };

    // Render each format and store
    const results: Array<{
      format: ExportFormat;
      signedUrl: string | null;
      storagePath: string | null;
      exportId: string | null;
      sizeBytes: number;
    }> = [];

    for (const format of formats) {
      let content: Uint8Array | string;

      if (format === 'pdf') {
        content = await renderToPdf(renderInput);
      } else if (format === 'html') {
        content = renderToHtml({
          ...renderInput,
          tvVersion: tv?.version as string | null,
          tvChangelog: tv?.changelog as string | null,
          tvPublishedAt: tv?.published_at as string | null,
          tvLawyerName: tv?.lawyer_name as string | null,
          tvLawyerReviewedAt: tv?.lawyer_reviewed_at as string | null,
        });
      } else if (format === 'md') {
        const jsonLd = buildJsonLd({ ...renderInput, templateName: slug, documentType: slug });
        content = (contract.filled_legal_text ?? '') + jsonLdToMarkdownBlock(jsonLd);
      } else {
        const jsonLd = buildJsonLd({ ...renderInput, templateName: slug, documentType: slug });
        const stripped = (contract.filled_legal_text ?? '')
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/^#{1,6}\s+/gm, '')
          .replace(/^---+$/gm, '---');
        content = stripped + '\n' + jsonLdToDocumentComment(jsonLd);
      }

      const stored = await storeExport(svc, {
        contractId,
        userId,
        format,
        content,
        templateSlug: slug,
      });

      results.push({
        format,
        signedUrl:   stored?.signedUrl ?? null,
        storagePath: stored?.storagePath ?? null,
        exportId:    stored?.exportId ?? null,
        sizeBytes:   typeof content === 'string' ? content.length : content.byteLength,
      });
    }

    return NextResponse.json({ ok: true, exports: results });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
