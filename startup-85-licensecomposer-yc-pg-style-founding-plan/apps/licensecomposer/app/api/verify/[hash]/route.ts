/**
 * app/api/verify/[hash]/route.ts
 * GET /api/verify/:hash         (hash = full sha256 or first 16 chars)
 * GET /api/verify/by-doc-id    (pass ?doc_id=contract_xxx)
 *
 * Also handles ?format=jsonld to return raw JSON-LD only.
 * Supports the canonical URL /api/verify?doc_id= as a redirect.
 *
 * Response includes:
 * - contract metadata
 * - full provenance chain
 * - clause hashes per-key
 * - template version details (version, changelog, jurisdiction, platform, lawyer review)
 * - JSON-LD object for embedding
 */
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { buildJsonLd } from '@/lib/jsonld';

const FIELDS = `
  id,
  document_id,
  template_slug,
  template_version,
  template_version_id,
  document_type,
  creator_name,
  product_name,
  jurisdiction_code,
  platform_code,
  verification_hash,
  template_hash,
  clause_hashes,
  clause_ids_used,
  provenance_chain,
  changelog,
  generator_version,
  generated_at,
  is_active
`;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ hash: string }> }
) {
  const { hash } = await params;
  const { searchParams } = new URL(request.url);
  const docId   = searchParams.get('doc_id');
  const format  = searchParams.get('format') ?? 'json';

  const svc = createServiceClient();
  let contracts: Record<string, unknown>[] | null = null;

  // ── Strategy 1: lookup by doc_id query param ──────────────────────────────
  if (docId) {
    const { data } = await svc
      .from('generated_contracts')
      .select(FIELDS)
      .eq('document_id', docId)
      .limit(1);
    contracts = data;
  }

  // ── Strategy 2: lookup by hash path param ────────────────────────────────
  if ((!contracts || contracts.length === 0) && hash && hash !== 'by-doc-id') {
    if (hash.length < 8) {
      return NextResponse.json({ ok: false, error: 'Hash too short (min 8 chars)' }, { status: 400 });
    }

    // Try exact full-hash match first
    if (hash.length === 64) {
      const { data } = await svc
        .from('generated_contracts')
        .select(FIELDS)
        .eq('verification_hash', hash)
        .limit(1);
      contracts = data;
    }

    // Prefix search
    if (!contracts || contracts.length === 0) {
      const { data } = await svc
        .from('generated_contracts')
        .select(FIELDS)
        .like('verification_hash', `${hash}%`)
        .limit(1);
      contracts = data;
    }
  }

  if (!contracts || contracts.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'Contract not found', hint: 'Try /api/verify/:hash or /api/verify/by-doc-id?doc_id=contract_xxx' },
      { status: 404 }
    );
  }

  const c = contracts[0] as Record<string, unknown>;

  // ── Fetch template_version details ───────────────────────────────────────
  let tv: Record<string, unknown> | null = null;
  if (c.template_version_id) {
    const { data } = await svc
      .from('template_versions')
      .select('id, version, changelog, diff_from_previous, template_hash, clause_hashes, published_at, lawyer_name, lawyer_reviewed_at, jurisdiction_codes, platform_codes, breaking_changes')
      .eq('id', c.template_version_id as string)
      .single();
    tv = data;
  }

  // ── Compute counts ────────────────────────────────────────────────────────
  const clauseHashes = (c.clause_hashes ?? {}) as Record<string, unknown>;
  const clauseCount = typeof clauseHashes === 'object' && !Array.isArray(clauseHashes)
    ? Object.keys(clauseHashes).length
    : 0;

  // ── Build JSON-LD ─────────────────────────────────────────────────────────
  const jsonLd = buildJsonLd({
    documentId:        c.document_id as string,
    templateSlug:      c.template_slug as string,
    templateName:      (tv?.['changelog'] ? `${c.template_slug}` : c.template_slug) as string,
    templateVersion:   c.template_version as string ?? '1.0.0',
    documentType:      c.document_type as string,
    creatorName:       c.creator_name as string | null,
    productName:       c.product_name as string | null,
    jurisdictionCode:  c.jurisdiction_code as string | null,
    platformCode:      c.platform_code as string | null,
    verificationHash:  c.verification_hash as string | null,
    templateHash:      c.template_hash as string | null,
    clauseHashes:      c.clause_hashes as Record<string, string> | null,
    changelog:         c.changelog as string[] | null,
    generatorVersion:  c.generator_version as string | null,
    generatedAt:       c.generated_at as string,
    tvVersion:         tv?.version as string | null,
    tvChangelog:       tv?.changelog as string | null,
    tvPublishedAt:     tv?.published_at as string | null,
    tvLawyerName:      tv?.lawyer_name as string | null,
    tvLawyerReviewedAt: tv?.lawyer_reviewed_at as string | null,
  });

  // ── JSON-LD only format ───────────────────────────────────────────────────
  if (format === 'jsonld') {
    return NextResponse.json(jsonLd, {
      headers: {
        'Content-Type': 'application/ld+json',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      },
    });
  }

  // ── Full verification response ────────────────────────────────────────────
  const response = {
    ok: true,
    contract: {
      documentId:      c.document_id,
      templateSlug:    c.template_slug,
      templateVersion: c.template_version,
      documentType:    c.document_type,
      creatorName:     c.creator_name,
      productName:     c.product_name,
      jurisdictionCode: c.jurisdiction_code,
      jurisdictionLabel: jurisdictionLabel(c.jurisdiction_code as string | null),
      platformCode:    c.platform_code,
      generatorVersion: c.generator_version,
      generatedAt:     c.generated_at,
      isActive:        c.is_active,
    },
    provenance: {
      verificationHash: c.verification_hash,
      templateHash:     c.template_hash,
      clauseCount,
      clauseHashes:     c.clause_hashes,
      provenanceChain:  c.provenance_chain,
      changelog:        c.changelog,
    },
    templateVersion: tv ? {
      id:              tv.id,
      version:         tv.version,
      changelog:       tv.changelog,
      diffFromPrevious: tv.diff_from_previous,
      templateHash:    tv.template_hash,
      publishedAt:     tv.published_at,
      lawyerName:      tv.lawyer_name,
      lawyerReviewedAt: tv.lawyer_reviewed_at,
      jurisdictionCodes: tv.jurisdiction_codes,
      platformCodes:   tv.platform_codes,
      breakingChanges: tv.breaking_changes,
    } : null,
    jsonLd,
    verifiedAt: new Date().toISOString(),
    verifyApiUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://pacttailor.com'}/api/verify/${(c.verification_hash as string ?? '').slice(0, 16)}`,
  };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
    },
  });
}

function jurisdictionLabel(code: string | null): string {
  if (!code) return 'Unknown';
  const map: Record<string, string> = {
    US: 'United States', UK: 'United Kingdom', CA: 'Canada',
    AU: 'Australia', DE: 'Germany', FR: 'France', NL: 'Netherlands',
  };
  return map[code] ?? code;
}
