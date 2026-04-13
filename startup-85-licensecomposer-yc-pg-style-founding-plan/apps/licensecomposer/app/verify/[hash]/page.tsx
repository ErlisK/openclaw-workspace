/**
 * app/verify/[hash]/page.tsx
 * Human-readable provenance verification page.
 *
 * Public-facing. Anyone with the hash (from a contract footer or badge) can
 * visit this URL to verify a contract's provenance.
 *
 * Embeds JSON-LD in the <head> for search engines / schema.org consumers.
 */
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { createServiceClient } from '@/lib/supabase-server';
import { buildJsonLd } from '@/lib/jsonld';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const FIELDS = `
  document_id, template_slug, template_version, template_version_id,
  document_type, creator_name, product_name, jurisdiction_code, platform_code,
  verification_hash, template_hash, clause_hashes, changelog, generator_version,
  generated_at, is_active
`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ hash: string }>;
}): Promise<Metadata> {
  const { hash } = await params;
  return {
    title:       `Contract Verification | PactTailor`,
    description: `Verify the provenance of a PactTailor-generated contract. Hash: ${hash.slice(0, 16)}`,
  };
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function jurisdictionLabel(code: string | null) {
  const map: Record<string, string> = {
    US: '🇺🇸 United States', UK: '🇬🇧 United Kingdom',
    CA: '🇨🇦 Canada', AU: '🇦🇺 Australia',
    DE: '🇩🇪 Germany', FR: '🇫🇷 France',
  };
  return code ? (map[code] ?? code) : '—';
}

function platformLabel(code: string | null) {
  const map: Record<string, string> = {
    itch: 'itch.io', gumroad: 'Gumroad', opensea: 'OpenSea',
    direct: 'Direct / Offline', personal_site: 'Own website', multiple: 'Multiple platforms',
  };
  return code ? (map[code] ?? code) : '—';
}

function docTypeLabel(t: string | null) {
  const map: Record<string, string> = {
    digital_asset_license: 'Digital Asset License',
    commission_agreement:  'Commission Agreement',
    collaborator_split:    'Collaborator Split Agreement',
    nft_license:           'NFT License',
  };
  return t ? (map[t] ?? t.replace(/_/g, ' ')) : '—';
}

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;
  const svc = createServiceClient();

  // Try exact then prefix
  let contract = null;

  if (hash.length === 64) {
    const { data } = await svc.from('generated_contracts').select(FIELDS).eq('verification_hash', hash).single();
    contract = data;
  }
  if (!contract) {
    const { data } = await svc.from('generated_contracts').select(FIELDS).like('verification_hash', `${hash}%`).limit(1);
    contract = data?.[0] ?? null;
  }
  if (!contract) notFound();

  // Fetch template version
  let tv: Record<string, unknown> | null = null;
  if (contract.template_version_id) {
    const { data } = await svc
      .from('template_versions')
      .select('id, version, changelog, diff_from_previous, published_at, lawyer_name, lawyer_reviewed_at, breaking_changes')
      .eq('id', contract.template_version_id)
      .single();
    tv = data;
  }

  const clauseHashes = (contract.clause_hashes ?? {}) as Record<string, string>;
  const clauseCount = Object.keys(clauseHashes).length;

  const jsonLd = buildJsonLd({
    documentId:        contract.document_id,
    templateSlug:      contract.template_slug,
    templateName:      contract.template_slug,
    templateVersion:   contract.template_version ?? '1.0.0',
    documentType:      contract.document_type,
    creatorName:       contract.creator_name,
    productName:       contract.product_name,
    jurisdictionCode:  contract.jurisdiction_code,
    platformCode:      contract.platform_code,
    verificationHash:  contract.verification_hash,
    templateHash:      contract.template_hash,
    clauseHashes:      clauseHashes,
    changelog:         contract.changelog as string[] | null,
    generatorVersion:  contract.generator_version,
    generatedAt:       contract.generated_at,
    tvVersion:         tv?.version as string | null,
    tvChangelog:       tv?.changelog as string | null,
    tvPublishedAt:     tv?.published_at as string | null,
    tvLawyerName:      tv?.lawyer_name as string | null,
    tvLawyerReviewedAt: tv?.lawyer_reviewed_at as string | null,
  });

  const isVerified = !!contract.verification_hash;

  return (
    <>
      {/* Embed JSON-LD in <head> via Next.js script tag */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-gray-50">
        {/* Nav */}
        <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-gray-900">PactTailor</Link>
          <Link href="/wizard" className="text-sm text-indigo-600 hover:underline">Create contract →</Link>
        </nav>

        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
          {/* Status badge */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full ${
              isVerified
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {isVerified ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Verified
                </>
              ) : (
                <>⚠️ Unverified</>
              )}
            </div>
            <span className="text-sm text-gray-500">Document provenance verified by PactTailor</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            {contract.product_name ?? contract.template_slug ?? 'Contract Verification'}
          </h1>

          {/* Contract metadata card */}
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {[
              ['Document type',    docTypeLabel(contract.document_type)],
              ['Creator',          contract.creator_name ?? '—'],
              ['Jurisdiction',     jurisdictionLabel(contract.jurisdiction_code)],
              ['Platform',         platformLabel(contract.platform_code)],
              ['Generated',        formatDate(contract.generated_at)],
              ['Template',         `${contract.template_slug} v${contract.template_version ?? '1.0.0'}`],
              ['Generator',        `PactTailor v${contract.generator_version ?? '2.0.0'}`],
              ['Clauses verified', `${clauseCount} clauses`],
              ['Status',           contract.is_active ? '✅ Active' : '⚠️ Inactive'],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex items-start gap-4 px-5 py-3">
                <span className="text-sm text-gray-500 w-36 shrink-0">{k}</span>
                <span className="text-sm font-medium text-gray-900">{String(v)}</span>
              </div>
            ))}
          </div>

          {/* Hash block */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">🔐 Cryptographic Hashes</h2>
            {[
              ['Document ID',        contract.document_id],
              ['Verification hash',  contract.verification_hash ?? '—'],
              ['Template hash',      contract.template_hash ?? '—'],
            ].map(([k, v]) => (
              <div key={String(k)}>
                <p className="text-xs text-gray-500 mb-0.5">{k}</p>
                <code className="block font-mono text-xs bg-gray-50 border border-gray-200 rounded px-3 py-1.5 break-all text-gray-700">
                  {String(v)}
                </code>
              </div>
            ))}
          </div>

          {/* Clause hash table */}
          {clauseCount > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                📋 Clause Hashes ({clauseCount} clauses)
              </h2>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {Object.entries(clauseHashes).map(([key, hash]) => (
                  <div key={key} className="flex items-center gap-3 text-xs">
                    <span className="font-medium text-gray-700 w-48 shrink-0 truncate">{key}</span>
                    <code className="font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{hash}</code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Template version / changelog */}
          {tv && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-900">📄 Template Version Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="text-gray-500 w-32">Version</span>
                  <span className="font-medium">{String(tv.version)}</span>
                </div>
                {Boolean(tv.published_at) && (
                  <div className="flex gap-2">
                    <span className="text-gray-500 w-32">Published</span>
                    <span className="font-medium">{formatDate(tv.published_at as string)}</span>
                  </div>
                )}
                {Boolean(tv.lawyer_name) && (
                  <div className="flex gap-2">
                    <span className="text-gray-500 w-32">Reviewed by</span>
                    <span className="font-medium">{String(tv.lawyer_name)}</span>
                  </div>
                )}
                {Boolean(tv.lawyer_reviewed_at) && (
                  <div className="flex gap-2">
                    <span className="text-gray-500 w-32">Review date</span>
                    <span className="font-medium">{formatDate(tv.lawyer_reviewed_at as string)}</span>
                  </div>
                )}
              </div>
              {Boolean(tv.changelog) && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Changelog</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{String(tv.changelog)}</p>
                </div>
              )}
              {Boolean(tv.breaking_changes) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800">
                  ⚠️ This template version contains breaking changes from the previous version.
                </div>
              )}
            </div>
          )}

          {/* API access */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">🔗 API Access</h2>
            <div className="space-y-2">
              {[
                [`/api/verify/${(contract.verification_hash ?? '').slice(0, 16)}`, 'Full metadata (JSON)'],
                [`/api/verify/${(contract.verification_hash ?? '').slice(0, 16)}?format=jsonld`, 'JSON-LD provenance'],
                [`/api/verify?doc_id=${contract.document_id}`, 'Lookup by document ID'],
                [`/api/contracts/${contract.document_id}/download?format=md`, 'Download with embedded provenance'],
              ].map(([url, label]) => (
                <div key={url} className="flex items-start gap-2 text-xs">
                  <code className="font-mono bg-white border border-gray-200 rounded px-2 py-1 text-indigo-600 break-all flex-1">{url}</code>
                  <span className="text-gray-500 w-44 shrink-0 mt-1">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-900">
            <strong>⚠️ Templates only — not legal advice.</strong> Provenance verification confirms
            the document was generated by PactTailor and identifies the template version and clause
            hashes used. It does not constitute legal authentication or guarantee enforceability.
            Consult a licensed attorney.{' '}
            <a href="mailto:hello@pacttailor.com" className="underline">hello@pacttailor.com</a>
          </div>
        </div>
      </div>
    </>
  );
}
