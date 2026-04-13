/**
 * app/templates/page.tsx
 * Templates marketplace — browse free and premium templates.
 * Premium templates show lock icons; purchased ones are unlocked.
 * Server component for SEO; uses /api/templates for access annotations.
 */
export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server';
import { getUserEntitlements } from '@/lib/entitlements';
import Link from 'next/link';
import TemplatesFilter from '@/components/TemplatesFilter';

export const metadata: Metadata = {
  title: 'Contract Templates — PactTailor',
  description: 'Browse lawyer-vetted contract templates for digital creators. Free and premium templates for commercial licenses, commissions, NFTs, and more.',
  openGraph: {
    title: 'Contract Templates — PactTailor',
    description: 'Lawyer-vetted templates for indie digital creators.',
    url: 'https://pacttailor.com/templates',
  },
};

interface Template {
  id:            string;
  slug:          string;
  name:          string;
  description:   string | null;
  document_type: string;
  tier:          string;
  price_cents:   number;
  tags:          string[] | null;
  jurisdictions: string[] | null;
  platforms:     string[] | null;
  lawyer_reviewed: boolean;
  is_featured:   boolean;
  current_version: string;
  userHasAccess:  boolean;
  isPremium:      boolean;
  priceDollars:   number;
}

export default async function TemplatesPage() {
  const svc = createServiceClient();

  // Fetch all active templates
  const { data: rawTemplates } = await svc
    .from('templates')
    .select('id, slug, name, description, document_type, tier, price_cents, tags, jurisdictions, platforms, lawyer_reviewed, is_featured, current_version')
    .eq('is_active', true)
    .order('tier', { ascending: true })
    .order('name', { ascending: true });

  // Get user entitlements
  let unlockedSlugs: string[]  = [];
  let hasUnlimited              = false;
  let isLoggedIn                = false;

  try {
    const auth = await createServerSupabaseClient();
    const { data: { user } } = await auth.auth.getUser();
    if (user) {
      isLoggedIn = true;
      const ents = await getUserEntitlements(svc, user.id);
      hasUnlimited    = ents.unlimitedExports;
      unlockedSlugs   = ents.premiumTemplates;
    }
  } catch { /* anonymous */ }

  // Annotate templates
  const templates: Template[] = (rawTemplates ?? []).map(t => ({
    ...t,
    isPremium:     t.tier === 'premium',
    priceDollars:  (t.price_cents ?? 0) / 100,
    userHasAccess: t.tier === 'free' || hasUnlimited || unlockedSlugs.includes(t.slug),
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="font-bold text-indigo-700 text-lg tracking-tight">PactTailor</Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
            {isLoggedIn ? (
              <Link href="/dashboard" className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">Dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="text-gray-600 hover:text-gray-900">Sign in</Link>
                <Link href="/signup" className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">Get started free</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-12">

        {/* Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Contract Templates</h1>
          <p className="text-gray-500 text-lg">
            Lawyer-vetted templates for indie digital creators. Answer 5 questions, get a ready-to-use contract.
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-medium">⚖️ Jurisdiction-aware</span>
            <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full font-medium">✅ Plain-English output</span>
            <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-medium">🔒 Provenance hashed</span>
          </div>
        </div>

        {/* Unlimited CTA banner */}
        {!hasUnlimited && (
          <div className="bg-indigo-600 text-white rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-lg">Unlock all premium templates</p>
              <p className="text-indigo-200 text-sm mt-0.5">Get unlimited exports + all premium templates for just $9/year</p>
            </div>
            <Link
              href="/pricing"
              className="flex-shrink-0 bg-white text-indigo-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              Upgrade to Unlimited →
            </Link>
          </div>
        )}

        {/* Premium + Free templates with search/filter */}
        <TemplatesFilter templates={templates} hasUnlimited={hasUnlimited} />

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 pb-4">
          ⚠️ PactTailor templates are not legal advice. Consult a licensed attorney for jurisdiction-specific guidance.{' '}
          <Link href="/legal/disclaimer" className="underline hover:text-gray-600">Read disclaimer</Link>
        </p>
      </div>
    </div>
  );
}
