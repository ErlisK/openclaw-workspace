'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const CATEGORY_NAMES: Record<string, string> = {
  cc1: 'CC1 – Control Environment', cc2: 'CC2 – Communication',
  cc3: 'CC3 – Risk Assessment', cc4: 'CC4 – Monitoring',
  cc5: 'CC5 – Control Activities', cc6: 'CC6 – Logical Access',
  cc7: 'CC7 – System Operations', cc8: 'CC8 – Change Management',
  cc9: 'CC9 – Risk Mitigation', a1: 'A1 – Availability',
  p1: 'P1 – Privacy',
}
const STATUS_STYLE: Record<string, string> = {
  evidenced: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40',
  implemented: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
  in_progress: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
  not_started: 'bg-gray-800 text-gray-500 border-gray-700',
  exception: 'bg-red-900/40 text-red-300 border-red-700/40',
}
const SENSITIVITY_STYLE: Record<string, string> = {
  critical: 'text-red-400', high: 'text-amber-400', medium: 'text-blue-400', low: 'text-gray-500'
}

type Tab = 'soc2' | 'dpia' | 'rls' | 'inventory' | 'secrets'

interface ComplianceData {
  soc2: {
    controls: Array<{ control_id: string; category: string; control_name: string; description: string; status: string; owner: string; evidence_url: string; reviewed_at: string; implemented_at: string }>
    byCategory: Record<string, { total: number; evidenced: number; implemented: number; inProgress: number }>
    statusCounts: { evidenced: number; implemented: number; in_progress: number; not_started: number }
    totalControls: number; readyControls: number; readinessPct: number; type1TargetDate: string
  }
  dpia: { records: Array<{ id: string; processing_activity: string; status: string; legal_basis: string; residual_risk: string; approved_at: string; review_date: string; transfers_outside_eea: boolean }>; approved: number }
  rls: { audit: Array<{ table_name: string; rls_enabled: boolean; policy_count: number; notes: string }>; enabled: number; total: number; pct: number }
  secrets: { log: Array<{ secret_name: string; environment: string; rotated_at: string; next_rotation: string; status: string }>; rotationDue: number }
  dataInventory: { tables: Array<{ table_name: string; data_category: string; sensitivity: string; contains_pii: boolean; pii_fields: string[]; retention_days: number; deletion_policy: string; notes: string }>; highSensitivity: number; piiTables: number; total: number }
}

export default function CompliancePage() {
  const [data, setData] = useState<ComplianceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('soc2')
  const [expandedControl, setExpandedControl] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/compliance').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading || !data) return <div className="pt-24 text-center text-gray-500 text-sm">Loading compliance posture…</div>

  const { soc2, dpia, rls, secrets, dataInventory } = data

  const TABS: Array<{ id: Tab; label: string }> = [
    { id: 'soc2', label: `SOC 2 Readiness (${soc2.readinessPct}%)` },
    { id: 'dpia', label: `DPIA (${dpia.approved} approved)` },
    { id: 'rls', label: `RLS Audit (${rls.pct}%)` },
    { id: 'inventory', label: `Data Inventory (${dataInventory.piiTables} PII tables)` },
    { id: 'secrets', label: `Secrets (${secrets.rotationDue} due)` },
  ]

  return (
    <div className="pt-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-white">Security &amp; Compliance Posture</h1>
            <p className="text-xs text-gray-500 mt-0.5">SOC 2 Type I readiness · DPIA · RLS verification · Data minimization · Secrets rotation</p>
          </div>
          <div className="flex gap-2">
            <Link href="/security" className="text-xs px-3 py-1.5 border border-gray-700 text-gray-400 rounded-lg">Public security page →</Link>
            <Link href="/admin" className="text-xs px-3 py-1.5 border border-gray-700 text-gray-400 rounded-lg">← Admin</Link>
          </div>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-5 gap-3 mb-8">
          {[
            { label: 'SOC 2 readiness', value: `${soc2.readinessPct}%`, pass: soc2.readinessPct >= 70, note: `${soc2.readyControls}/${soc2.totalControls} controls` },
            { label: 'DPIAs approved', value: dpia.approved, pass: dpia.approved >= 3, note: 'EU GDPR' },
            { label: 'RLS coverage', value: `${rls.pct}%`, pass: rls.pct >= 95, note: `${rls.enabled}/${rls.total} tables` },
            { label: 'PII tables', value: dataInventory.piiTables, pass: true, note: 'inventoried' },
            { label: 'Secrets due rotation', value: secrets.rotationDue, pass: secrets.rotationDue === 0, note: 'within 30 days' },
          ].map(({ label, value, pass, note }) => (
            <div key={label} className={`rounded-xl border p-4 text-center ${pass ? 'border-gray-800 bg-gray-900' : 'border-amber-800/40 bg-amber-950/20'}`}>
              <div className={`text-2xl font-bold ${pass ? 'text-white' : 'text-amber-400'}`}>{value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{label}</div>
              <div className="text-xs text-gray-600">{note}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 flex-wrap">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg border transition-colors ${tab === t.id ? 'border-blue-600 bg-blue-950/50 text-blue-300' : 'border-gray-700 text-gray-500 hover:border-gray-600'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* SOC 2 TAB */}
        {tab === 'soc2' && (
          <div className="space-y-4">
            {/* Status summary */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Evidenced', count: soc2.statusCounts.evidenced, style: STATUS_STYLE.evidenced },
                { label: 'Implemented', count: soc2.statusCounts.implemented, style: STATUS_STYLE.implemented },
                { label: 'In progress', count: soc2.statusCounts.in_progress, style: STATUS_STYLE.in_progress },
                { label: 'Not started', count: soc2.statusCounts.not_started, style: STATUS_STYLE.not_started },
              ].map(({ label, count, style }) => (
                <div key={label} className={`rounded-xl border p-4 text-center ${style}`}>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs mt-0.5 opacity-80">{label}</div>
                </div>
              ))}
            </div>

            {/* Category progress */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                SOC 2 Type I — Target: {soc2.type1TargetDate}
              </div>
              <div className="space-y-3">
                {Object.entries(soc2.byCategory).map(([cat, stats]) => {
                  const pct = Math.round(((stats.evidenced + stats.implemented) / stats.total) * 100)
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <div className="w-36 text-xs text-gray-400 shrink-0">{CATEGORY_NAMES[cat] || cat}</div>
                      <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full flex">
                          <div className="bg-emerald-600/70 h-full transition-all" style={{ width: `${stats.evidenced / stats.total * 100}%` }} />
                          <div className="bg-blue-600/70 h-full transition-all" style={{ width: `${stats.implemented / stats.total * 100}%` }} />
                          <div className="bg-amber-600/50 h-full transition-all" style={{ width: `${stats.inProgress / stats.total * 100}%` }} />
                        </div>
                      </div>
                      <div className="w-12 text-right text-xs text-gray-400">{pct}%</div>
                      <div className="text-xs text-gray-600">{stats.evidenced + stats.implemented}/{stats.total}</div>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-4 mt-3 text-xs text-gray-600">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" /> Evidenced</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600 inline-block" /> Implemented</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-600 inline-block" /> In progress</span>
              </div>
            </div>

            {/* Control detail table */}
            <div className="rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900">
                    {['ID','Category','Control','Status','Evidence','Owner'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {soc2.controls.map(c => (
                    <>
                      <tr key={c.control_id} onClick={() => setExpandedControl(expandedControl === c.control_id ? null : c.control_id)}
                        className="border-b border-gray-800/50 hover:bg-gray-800/20 cursor-pointer">
                        <td className="px-3 py-2 font-mono text-gray-400">{c.control_id}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{CATEGORY_NAMES[c.category]?.split('–')[1]?.trim() || c.category}</td>
                        <td className="px-3 py-2 text-white">{c.control_name}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded border text-xs ${STATUS_STYLE[c.status] || ''}`}>{c.status}</span>
                        </td>
                        <td className="px-3 py-2">
                          {c.evidence_url ? <a href={c.evidence_url} className="text-blue-400 hover:underline">view →</a> : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-3 py-2 text-gray-500">{c.owner}</td>
                      </tr>
                      {expandedControl === c.control_id && (
                        <tr key={`${c.control_id}-expand`} className="border-b border-gray-800">
                          <td colSpan={6} className="px-4 py-3 bg-gray-800/40 text-xs text-gray-400">{c.description}</td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DPIA TAB */}
        {tab === 'dpia' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 text-xs text-gray-500">
              Data Protection Impact Assessments (GDPR Art. 35) for high-risk processing activities.
              Required for EU customers. 3 DPIAs approved.
            </div>
            <div className="space-y-4">
              {dpia.records.map(d => (
                <div key={d.id} className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{d.processing_activity}</h3>
                      <div className="text-xs text-gray-500 mt-0.5">Legal basis: {d.legal_basis?.slice(0, 80)}</div>
                    </div>
                    <div className="flex gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${d.status === 'approved' ? 'border-emerald-700/40 text-emerald-400 bg-emerald-950/20' : 'border-amber-700/40 text-amber-400'}`}>
                        {d.status}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${d.residual_risk === 'low' ? 'border-emerald-700/40 text-emerald-400' : 'border-amber-700/40 text-amber-400'}`}>
                        Risk: {d.residual_risk}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs text-gray-500">
                    <div>EEA transfers: <span className={d.transfers_outside_eea ? 'text-amber-400' : 'text-emerald-400'}>{d.transfers_outside_eea ? 'Yes (SCCs)' : 'No'}</span></div>
                    <div>Approved: <span className="text-gray-300">{d.approved_at ? new Date(d.approved_at).toLocaleDateString() : '—'}</span></div>
                    <div>Review date: <span className="text-gray-300">{d.review_date}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RLS TAB */}
        {tab === 'rls' && (
          <div className="space-y-4">
            <div className={`rounded-xl border p-4 ${rls.pct >= 95 ? 'border-emerald-800/40 bg-emerald-950/20' : 'border-amber-800/40 bg-amber-950/20'}`}>
              <div className="text-sm font-semibold text-white">
                {rls.pct >= 95 ? '✓' : '⚠'} {rls.enabled}/{rls.total} tables have RLS enabled ({rls.pct}%)
              </div>
              <div className="text-xs text-gray-400 mt-1">
                All cc_ tables enabled with service_role_bypass policy. Service-role API routes have full access.
                Anon key restricted by RLS — cannot read any sensitive table.
              </div>
            </div>
            <div className="rounded-xl border border-gray-800 overflow-hidden max-h-[500px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0">
                  <tr className="border-b border-gray-800 bg-gray-900">
                    {['Table','RLS Enabled','Policies','Notes'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rls.audit.map(r => (
                    <tr key={r.table_name} className={`border-b border-gray-800/50 ${!r.rls_enabled ? 'bg-amber-950/10' : ''}`}>
                      <td className="px-3 py-1.5 font-mono text-xs text-gray-300">{r.table_name}</td>
                      <td className="px-3 py-1.5">{r.rls_enabled ? <span className="text-emerald-400">✓</span> : <span className="text-amber-400">✗</span>}</td>
                      <td className="px-3 py-1.5 text-gray-500">{r.policy_count}</td>
                      <td className="px-3 py-1.5 text-gray-600 text-xs max-w-[300px] truncate">{r.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DATA INVENTORY TAB */}
        {tab === 'inventory' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900">
                    {['Table','Category','Sensitivity','PII','PII Fields','Retention','Deletion Policy'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataInventory.tables.map(t => (
                    <tr key={t.table_name} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                      <td className="px-3 py-2 font-mono text-xs text-gray-300">{t.table_name}</td>
                      <td className="px-3 py-2 text-gray-500">{t.data_category}</td>
                      <td className={`px-3 py-2 font-semibold ${SENSITIVITY_STYLE[t.sensitivity] || 'text-gray-500'}`}>{t.sensitivity}</td>
                      <td className="px-3 py-2">{t.contains_pii ? <span className="text-amber-400">⚠ yes</span> : <span className="text-gray-600">no</span>}</td>
                      <td className="px-3 py-2 text-gray-500 max-w-[140px] truncate">{t.pii_fields?.join(', ') || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{t.retention_days ? `${t.retention_days}d` : 'indefinite'}</td>
                      <td className="px-3 py-2 text-gray-600 max-w-[160px] truncate">{t.deletion_policy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECRETS TAB */}
        {tab === 'secrets' && (
          <div className="space-y-4">
            {secrets.rotationDue > 0 && (
              <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-4 text-sm text-amber-300">
                ⚠ {secrets.rotationDue} secret(s) due for rotation within 30 days
              </div>
            )}
            <div className="rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900">
                    {['Secret','Environment','Last rotated','Next rotation','Status'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {secrets.log.map(s => {
                    const due = s.next_rotation && new Date(s.next_rotation) <= new Date(Date.now() + 30 * 86400000)
                    return (
                      <tr key={s.secret_name} className={`border-b border-gray-800/50 ${due ? 'bg-amber-950/10' : ''}`}>
                        <td className="px-3 py-2 font-mono text-gray-300">{s.secret_name}</td>
                        <td className="px-3 py-2 text-gray-500">{s.environment}</td>
                        <td className="px-3 py-2 text-gray-500">{new Date(s.rotated_at).toLocaleDateString()}</td>
                        <td className={`px-3 py-2 ${due ? 'text-amber-400 font-semibold' : 'text-gray-500'}`}>{s.next_rotation || '—'}</td>
                        <td className="px-3 py-2">
                          <span className={s.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}>{s.status}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-gray-600">
              Rotation policy: Service-role keys every 90 days. Stripe/payment keys annually.
              Log all rotations in cc_secrets_log. Vercel env vars rotated via dashboard.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
