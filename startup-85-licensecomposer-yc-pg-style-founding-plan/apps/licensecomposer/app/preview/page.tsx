/**
 * app/preview/page.tsx
 * Contract preview page — shown after wizard generation.
 * Reads contractId from query param and renders assembled contract preview.
 */
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { createServiceClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contract Preview | PactTailor',
  description: 'Review your generated contract before exporting.',
};

interface PageProps {
  searchParams: Promise<{ id?: string; contractId?: string }>;
}

export default async function PreviewPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const contractId = sp.id ?? sp.contractId;

  if (!contractId) redirect('/wizard');

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/preview?id=${contractId}`);

  const svc = createServiceClient();
  const { data: contract } = await svc
    .from('generated_contracts')
    .select(`id, document_id, user_id, document_type, jurisdiction_code, platform_code,
      filled_legal_text, filled_plain_text, creator_name, product_name,
      template_slug, template_version, verification_hash, template_hash,
      clause_hashes, changelog, generator_version, generated_at`)
    .eq('document_id', contractId)
    .single();

  if (!contract) notFound();
  if (contract.user_id && contract.user_id !== user.id) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pacttailor.com';
  const verifyUrl = `${appUrl}/verify/${(contract.verification_hash ?? '').slice(0, 16)}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contract Preview</h1>
            <p className="text-sm text-gray-500 mt-1">
              {contract.document_type?.replace(/_/g, ' ')} &middot; {contract.jurisdiction_code} &middot; {contract.platform_code}
            </p>
          </div>
          <Link
            href={`/contracts/${contractId}`}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Full View &amp; Export →
          </Link>
        </div>

        {/* Provenance card */}
        <div className="bg-white border border-green-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <div className="text-green-500 mt-0.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-800">
              Lawyer-Vetted Template · v{contract.template_version}
            </p>
            <p className="text-xs text-green-700 mt-0.5 font-mono break-all">
              Hash: {(contract.verification_hash ?? '').slice(0, 32)}…
            </p>
            <a
              href={verifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-600 underline mt-1 inline-block"
            >
              Verify provenance →
            </a>
          </div>
        </div>

        {/* Disclaimer notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
          <strong>Not legal advice.</strong> This contract template is for informational purposes only
          and does not constitute legal advice. Consult a qualified attorney for your specific situation.
        </div>

        {/* Contract content */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-serif">
            {contract.filled_plain_text ?? contract.filled_legal_text}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Generated {new Date(contract.generated_at ?? '').toLocaleDateString()} · Generator v{contract.generator_version}
          </p>
          <Link
            href={`/contracts/${contractId}`}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Export Contract →
          </Link>
        </div>
      </div>
    </div>
  );
}
