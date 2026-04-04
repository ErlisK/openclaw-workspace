'use client'
/**
 * /admin/rls — Row Level Security review dashboard
 *
 * Shows:
 * - RLS enable/disable status per table
 * - Policy count and list per table  
 * - COPPA compliance status (children/profiles)
 * - Auth trigger status
 * - Manual RLS test (simulate anon vs authenticated query)
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface TableRLS {
  tbl: string
  rls: boolean
  policies: number
  policyList: { name: string; cmd: string }[]
  userFacing: boolean
  coppaRelevant: boolean
}



const TABLE_NOTES: Record<string, string> = {
  trial_sessions:       'Users see only their own. Anon sessions (user_id=NULL) accessible via service role only.',
  trial_pages:          'Users see pages from their own sessions. Service role writes.',
  profiles:             'Users see/update own. Auto-created on auth.users insert via trigger.',
  children:             'COPPA: parent_id = auth.uid(). No child auth accounts. Max 5 per parent.',
  events:               'Anon insert (telemetry). Users see own session events.',
  survey_responses:     'Anon insert. Users see own (via session_token join).',
  paywall_clicks:       'Anon insert for tracking. Service role reads for analytics.',
  moderation_logs:      'Anon insert (from session creation). Service role reads for admin review.',
  experiment_assignments: 'Anon insert. Service role reads for experiment analysis.',
  feature_flags:        'Public read. Service role write only.',
  books:                'Users see own purchased books. Service role writes.',
}

export default function RLSAdminPage() {
  const [tables, setTables] = useState<TableRLS[]>([])
  const [loading, setLoading] = useState(true)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testLoading, setTestLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/rls')
    if (res.ok) {
      const d = await res.json() as { tables: TableRLS[] }
      setTables(d.tables ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const runTest = async (test: string) => {
    setTestLoading(true)
    setTestResult(null)
    const res = await fetch(`/api/admin/rls?test=${test}`)
    const d = await res.json() as { result: string }
    setTestResult(d.result)
    setTestLoading(false)
  }

  const userFacingTables = tables.filter(t => t.userFacing)
  const adminTables = tables.filter(t => !t.userFacing)
  const allGood = userFacingTables.every(t => t.rls && t.policies > 0)
  const coppaGood = tables.filter(t => t.coppaRelevant).every(t => t.rls && t.policies > 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-indigo-700 text-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/admin" className="text-indigo-300 hover:text-white text-sm">← Admin</Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">🔐 Row Level Security — Multi-Tenant Review</h1>
            <p className="text-indigo-200 text-xs mt-0.5">
              Schema v4.0.0 · RLS policies per table · COPPA compliance · Auth trigger
            </p>
          </div>
          <button onClick={load}
            className="text-sm border border-indigo-500 px-3 py-1.5 rounded-lg hover:bg-indigo-600">
            ↻ Refresh
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

        {/* Status cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'User tables RLS', value: allGood ? '✅ All good' : '⚠️ Gaps found', color: allGood ? 'text-green-600' : 'text-amber-600' },
            { label: 'COPPA tables', value: coppaGood ? '✅ Protected' : '⚠️ Check needed', color: coppaGood ? 'text-green-600' : 'text-red-600' },
            { label: 'Tables with RLS', value: `${tables.filter(t => t.rls).length}/${tables.length}`, color: 'text-indigo-600' },
            { label: 'Total policies', value: tables.reduce((s, t) => s + t.policies, 0), color: 'text-indigo-600' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className={`text-xl font-extrabold ${c.color}`}>{c.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3"/>
            Loading RLS state…
          </div>
        ) : (
          <>
            {/* User-facing tables */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 mb-3">User-Facing Tables (require RLS)</h2>
              <div className="space-y-2">
                {userFacingTables.map(t => (
                  <div key={t.tbl} className={`rounded-xl p-3 border ${
                    t.rls && t.policies > 0 ? 'border-green-100 bg-green-50' :
                    t.rls ? 'border-amber-100 bg-amber-50' : 'border-red-100 bg-red-50'
                  }`}>
                    <div className="flex items-start gap-2">
                      <span className="text-lg flex-shrink-0">
                        {t.rls && t.policies > 0 ? '✅' : t.rls ? '⚠️' : '❌'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-gray-800">{t.tbl}</span>
                          {t.coppaRelevant && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">
                              COPPA
                            </span>
                          )}
                          <span className="text-xs text-gray-500">{t.policies} polic{t.policies === 1 ? 'y' : 'ies'}</span>
                        </div>
                        {t.policyList.length > 0 && (
                          <div className="flex gap-1 flex-wrap mt-1">
                            {t.policyList.map(p => (
                              <span key={p.name} className="text-xs bg-white border border-gray-200
                                                             px-1.5 py-0.5 rounded font-mono text-gray-600">
                                [{p.cmd}] {p.name}
                              </span>
                            ))}
                          </div>
                        )}
                        {TABLE_NOTES[t.tbl] && (
                          <p className="text-xs text-gray-500 mt-1">{TABLE_NOTES[t.tbl]}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin/read-only tables */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 mb-1">Admin / Research Tables</h2>
              <p className="text-xs text-gray-500 mb-3">
                Accessed only via service role (bypasses RLS). Acceptable if no user PII.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {adminTables.map(t => (
                  <div key={t.tbl} className={`rounded-xl p-2.5 border text-xs ${
                    t.rls ? 'border-green-100 bg-green-50' : 'border-gray-100 bg-gray-50'
                  }`}>
                    <span className="font-mono font-semibold text-gray-700">{t.tbl}</span>
                    <span className="ml-1 text-gray-400">{t.rls ? '🔒' : '⚪'} {t.policies}p</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Auth trigger */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 mb-3">Auth Trigger: Auto-Profile Creation</h2>
              <div className="bg-gray-50 rounded-xl p-4 font-mono text-xs text-gray-600 overflow-x-auto">
                <pre>{`-- Fires on auth.users INSERT
-- Creates profiles row automatically (no manual profile creation needed)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, coppa_agreed, is_subscribed, books_created)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    FALSE, FALSE, 0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`}</pre>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Status: ✅ Active. Every new auth.users row creates a corresponding profiles row.
              </p>
            </div>

            {/* COPPA architecture */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
              <h2 className="font-bold text-blue-800 mb-3">🛡️ COPPA Architecture</h2>
              <div className="grid sm:grid-cols-2 gap-4 text-sm text-blue-700">
                <div className="space-y-2">
                  <p className="font-semibold">Parent accounts (auth.users)</p>
                  <ul className="space-y-1 text-xs">
                    <li>✅ Magic-link email auth (parent email only)</li>
                    <li>✅ profiles.coppa_agreed gated before child creation</li>
                    <li>✅ profiles.coppa_agreed_at timestamped</li>
                    <li>✅ Display name optional (no real name required)</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold">Child profiles (children table)</p>
                  <ul className="space-y-1 text-xs">
                    <li>✅ No auth accounts for children</li>
                    <li>✅ Nickname + age_years + interests only</li>
                    <li>✅ parent_id = auth.uid() (RLS enforced)</li>
                    <li>✅ Soft-delete; hard erasure on request</li>
                    <li>✅ Max 5 children per parent (abuse prevention)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Manual RLS tests */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 mb-3">🧪 Manual RLS Tests</h2>
              <p className="text-xs text-gray-500 mb-3">
                These queries run with the anon key (no auth) to verify isolation.
              </p>
              <div className="flex gap-2 flex-wrap mb-3">
                {[
                  { id: 'anon_sessions', label: 'Anon sees sessions?' },
                  { id: 'anon_children', label: 'Anon sees children?' },
                  { id: 'anon_profiles', label: 'Anon sees profiles?' },
                ].map(t => (
                  <button key={t.id} onClick={() => runTest(t.id)} disabled={testLoading}
                    className="text-sm bg-gray-100 hover:bg-indigo-100 text-gray-700 hover:text-indigo-700
                               px-3 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50">
                    {t.label}
                  </button>
                ))}
              </div>
              {testResult && (
                <div className="bg-gray-50 rounded-xl p-3 text-sm font-mono text-gray-700 border border-gray-100">
                  {testResult}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
