/**
 * app/dashboard/page.tsx
 * Full creator dashboard:
 *  - Overview stats (contracts, exports, license pages, acceptances)
 *  - Contracts table with provenance, version history, export links
 *  - License pages with badge + acceptance count
 *  - Recent acceptances across all pages
 *  - Quick-create actions
 */

export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { signOut } from '@/app/actions/auth';
import ContractRow from '@/components/dashboard/ContractRow';
import LicensePageRow from '@/components/dashboard/LicensePageRow';
import AcceptanceRow from '@/components/dashboard/AcceptanceRow';
import { getUserEntitlements } from '@/lib/entitlements';

export const metadata: Metadata = { title: 'Dashboard | PactTailor' };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pacttailor.com';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const svc = createServiceClient();

  // Parallel data fetch
  const [
    { data: profile },
    { data: contracts, count: contractCount },
    { data: licensePages },
    { data: recentExports },
    { data: recentAcceptances },
  ] = await Promise.all([
    svc.from('profiles')
      .select('display_name, total_licenses_generated, onboarding_completed')
      .eq('id', user.id)
      .single(),

    svc.from('generated_contracts')
      .select(`
        id, document_id, product_name, creator_name,
        template_slug, template_version,
        jurisdiction_code, platform_code,
        version_number, parent_document_id, minor_edit_note, edited_at,
        verification_hash, is_active, created_at, updated_at,
        ai_plain_text
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),

    svc.from('license_pages')
      .select('id, slug, title, is_active, badge_enabled, view_count, created_at, contract_document_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),

    svc.from('exports')
      .select('id, contract_id, export_format, file_size_bytes, generated_at, signed_url, storage_path')
      .eq('user_id', user.id)
      .order('generated_at', { ascending: false })
      .limit(10),

    svc.from('license_acceptances')
      .select('id, accepter_name, accepter_email, accepted_at, ip_address, license_page_id')
      .eq('user_id', user.id)
      .order('accepted_at', { ascending: false })
      .limit(20),
  ]);

  // Acceptance counts per license page
  const pageIds = (licensePages ?? []).map(p => p.id);
  let acceptanceCountMap: Record<string, number> = {};
  if (pageIds.length > 0) {
    const { data: counts } = await svc
      .from('license_acceptances')
      .select('license_page_id')
      .in('license_page_id', pageIds);
    for (const row of counts ?? []) {
      acceptanceCountMap[row.license_page_id] = (acceptanceCountMap[row.license_page_id] ?? 0) + 1;
    }
  }

  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'Creator';
  const totalAcceptances = Object.values(acceptanceCountMap).reduce((a, b) => a + b, 0);

  // Get entitlements for plan badge + upgrade prompt
  const ents = await getUserEntitlements(svc, user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-indigo-600">PactTailor</Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/wizard" className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors">
              + New Contract
            </Link>
            <Link href="/profile" className="text-gray-500 hover:text-gray-900">Profile</Link>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">{user.email}</span>
            <form action={signOut}>
              <button type="submit" className="text-gray-500 hover:text-gray-900">Sign out</button>
            </form>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {displayName} 👋</h1>
            <p className="text-gray-500 mt-1 text-sm">Manage your contracts, exports, and license pages.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              ents.plan === 'unlimited'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {ents.plan === 'unlimited' ? '✨ Unlimited' : `🆓 Free — ${ents.freeExportsRemaining}/2 exports left`}
            </span>
            {ents.plan !== 'unlimited' && (
              <Link href="/pricing"
                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                Upgrade $9/yr →
              </Link>
            )}
            {ents.plan === 'unlimited' && (
              <form action="/api/customer-portal" method="POST">
                <Link href="#"
                  onClick={async (e) => { e.preventDefault(); const r = await fetch('/api/customer-portal',{method:'POST'}); const d = await r.json(); if(d.url) window.location.href=d.url; }}
                  className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                  Manage Plan
                </Link>
              </form>
            )}
          </div>
        </div>

        {/* Upgrade banner when approaching free tier limit */}
        {ents.plan === 'free' && ents.freeExportsRemaining <= 1 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {ents.freeExportsRemaining === 0
                  ? '🚫 You\'ve used all free exports this month'
                  : '⚠️ Only 1 free export remaining this month'}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Upgrade to PactTailor Unlimited for unlimited exports, hosted license pages, and more — just $9/year.
              </p>
            </div>
            <Link href="/pricing"
              className="flex-shrink-0 bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors">
              Upgrade →
            </Link>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Contracts',    value: contractCount ?? 0, icon: '📄', color: 'indigo' },
            { label: 'License Pages', value: licensePages?.length ?? 0, icon: '🔗', color: 'purple' },
            { label: 'Exports',      value: recentExports?.length ?? 0, icon: '⬇️', color: 'blue' },
            { label: 'Acceptances',  value: totalAcceptances, icon: '✅', color: 'green' },
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Start a new contract</h2>
          <div className="grid sm:grid-cols-4 gap-3">
            {[
              { icon: '🎨', label: 'Commission Agreement', href: '/wizard?template=commissioned-work-agreement-us' },
              { icon: '📦', label: 'Asset License', href: '/wizard?template=game-asset-pack-commercial' },
              { icon: '🤝', label: 'Collaborator Split', href: '/wizard?template=collaborator-split-agreement-us' },
              { icon: '🌐', label: 'Browse Templates', href: '/wizard' },
            ].map(a => (
              <Link key={a.label} href={a.href}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all">
                <div className="text-xl mb-1">{a.icon}</div>
                <div className="text-sm font-medium text-gray-900">{a.label}</div>
                <div className="text-xs text-indigo-600 mt-0.5">Create →</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Contracts */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">
              Contracts <span className="text-gray-400 font-normal text-sm">({contractCount ?? 0})</span>
            </h2>
            <Link href="/wizard" className="text-xs text-indigo-600 hover:underline">+ New →</Link>
          </div>

          {contracts && contracts.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-medium">
                    <th className="text-left px-4 py-3">Contract</th>
                    <th className="text-left px-4 py-3 hidden sm:table-cell">Template</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Version</th>
                    <th className="text-left px-4 py-3 hidden lg:table-cell">Created</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {contracts.map(contract => (
                    <ContractRow
                      key={contract.id}
                      contract={contract}
                      appUrl={APP_URL}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl p-10 text-center">
              <p className="text-gray-400 text-sm">No contracts yet.</p>
              <Link href="/wizard" className="mt-3 inline-block bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                Create your first contract →
              </Link>
            </div>
          )}
        </section>

        {/* License Pages */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">
              License Pages <span className="text-gray-400 font-normal text-sm">({licensePages?.length ?? 0})</span>
            </h2>
          </div>

          {licensePages && licensePages.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-medium">
                    <th className="text-left px-4 py-3">Page</th>
                    <th className="text-left px-4 py-3 hidden sm:table-cell">Views</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Acceptances</th>
                    <th className="text-left px-4 py-3 hidden lg:table-cell">Status</th>
                    <th className="text-left px-4 py-3">Links</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {licensePages.map(lp => (
                    <LicensePageRow
                      key={lp.id}
                      page={lp}
                      acceptanceCount={acceptanceCountMap[lp.id] ?? 0}
                      appUrl={APP_URL}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center">
              <p className="text-gray-400 text-sm">No license pages yet. Open a contract and click &ldquo;Publish&rdquo; to get a public URL + badge.</p>
            </div>
          )}
        </section>

        {/* Recent Acceptances */}
        {recentAcceptances && recentAcceptances.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Recent Acceptances <span className="text-gray-400 font-normal text-sm">({recentAcceptances.length})</span>
            </h2>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-medium">
                    <th className="text-left px-4 py-3">Name / Email</th>
                    <th className="text-left px-4 py-3 hidden sm:table-cell">Accepted</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">IP</th>
                    <th className="text-left px-4 py-3 hidden lg:table-cell">ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentAcceptances.map(a => (
                    <AcceptanceRow key={a.id} acceptance={a} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
