'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface IntegrationData {
  sso: {
    providers: Array<{ id: string; provider_type: string; provider_name: string; domain_hint: string; enabled: boolean; tested_at: string | null }>
    count: number; tested: number
  }
  exports: {
    jobs: Array<{ id: string; target_cms: string; export_format: string; status: string; claim_count: number; citation_count: number; completed_at: string | null; output_size_bytes: number | null; compliance_pack: string | null }>
    templates: Array<{ id: string; name: string; target_system: string; format: string; compliance_pack: string | null; version: number; active: boolean }>
    done: number; processing: number
  }
  retraction: {
    monitored: number; retracted: number; expressionOfConcern: number; clean: number
    items: Array<{ id: string; doi: string; title: string; retracted: boolean; expression_of_concern: boolean; check_count: number; last_checked: string; next_check: string; retraction_reason: string | null }>
  }
  livingCitations: {
    total: number; verdictChanged: number; alertsSent: number
    items: Array<{ id: string; doi: string; claim_text: string; original_verdict: string; current_verdict: string; verdict_changed: boolean; scite_direction: string; cite_score: number; last_validated: string; validation_count: number; alert_sent: boolean }>
  }
  cron: {
    total: number; active: number
    jobs: Array<{ id: string; name: string; description: string; schedule: string; handler: string; last_run: string; last_status: string; last_duration_ms: number; run_count: number; error_count: number; enabled: boolean }>
  }
}

const PROVIDER_ICONS: Record<string, string> = {
  azure_ad: '🔷', okta: '🔵', google_workspace: '🔴', saml: '🔒', oidc: '🟢'
}
const CMS_ICONS: Record<string, string> = {
  wordpress: '🔵', contentful: '🟠', veeva: '💊', promomatts: '📋', hubspot: '🟡',
  sanity: '⚡', webflow: '🌐', ghost: '👻', notion: '⬛',
}
const SCITE_COLORS: Record<string, string> = {
  supporting: 'text-emerald-400', contrasting: 'text-red-400', mentioning: 'text-gray-400'
}

type Tab = 'sso' | 'exports' | 'retraction' | 'living' | 'cron'

export default function IntegrationsPage() {
  const [data, setData] = useState<IntegrationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('sso')
  const [running, setRunning] = useState<string | null>(null)

  useEffect(() => { fetch('/api/integrations').then(r => r.json()).then(d => { setData(d); setLoading(false) }) }, [])

  async function runCronJob(handler: string, label: string) {
    setRunning(label)
    await fetch(`/api/${handler}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then(r => r.json()).then(r => { alert(JSON.stringify(r, null, 2)) }).catch(() => {})
    setRunning(null)
    fetch('/api/integrations').then(r => r.json()).then(setData)
  }

  if (loading || !data) return <div className="pt-24 text-center text-gray-500 text-sm">Loading integrations…</div>

  const TABS: Array<{ id: Tab; label: string }> = [
    { id: 'sso', label: `SSO (${data.sso.count})` },
    { id: 'exports', label: `CMS Exports (${data.exports.done} done)` },
    { id: 'retraction', label: `Retraction Monitor (${data.retraction.retracted} retracted)` },
    { id: 'living', label: `Living Citations (${data.livingCitations.total})` },
    { id: 'cron', label: `Cron Jobs (${data.cron.active} active)` },
  ]

  return (
    <div className="pt-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-white">Integrations</h1>
            <p className="text-xs text-gray-500 mt-0.5">SSO · CMS exports · Veeva/PromoMats · Retraction monitoring · Living citations · Cron jobs</p>
          </div>
          <Link href="/admin" className="text-xs px-3 py-1.5 border border-gray-700 text-gray-400 rounded-lg">← Admin</Link>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-5 gap-3 mb-8">
          {[
            { label: 'SSO providers', value: `${data.sso.tested}/${data.sso.count} tested`, pass: data.sso.tested === data.sso.count },
            { label: 'CMS exports', value: `${data.exports.done} complete`, pass: data.exports.done > 0 },
            { label: 'DOIs monitored', value: data.retraction.monitored, pass: true },
            { label: 'Retractions found', value: data.retraction.retracted, pass: data.retraction.retracted === 0 },
            { label: 'Verdict changes', value: data.livingCitations.verdictChanged, pass: data.livingCitations.verdictChanged === 0 },
          ].map(({ label, value, pass }) => (
            <div key={label} className="rounded-xl border border-gray-800 bg-gray-900 p-3 text-center">
              <div className={`text-xl font-bold ${pass ? 'text-white' : 'text-amber-400'}`}>{value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
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

        {/* SSO TAB */}
        {tab === 'sso' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Enterprise SSO Providers</h3>
              <div className="space-y-3">
                {data.sso.providers.map(p => (
                  <div key={p.id} className="rounded-lg border border-gray-800 p-4 flex items-start gap-4">
                    <span className="text-2xl">{PROVIDER_ICONS[p.provider_type] || '🔑'}</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white">{p.provider_name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {p.provider_type.toUpperCase()} · Domain: <span className="text-gray-400">{p.domain_hint || '—'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs px-2 py-0.5 rounded border ${p.enabled ? 'border-emerald-700/40 text-emerald-400 bg-emerald-950/20' : 'border-gray-700 text-gray-500'}`}>
                        {p.enabled ? 'Active' : 'Inactive'}
                      </div>
                      {p.tested_at ? (
                        <div className="text-xs text-gray-600 mt-1">Tested {new Date(p.tested_at).toLocaleDateString()}</div>
                      ) : (
                        <div className="text-xs text-amber-600 mt-1">Not yet tested</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 text-xs text-gray-500">
              <div className="font-medium text-gray-400 mb-2">Supabase Enterprise SSO Setup</div>
              <div className="space-y-1">
                <div>1. Enterprise org enables SSO in Supabase dashboard → Authentication → SSO</div>
                <div>2. Upload SAML metadata XML or OIDC discovery URL</div>
                <div>3. Map attributes: email, name, group membership</div>
                <div>4. Test with sandbox tenant before enabling</div>
                <div>5. Domain hint allows automatic IdP routing (no password form shown)</div>
              </div>
            </div>
          </div>
        )}

        {/* EXPORTS TAB */}
        {tab === 'exports' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-800 overflow-hidden">
              <div className="border-b border-gray-800 bg-gray-900 px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent Export Jobs</div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/50">
                    {['CMS','Format','Claims','Citations','Compliance','Status','Size','Completed'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.exports.jobs.map(j => (
                    <tr key={j.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                      <td className="px-3 py-2 text-white font-medium">{CMS_ICONS[j.target_cms]} {j.target_cms}</td>
                      <td className="px-3 py-2 text-gray-400 font-mono text-xs">{j.export_format}</td>
                      <td className="px-3 py-2 text-gray-400">{j.claim_count || '—'}</td>
                      <td className="px-3 py-2 text-gray-400">{j.citation_count || '—'}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{j.compliance_pack || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={j.status === 'done' ? 'text-emerald-400' : j.status === 'processing' ? 'text-amber-400' : 'text-gray-500'}>
                          {j.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{j.output_size_bytes ? `${(j.output_size_bytes / 1024).toFixed(0)}kb` : '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{j.completed_at ? new Date(j.completed_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-gray-800 overflow-hidden">
              <div className="border-b border-gray-800 bg-gray-900 px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Export Templates</div>
              <div className="divide-y divide-gray-800">
                {data.exports.templates.map(t => (
                  <div key={t.id} className="px-4 py-3 flex items-center gap-4">
                    <span className="text-xl">{CMS_ICONS[t.target_system] || '📄'}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{t.name}</div>
                      <div className="text-xs text-gray-500">{t.target_system} · {t.format} · v{t.version}{t.compliance_pack ? ` · ${t.compliance_pack}` : ''}</div>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${t.active ? 'border-emerald-700/40 text-emerald-400' : 'border-gray-700 text-gray-600'}`}>
                      {t.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RETRACTION TAB */}
        {tab === 'retraction' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'DOIs monitored', value: data.retraction.monitored, color: 'text-white' },
                { label: 'Retracted', value: data.retraction.retracted, color: data.retraction.retracted > 0 ? 'text-red-400' : 'text-emerald-400' },
                { label: 'Expression of concern', value: data.retraction.expressionOfConcern, color: data.retraction.expressionOfConcern > 0 ? 'text-amber-400' : 'text-white' },
                { label: 'Clean', value: data.retraction.clean, color: 'text-emerald-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center">
                  <div className={`text-2xl font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900">
                    {['DOI','Title','Status','Checks','Last check','Next check'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.retraction.items.map(item => (
                    <tr key={item.id} className={`border-b border-gray-800/50 ${item.retracted ? 'bg-red-950/10' : item.expression_of_concern ? 'bg-amber-950/10' : ''}`}>
                      <td className="px-3 py-2 font-mono text-blue-400 text-xs">{item.doi?.slice(0, 25)}…</td>
                      <td className="px-3 py-2 text-gray-300 max-w-[180px] truncate">{item.title}</td>
                      <td className="px-3 py-2">
                        {item.retracted
                          ? <span className="text-red-400 font-semibold">⚠ Retracted</span>
                          : item.expression_of_concern
                          ? <span className="text-amber-400">⚠ EoC</span>
                          : <span className="text-emerald-400">✓ Clean</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-500">{item.check_count}</td>
                      <td className="px-3 py-2 text-gray-500">{item.last_checked ? new Date(item.last_checked).toLocaleDateString() : '—'}</td>
                      <td className="px-3 py-2 text-gray-600">{item.next_check ? new Date(item.next_check).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <button onClick={() => runCronJob('cron/retraction-monitor', 'retraction')}
                disabled={running === 'retraction'}
                className="text-xs px-3 py-1.5 bg-blue-950/50 border border-blue-700/40 text-blue-400 rounded-lg disabled:opacity-50">
                {running === 'retraction' ? 'Running…' : '▶ Run retraction check now'}
              </button>
            </div>
          </div>
        )}

        {/* LIVING CITATIONS TAB */}
        {tab === 'living' && (
          <div className="space-y-4">
            {data.livingCitations.verdictChanged > 0 && (
              <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-4 text-sm text-amber-300">
                ⚠ {data.livingCitations.verdictChanged} citation(s) have changed verdict since original review.
                Affected orgs have been notified.
              </div>
            )}
            <div className="rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900">
                    {['DOI','Claim','Original','Current','Scite','Score','Validated','Alert'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.livingCitations.items.map(c => (
                    <tr key={c.id} className={`border-b border-gray-800/50 ${c.verdict_changed ? 'bg-amber-950/10' : ''}`}>
                      <td className="px-3 py-2 font-mono text-blue-400 text-xs">{c.doi?.slice(0, 22)}…</td>
                      <td className="px-3 py-2 text-gray-300 max-w-[160px] truncate">{c.claim_text}</td>
                      <td className="px-3 py-2 text-gray-500">{c.original_verdict?.replace('_',' ')}</td>
                      <td className="px-3 py-2">
                        <span className={c.verdict_changed ? 'text-amber-400 font-semibold' : 'text-gray-400'}>
                          {c.current_verdict?.replace('_',' ')}
                        </span>
                      </td>
                      <td className={`px-3 py-2 ${SCITE_COLORS[c.scite_direction] || 'text-gray-500'}`}>{c.scite_direction}</td>
                      <td className="px-3 py-2 text-gray-400">{c.cite_score}</td>
                      <td className="px-3 py-2 text-gray-500">{c.last_validated ? new Date(c.last_validated).toLocaleDateString() : '—'}</td>
                      <td className="px-3 py-2">{c.alert_sent ? <span className="text-amber-400">sent</span> : <span className="text-gray-600">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <button onClick={() => runCronJob('cron/living-citations', 'living')}
                disabled={running === 'living'}
                className="text-xs px-3 py-1.5 bg-blue-950/50 border border-blue-700/40 text-blue-400 rounded-lg disabled:opacity-50">
                {running === 'living' ? 'Running…' : '▶ Run living citations revalidation'}
              </button>
            </div>
          </div>
        )}

        {/* CRON TAB */}
        {tab === 'cron' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900">
                    {['Job','Schedule','Last run','Status','Duration','Runs','Errors','Enabled'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.cron.jobs.map(job => (
                    <tr key={job.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                      <td className="px-3 py-2">
                        <div className="text-white font-medium">{job.name}</div>
                        <div className="text-gray-600 text-xs max-w-[200px] truncate">{job.description}</div>
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-400">{job.schedule}</td>
                      <td className="px-3 py-2 text-gray-500">{job.last_run ? new Date(job.last_run).toLocaleString() : '—'}</td>
                      <td className="px-3 py-2">
                        <span className={job.last_status === 'success' ? 'text-emerald-400' : job.last_status === 'failed' ? 'text-red-400' : 'text-gray-500'}>
                          {job.last_status || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500">{job.last_duration_ms ? `${job.last_duration_ms}ms` : '—'}</td>
                      <td className="px-3 py-2 text-gray-400">{job.run_count}</td>
                      <td className="px-3 py-2">
                        <span className={job.error_count > 0 ? 'text-amber-400' : 'text-gray-600'}>{job.error_count}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={job.enabled ? 'text-emerald-400' : 'text-gray-600'}>{job.enabled ? '● on' : '○ off'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 text-xs text-gray-500">
              <div className="font-medium text-gray-400 mb-2">Cron Infrastructure</div>
              <div className="space-y-1">
                <div>• Supabase Edge Functions cron: scheduled via Supabase dashboard → Edge Functions → Schedule</div>
                <div>• Vercel cron jobs: configured in vercel.json (crons array) — calls /api/cron/* endpoints</div>
                <div>• All cron runs logged to cc_cron_jobs and cc_audit_log_v2</div>
                <div>• Secrets verified via x-cron-secret header (CRON_SECRET env var)</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
