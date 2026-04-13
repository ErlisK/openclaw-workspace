/**
 * app/contracts/[contractId]/page.tsx
 * View a generated contract. Shows:
 * - Provenance card
 * - AI Simplify panel (toggle between AI simplified / original)
 * - Per-clause legal text with "AI Explain" tooltip
 * - Download actions
 */
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { createServiceClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import AISimplifyPanel from '@/components/AISimplifyPanel';
import ClauseExplainer from '@/components/ClauseExplainer';
import ExportPanel from '@/components/ExportPanel';
import PublishButton from '@/components/PublishButton';
import VersionHistoryPanel from '@/components/VersionHistoryPanel';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ contractId: string }>;
}): Promise<Metadata> {
  const { contractId } = await params;
  return { title: `Contract ${contractId} | PactTailor` };
}

/** Parse the filled_legal_text into sections split by "**N. Title**" markers */
function parseSections(legalText: string): Array<{ heading: string; body: string }> {
  const sections: Array<{ heading: string; body: string }> = [];

  // Split on numbered section headers: **1. Section Name**
  const parts = legalText.split(/\n\*\*(\d+\.\s+[^*]+)\*\*/);

  // parts[0] is the preamble (header block), then alternating heading/body
  const preamble = parts[0];
  if (preamble.trim()) {
    sections.push({ heading: 'Header', body: preamble.trim() });
  }

  for (let i = 1; i < parts.length; i += 2) {
    const heading = parts[i]?.trim() ?? '';
    const body    = (parts[i + 1] ?? '').trim();
    if (heading) sections.push({ heading, body });
  }

  return sections;
}

/** Extract clause title from section heading (strip "1. " prefix) */
function clauseTitle(heading: string): string {
  return heading.replace(/^\d+\.\s*/, '');
}

export default async function ContractPage({
  params,
}: {
  params: Promise<{ contractId: string }>;
}) {
  const { contractId } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const svc = createServiceClient();
  const { data: contract, error } = await svc
    .from('generated_contracts')
    .select('*')
    .eq('document_id', contractId)
    .single();

  if (error || !contract) notFound();

  // Allow anonymous access to contracts without an owner;
  // require auth for contracts that have a specific owner
  if (contract.user_id) {
    if (!user) redirect(`/login?next=/contracts/${contractId}`);
    if (contract.user_id !== user!.id) redirect('/dashboard');
  }

  const createdAt = new Date(contract.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // Parse legal text into sections for per-clause AI explain buttons
  const sections = parseSections(contract.filled_legal_text ?? '');

  // Header sections don't need explain buttons
  const isHeaderSection = (h: string) => h === 'Header' || h.toLowerCase().includes('header');
  const isDisclaimerSection = (h: string) =>
    clauseTitle(h).toLowerCase().includes('disclaimer') ||
    clauseTitle(h).toLowerCase().includes('not legal advice');

  const aiEnabled = !contract.ai_disabled;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <Link href="/dashboard" className="text-lg font-bold text-gray-900">PactTailor</Link>
        <div className="flex gap-3 text-sm">
          <Link href="/wizard" className="text-indigo-600 hover:underline">+ New contract</Link>
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-900">Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        {/* Anonymous sign-up prompt banner */}
        {!user && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-indigo-900">Save your contract — sign up free</p>
              <p className="text-xs text-indigo-700 mt-0.5">Create a free account to save, download, and manage all your contracts. No credit card needed.</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link href={`/signup?next=/contracts/${contractId}`} className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap">
                Sign up free
              </Link>
              <Link href={`/login?next=/contracts/${contractId}`} className="text-xs text-gray-600 border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">
                Sign in
              </Link>
            </div>
          </div>
        )}
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full mb-3">
            ✓ Contract generated
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {contract.product_name ?? contract.template_slug ?? 'Your Contract'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {(contract.document_type ?? '').replace(/_/g, ' ')} ·{' '}
            {createdAt} ·{' '}
            <span className="text-gray-400">{contract.jurisdiction_code}</span>
            {contract.platform_code && (
              <> · <span className="text-gray-400">{contract.platform_code}</span></>
            )}
          </p>
        </div>

        {/* Provenance card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">📋 Provenance</h2>
          <div className="space-y-2 text-sm">
            {[
              ['Document ID',       contract.document_id],
              ['Template',          `${contract.template_slug} v${contract.template_version ?? '1.0.0'}`],
              ['Generator',         contract.generator_version ?? '—'],
              ['Clauses',           Object.keys(contract.clause_hashes ?? {}).length || '—'],
              ['Template hash',     (contract.template_hash ?? '').slice(0, 32) + (contract.template_hash ? '…' : '')],
              ['Provenance hash',   (contract.verification_hash ?? '').slice(0, 32) + (contract.verification_hash ? '…' : '')],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex gap-2">
                <span className="text-gray-500 w-36 shrink-0">{k}</span>
                <code className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded break-all">{String(v)}</code>
              </div>
            ))}
          </div>
          {contract.verification_hash && (
            <a
              href={`/api/verify/${contract.verification_hash.slice(0, 16)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-xs text-indigo-600 hover:underline"
            >
              🔗 Verify provenance →
            </a>
          )}
          {contract.changelog?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-700 mb-1">Changelog</p>
              {contract.changelog.map((c: string, i: number) => (
                <p key={i} className="text-xs text-gray-500">{c}</p>
              ))}
            </div>
          )}
        </div>


        {/* ⬇️ Export Panel */}
        <ExportPanel contractId={contractId} />

        {/* 🚀 Publish Panel */}
        <PublishButton
          contractDocumentId={contractId}
          contractTitle={contract.product_name ?? contract.template_slug ?? 'License Agreement'}
        />

        {/* 🔄 Version History */}
        <VersionHistoryPanel contractId={contractId} />

        {/* ✨ AI Simplify Panel */}
        <AISimplifyPanel
          contractId={contractId}
          initialAiText={contract.ai_plain_text ?? null}
          aiDisabled={contract.ai_disabled ?? false}
        />

        {/* Legal text — split by clause with AI Explain buttons */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">⚖️ Legal Text</h2>

          {sections.length > 1 ? (
            <div className="space-y-6">
              {sections.map((section, idx) => (
                <div key={idx} className={idx === 0 ? '' : 'border-t border-gray-100 pt-5'}>
                  {!isHeaderSection(section.heading) && (
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-gray-800">
                        {section.heading}
                      </h3>
                      {/* AI Explain button — skip header and disclaimer sections */}
                      {!isDisclaimerSection(section.heading) && (
                        <ClauseExplainer
                          clauseTitle={clauseTitle(section.heading)}
                          legalText={section.body}
                          jurisdiction={contract.jurisdiction_code ?? 'US'}
                          aiEnabled={aiEnabled}
                        />
                      )}
                    </div>
                  )}
                  <div className="text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg p-3">
                    {section.body}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Fallback: show raw text if parsing didn't find sections */
            <div className="text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed">
              {contract.filled_legal_text}
            </div>
          )}
        </div>

        {/* Plain English summary (template-generated, not AI) */}
        {contract.filled_plain_text && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">📖 Plain English Summary</h2>
            <p className="text-xs text-gray-400 mb-4">Template-generated summary (not AI)</p>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {contract.filled_plain_text}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-900">
          <strong>⚠️ Templates only — not legal advice.</strong> This document was generated
          using PactTailor clause templates. It is not a substitute for legal advice.
          Consult a licensed attorney for jurisdiction-specific guidance.{' '}
          <a href="mailto:hello@pacttailor.com" className="underline">hello@pacttailor.com</a>
        </div>
      </div>
    </div>
  );
}
