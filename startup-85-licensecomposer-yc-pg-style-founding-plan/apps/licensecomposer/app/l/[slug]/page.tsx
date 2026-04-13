/**
 * app/l/[slug]/page.tsx
 * Public hosted license page at /l/:slug
 * Shows: license summary, metadata, provenance, and acceptance form.
 */

export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase-server';
import AcceptanceForm from '@/components/AcceptanceForm';
import BadgeSnippets from '@/components/BadgeSnippets';
import Script from 'next/script';
import Link from 'next/link';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pacttailor.com';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const svc = createServiceClient();
  const { data: page } = await svc
    .from('license_pages')
    .select('title, description')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (!page) return { title: 'License Not Found | PactTailor' };

  return {    title:       `${page.title} | PactTailor`,
    description: page.description ?? `Review and accept this license agreement via PactTailor.`,
    alternates: {
      canonical: `${APP_URL}/l/${slug}`,
      languages: { 'en': `${APP_URL}/l/${slug}` },
    },
    openGraph: {
      title:       `${page.title} | PactTailor`,
      description: page.description ?? 'Review and accept this license agreement.',
      url:         `${APP_URL}/l/${slug}`,
      siteName:    'PactTailor',
      type:        'website',
    },
  };
}

export default async function LicensePage({ params }: PageProps) {
  const { slug } = await params;
  const svc = createServiceClient();

  // Fetch license page
  const { data: page, error: pageErr } = await svc
    .from('license_pages')
    .select(`
      id, slug, title, description, product_url, platform_slug,
      is_public, is_active, badge_enabled, view_count,
      contract_document_id, user_id, created_at
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (pageErr || !page) notFound();

  // Fetch contract
  let contract: {
    document_id: string;
    product_name: string | null;
    creator_name: string | null;
    jurisdiction_code: string | null;
    platform_code: string | null;
    template_slug: string | null;
    template_version: string | null;
    verification_hash: string | null;
    filled_legal_text: string | null;
    ai_plain_text: string | null;
    changelog: string[] | null;
    generated_at: string;
  } | null = null;

  if (page.contract_document_id) {
    const { data } = await svc
      .from('generated_contracts')
      .select(`
        document_id, product_name, creator_name,
        jurisdiction_code, platform_code, template_slug, template_version,
        verification_hash, filled_legal_text, ai_plain_text, changelog, generated_at
      `)
      .eq('document_id', page.contract_document_id)
      .single();
    contract = data;
  }

  // Acceptance count
  const { count: acceptanceCount } = await svc
    .from('license_acceptances')
    .select('id', { count: 'exact', head: true })
    .eq('license_page_id', page.id);

  // Bump view count (best-effort)
  svc.from('license_pages').update({ view_count: (page.view_count ?? 0) + 1 }).eq('id', page.id);

  const verifyUrl = contract?.verification_hash
    ? `${APP_URL}/verify/${contract.verification_hash.slice(0, 16)}`
    : null;

  // Parse legal text into sections for display
  const legalText = contract?.ai_plain_text ?? contract?.filled_legal_text ?? '';
  const sections = parseSections(legalText);

  // Build JSON-LD for SEO
  const jsonLdData = {
    '@context': 'https://schema.org',
    '@type': 'DigitalDocument',
    name: page.title,
    description: page.description ?? undefined,
    url: `${APP_URL}/l/${slug}`,
    inLanguage: 'en',
    publisher: { '@type': 'Organization', name: 'PactTailor', url: APP_URL },
    ...(contract ? {
      identifier: contract.document_id,
      dateCreated: contract.generated_at,
      spatialCoverage: contract.jurisdiction_code ?? undefined,
      about: { '@type': 'Thing', name: contract.template_slug ?? 'License' },
    } : {}),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* JSON-LD structured data */}
      <Script
        id="pacttailor-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
      />
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-indigo-600 font-bold text-lg">PactTailor</span>
          </Link>
          <span className="text-xs text-gray-400">Verified License Agreement</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Title block */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  ✓ Verified License
                </span>
                {contract?.jurisdiction_code && (
                  <span className="bg-blue-50 text-blue-600 text-xs font-medium px-2 py-0.5 rounded-full">
                    {contract.jurisdiction_code}
                  </span>
                )}
                {contract?.platform_code && (
                  <span className="bg-purple-50 text-purple-600 text-xs font-medium px-2 py-0.5 rounded-full">
                    {contract.platform_code}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{page.title}</h1>
              {page.description && (
                <p className="text-gray-600 mt-1">{page.description}</p>
              )}
              {contract?.creator_name && (
                <p className="text-sm text-gray-500 mt-2">
                  Created by <strong>{contract.creator_name}</strong>
                </p>
              )}
            </div>
            {page.product_url && (
              <a
                href={page.product_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                View Product →
              </a>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
            <span>👁 {(page.view_count ?? 0).toLocaleString()} views</span>
            <span>✅ {(acceptanceCount ?? 0).toLocaleString()} acceptances</span>
            {contract?.generated_at && (
              <span>📅 {new Date(contract.generated_at).toLocaleDateString()}</span>
            )}
            <span>📄 {contract?.template_slug ?? 'License'} v{contract?.template_version ?? '1.0'}</span>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <strong>⚠️ Templates only — not legal advice.</strong> This document was generated using
          PactTailor clause templates and has not been reviewed by an attorney. Consult a licensed
          attorney for jurisdiction-specific guidance.
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* License content */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">License Terms</h2>
              {sections.length > 0 ? (
                <div className="space-y-4">
                  {sections.map((section, i) => (
                    <div key={i} className={section.isMeta ? 'text-sm text-gray-500' : ''}>
                      {!section.isMeta && (
                        <h3 className="text-sm font-semibold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded mb-2">
                          {section.heading}
                        </h3>
                      )}
                      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {section.body.replace(/\*\*([^*]+)\*\*/g, '$1').trim()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm italic">No contract text available.</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Acceptance form */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <AcceptanceForm
                slug={slug}
                licenseTitle={page.title}
                documentHash={contract?.verification_hash}
              />
            </div>

            {/* Provenance card */}
            {contract && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">📋 Provenance</h3>
                <dl className="space-y-2 text-xs">
                  <div>
                    <dt className="text-gray-500">Document ID</dt>
                    <dd className="font-mono text-gray-700 break-all">{contract.document_id}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Template</dt>
                    <dd className="text-gray-700">{contract.template_slug} v{contract.template_version}</dd>
                  </div>
                  {contract.verification_hash && (
                    <div>
                      <dt className="text-gray-500">Verification hash</dt>
                      <dd className="font-mono text-gray-700 break-all">
                        {contract.verification_hash.slice(0, 24)}…
                      </dd>
                    </div>
                  )}
                  {verifyUrl && (
                    <div className="pt-1">
                      <a
                        href={verifyUrl}
                        className="text-indigo-600 font-medium hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        🔗 Verify on-chain →
                      </a>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Badge snippet */}
            {page.badge_enabled && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">🏷 Embed Badge</h3>
                <BadgeSnippets slug={slug} />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12 py-6 text-center text-xs text-gray-400">
        <p>
          Powered by{' '}
          <a href={APP_URL} className="text-indigo-500 hover:underline">PactTailor</a>
          {' '}· Templates only, not legal advice ·{' '}
          <a href="mailto:hello@pacttailor.com" className="hover:underline">hello@pacttailor.com</a>
        </p>
      </footer>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseSections(text: string): Array<{ heading: string; body: string; isMeta: boolean }> {
  const sections: Array<{ heading: string; body: string; isMeta: boolean }> = [];
  if (!text) return sections;
  const parts = text.split(/\n\*\*(\d+\.\s+[^*]+)\*\*/);
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
