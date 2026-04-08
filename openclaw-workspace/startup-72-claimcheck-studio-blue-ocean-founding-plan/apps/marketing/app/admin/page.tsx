'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface UptimeTimeline { t: string; status: string; ms: number }

interface ReliabilityData {
  period: string
  uptime: {
    pct: number; total: number; up: number; down: number; degraded: number
    avgLatencyMs: number; targetPct: number; timeline: UptimeTimeline[]
  }
  sla: {
    totalEvents: number; breached: number; breachRate: number
    openIncidents: number; avgTTRHours: number; ttrTargetHours: number
    incidents: Array<{
      id: string; severity: string; title: string; status: string
      started_at: string; resolved_at?: string; ttr_seconds?: number
      incident_type: string; runbook_url?: string
    }>
  }
  reviewers: {
    total: number; poolTarget: number; avgAcceptancePct: number; acceptanceTarget: number
    avgDisputePct: number; disputeTarget: number; avgKappa: number
    byTier: { gold: number; silver: number; bronze: number }
  }
  contracts: {
    total: number; active: number; targetActive: number; totalARR: number; totalMRR: number
    list: Array<{
      org_name: string; arr: number; mrr: number; status: string
      sla_uptime_pct: number; sla_review_hours: number
      security_review_passed: boolean; hecvat_submitted: boolean
    }>
  }
  auditLog: Array<{
    id: number; event_type: string; entity: string; actor_type: string
    created_at: string; event_data: Record<string, unknown>
  }>
}

const SEV_COLORS: Record<string, string> = {
  p0: 'bg-red-900/60 text-red-300 border-red-700',
  p1: 'bg-orange-900/60 text-orange-300 border-orange-700',
  p2: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
  p3: 'bg-gray-800 text-gray-400 border-gray-700',
}
const STATUS_DOT: Record<string, string> = {
  up: 'bg-emerald-400',
  degraded: 'bg-amber-400',
  down: 'bg-red-500',
}

function MetricCard({ label, value, target, pass, note }: { label: string; value: string | number; target?: string; pass?: boolean; note?: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className={`text-2xl font-bold ${pass === undefined ? 'text-white' : pass ? 'text-emerald-400' : 'text-amber-400'}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
      {target && <div className="text-xs text-gray-600 mt-0.5">{target}</div>}
      {note && <div className="text-xs text-blue-400 mt-0.5">{note}</div>}
    </div>
  )
}

export default function AdminDashboard() {
  const [data, setData] = useState<ReliabilityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'incidents' | 'reviewers' | 'contracts' | 'audit'>('overview')
  const [days, setDays] = useState(30)

  useEffect(() => { fetchData() }, [days])

  async function fetchData() {
    setLoading(true)
    const r = await fetch(`/api/reliability?days=${days}`).then(r => r.json())
    setData(r)
    setLoading(false)
  }

  if (loading || !data) {
    return <div className="pt-24 text-center text-gray-500 text-sm">Loading reliability dashboard…</div>
  }

  const { uptime, sla, reviewers, contracts, auditLog } = data

  // Pass/fail for success criteria
  const uptimePass = uptime.pct >= 99.5
  const slaBreachPass = sla.breached <= 1
  const ttrPass = sla.avgTTRHours <= 8 || sla.avgTTRHours === 0
  const acceptancePass = reviewers.avgAcceptancePct >= 85
  const disputePass = reviewers.avgDisputePct <= 5
  const contractPass = contracts.active >= 2

  const TABS = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'incidents' as const, label: `Incidents (${sla.incidents.length})` },
    { id: 'reviewers' as const, label: `Reviewer Pool (${reviewers.total})` },
    { id: 'contracts' as const, label: `Contracts (${contracts.active} active)` },
    { id: 'audit' as const, label: 'Audit Log' },
  ]

  return (
    <div className="pt-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-white">Reliability &amp; Compliance Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">Phase 6 · Uptime · SLA · Reviewer pool · Enterprise contracts · Audit log</p>
          </div>
          <div className="flex gap-2 items-center">
            {[7,30,90].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`text-xs px-2.5 py-1 rounded border transition-colors ${days === d ? 'border-blue-600 bg-blue-950/40 text-blue-300' : 'border-gray-700 text-gray-500'}`}>
                {d}d
              </button>
            ))}
            <button onClick={fetchData} className="text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-400 rounded-lg">↻</button>
            <Link href="/runbooks" className="text-xs px-3 py-1.5 border border-amber-700/40 text-amber-400 rounded-lg">
              Runbooks →
            </Link>
          </div>
        </div>

        {/* Phase 6 success criteria */}
        <div className="rounded-xl border border-gray-800 bg-gray-950 p-4 mb-8">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Phase 6 Success Criteria</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: '≥99.5% 30-day uptime', pass: uptimePass, value: `${uptime.pct.toFixed(3)}%` },
              { label: 'SLA breaches ≤1/month', pass: slaBreachPass, value: `${sla.breached} breaches` },
              { label: 'Avg TTR ≤8 hours', pass: ttrPass, value: sla.avgTTRHours > 0 ? `${sla.avgTTRHours}h avg` : 'No breaches' },
              { label: 'Reviewer acceptance ≥85%', pass: acceptancePass, value: `${reviewers.avgAcceptancePct}%` },
              { label: 'Dispute rate ≤5%', pass: disputePass, value: `${reviewers.avgDisputePct}%` },
              { label: '≥2 enterprise contracts active', pass: contractPass, value: `${contracts.active} contracts` },
            ].map(({ label, pass, value }) => (
              <div key={label} className={`flex items-center gap-2.5 rounded-lg border p-2.5 ${pass ? 'border-emerald-800/40 bg-emerald-950/20' : 'border-amber-800/40 bg-amber-950/20'}`}>
                <span className={`text-lg ${pass ? 'text-emerald-400' : 'text-amber-400'}`}>{pass ? '✓' : '⟳'}</span>
                <div>
                  <div className={`text-sm font-semibold ${pass ? 'text-emerald-400' : 'text-amber-300'}`}>{value}</div>
                  <div className="text-xs text-gray-500">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 flex-wrap">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                tab === t.id ? 'border-blue-600 bg-blue-950/50 text-blue-300' : 'border-gray-700 text-gray-500 hover:border-gray-600'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Uptime metrics */}
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Uptime ({data.period})</div>
              <div className="grid grid-cols-5 gap-3 mb-4">
                <MetricCard label="Uptime" value={`${uptime.pct.toFixed(3)}%`} target="Target ≥99.5%" pass={uptimePass} />
                <MetricCard label="Total checks" value={uptime.total} />
                <MetricCard label="Down events" value={uptime.down} target={uptime.down === 0 ? 'None ✓' : undefined} pass={uptime.down === 0} />
                <MetricCard label="Avg latency" value={`${uptime.avgLatencyMs}ms`} target="Target <2000ms" pass={uptime.avgLatencyMs < 2000} />
                <MetricCard label="Open incidents" value={sla.openIncidents} pass={sla.openIncidents === 0} />
              </div>

              {/* Uptime timeline */}
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <div className="text-xs text-gray-500 mb-3">Uptime timeline — last 24h (each block = 15 min)</div>
                <div className="flex flex-wrap gap-0.5">
                  {uptime.timeline.slice(0, 96).reverse().map((t, i) => (
                    <div key={i} title={`${new Date(t.t).toLocaleTimeString()} — ${t.status} (${t.ms}ms)`}
                      className={`w-3 h-5 rounded-sm ${STATUS_DOT[t.status] || 'bg-gray-700'}`} />
                  ))}
                </div>
                <div className="flex gap-4 mt-2 text-xs text-gray-600">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block" /> Up</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400 inline-block" /> Degraded</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block" /> Down</span>
                </div>
              </div>
            </div>

            {/* SLA summary */}
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">SLA Performance</div>
              <div className="grid grid-cols-4 gap-3">
                <MetricCard label="SLA events tracked" value={sla.totalEvents} />
                <MetricCard label="SLA breaches" value={sla.breached} target="Target ≤1/month" pass={slaBreachPass} />
                <MetricCard label="Breach rate" value={`${sla.breachRate}%`} pass={sla.breachRate <= 5} />
                <MetricCard label="Avg TTR" value={sla.avgTTRHours > 0 ? `${sla.avgTTRHours}h` : 'N/A'} target="Target ≤8h" pass={ttrPass} />
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Reviewer Pool</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Pool size</span><span className={reviewers.total >= 100 ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>{reviewers.total} / 100 target</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Acceptance rate</span><span className={acceptancePass ? 'text-emerald-400' : 'text-amber-400'}>{reviewers.avgAcceptancePct}%</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Dispute rate</span><span className={disputePass ? 'text-emerald-400' : 'text-amber-400'}>{reviewers.avgDisputePct}%</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Avg kappa</span><span className="text-white">{reviewers.avgKappa}</span></div>
                  <div className="flex justify-between pt-1 border-t border-gray-800">
                    <span className="text-yellow-500">🏆 Gold: {reviewers.byTier.gold}</span>
                    <span className="text-gray-400">Silver: {reviewers.byTier.silver}</span>
                    <span className="text-amber-700">Bronze: {reviewers.byTier.bronze}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Enterprise Revenue</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Active contracts</span><span className={contractPass ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>{contracts.active} / 2 target</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Total ARR</span><span className="text-white font-semibold">${contracts.totalARR.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Total MRR</span><span className="text-white">${contracts.totalMRR.toLocaleString()}</span></div>
                  <div className="pt-1 border-t border-gray-800">
                    {contracts.list.filter(c => c.status === 'active' || c.status === 'signed').map(c => (
                      <div key={c.org_name} className="flex justify-between text-xs mt-1">
                        <span className="text-gray-400 truncate max-w-[160px]">{c.org_name}</span>
                        <span className="text-emerald-400">${c.arr.toLocaleString()}/yr</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INCIDENTS TAB */}
        {tab === 'incidents' && (
          <div className="space-y-4">
            {sla.openIncidents > 0 && (
              <div className="rounded-xl border border-red-800/40 bg-red-950/20 p-4 text-sm text-red-300">
                ⚠ {sla.openIncidents} open incident{sla.openIncidents > 1 ? 's' : ''} — see runbooks for response procedures
              </div>
            )}
            <div className="rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900">
                    {['Severity','Title','Type','Status','Started','TTR','Runbook'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sla.incidents.map(inc => (
                    <tr key={inc.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                      <td className="px-3 py-2.5">
                        <span className={`px-1.5 py-0.5 text-xs rounded border font-mono ${SEV_COLORS[inc.severity] || ''}`}>
                          {inc.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-200 max-w-[200px]">{inc.title}</td>
                      <td className="px-3 py-2.5 text-gray-500">{inc.incident_type}</td>
                      <td className="px-3 py-2.5">
                        <span className={inc.status === 'resolved' ? 'text-emerald-400' : 'text-amber-400'}>
                          {inc.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500">{new Date(inc.started_at).toLocaleDateString()}</td>
                      <td className="px-3 py-2.5">
                        {inc.ttr_seconds
                          ? <span className={inc.ttr_seconds / 3600 <= 8 ? 'text-emerald-400' : 'text-red-400'}>
                              {(inc.ttr_seconds / 3600).toFixed(1)}h
                            </span>
                          : <span className="text-gray-600">—</span>
                        }
                      </td>
                      <td className="px-3 py-2.5">
                        {inc.runbook_url
                          ? <Link href={inc.runbook_url} className="text-blue-400 hover:underline">view →</Link>
                          : <span className="text-gray-700">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                  {sla.incidents.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-600">No incidents in this period</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-gray-600">
              Severity: P0=service down, P1=major degradation, P2=SLA near-breach, P3=minor.
              TTR target ≤8h. <Link href="/runbooks" className="text-blue-500">View runbooks →</Link>
            </div>
          </div>
        )}

        {/* REVIEWERS TAB */}
        {tab === 'reviewers' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3 mb-2">
              <MetricCard label="Pool size" value={`${reviewers.total}`} target="Target ≥100" pass={reviewers.total >= 100} />
              <MetricCard label="Acceptance rate" value={`${reviewers.avgAcceptancePct}%`} target="Target ≥85%" pass={acceptancePass} />
              <MetricCard label="Dispute rate" value={`${reviewers.avgDisputePct}%`} target="Target ≤5%" pass={disputePass} />
              <MetricCard label="Avg κ (kappa)" value={reviewers.avgKappa} note="Inter-rater agreement" />
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Tier Distribution</div>
              <div className="flex gap-8 items-end h-20">
                {[
                  { tier: '🏆 Gold', count: reviewers.byTier.gold, color: 'bg-yellow-500' },
                  { tier: '🥈 Silver', count: reviewers.byTier.silver, color: 'bg-gray-400' },
                  { tier: '🥉 Bronze', count: reviewers.byTier.bronze, color: 'bg-amber-700' },
                ].map(({ tier, count, color }) => {
                  const pct = reviewers.total > 0 ? (count / reviewers.total) * 100 : 0
                  return (
                    <div key={tier} className="flex flex-col items-center gap-1">
                      <div className="text-sm font-semibold text-white">{count}</div>
                      <div className={`w-16 ${color} rounded-t`} style={{ height: `${Math.max(pct * 0.5, 4)}px` }} />
                      <div className="text-xs text-gray-500">{tier}</div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-800 text-xs text-gray-500">
                Gold: ≥85% acceptance, ≥50 tasks, κ≥0.80 · Silver: ≥80% acceptance, ≥20 tasks · Bronze: onboarded
              </div>
            </div>
            <div className="text-xs text-gray-600">
              Reviewer pool data from cc_reviewer_quality. Target: 100 active reviewers by end of Phase 6.
              Current: {reviewers.total}. Gap: {Math.max(100 - reviewers.total, 0)} needed.
            </div>
          </div>
        )}

        {/* CONTRACTS TAB */}
        {tab === 'contracts' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <MetricCard label="Active contracts" value={contracts.active} target="Target ≥2" pass={contractPass} />
              <MetricCard label="Total ARR" value={`$${contracts.totalARR.toLocaleString()}`} />
              <MetricCard label="Total MRR" value={`$${contracts.totalMRR.toLocaleString()}`} />
              <MetricCard label="Security reviews passed" value={contracts.list.filter(c => c.security_review_passed).length} target="Target ≥2" pass={contracts.list.filter(c => c.security_review_passed).length >= 2} />
            </div>
            <div className="rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900">
                    {['Org','ARR','MRR','Status','Uptime SLA','Review SLA','Sec Review','HECVAT'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contracts.list.map(c => (
                    <tr key={c.org_name} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                      <td className="px-3 py-2.5 text-white font-medium max-w-[180px] truncate">{c.org_name}</td>
                      <td className="px-3 py-2.5 text-emerald-400 font-semibold">${c.arr.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-gray-400">${c.mrr.toLocaleString()}/mo</td>
                      <td className="px-3 py-2.5">
                        <span className={c.status === 'active' ? 'text-emerald-400' : c.status === 'signed' ? 'text-blue-400' : 'text-gray-500'}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-400">{c.sla_uptime_pct}%</td>
                      <td className="px-3 py-2.5 text-gray-400">{c.sla_review_hours}h</td>
                      <td className="px-3 py-2.5">{c.security_review_passed ? <span className="text-emerald-400">✓</span> : <span className="text-gray-600">—</span>}</td>
                      <td className="px-3 py-2.5">{c.hecvat_submitted ? <span className="text-blue-400">submitted</span> : <span className="text-gray-600">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AUDIT LOG TAB */}
        {tab === 'audit' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-3 text-xs text-gray-500">
              Append-only audit log (cc_audit_log_v2). Update/Delete blocked by DB trigger. All events immutable.
            </div>
            <div className="rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900">
                    {['#','Event','Entity','Actor','Time','Data'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map(e => (
                    <tr key={e.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 font-mono">
                      <td className="px-3 py-2 text-gray-700">{e.id}</td>
                      <td className="px-3 py-2 text-blue-400">{e.event_type}</td>
                      <td className="px-3 py-2 text-gray-400">{e.entity}</td>
                      <td className="px-3 py-2 text-gray-500">{e.actor_type}</td>
                      <td className="px-3 py-2 text-gray-600">{new Date(e.created_at).toLocaleString()}</td>
                      <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate">{JSON.stringify(e.event_data)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-gray-600">
              Full audit export: GET /api/audit?limit=200&since=YYYY-MM-DD · JSON format, suitable for SIEM ingestion
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
