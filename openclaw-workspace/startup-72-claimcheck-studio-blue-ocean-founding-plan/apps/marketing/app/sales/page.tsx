'use client'
import { useState, useEffect } from 'react'

interface FunnelData {
  period: string
  summary: {
    totalEvents: number; uniqueVisitors: number; waitlistSignups: number
    webinarRegistrants: number; pilotApplications: number; complianceConcernPct: number
  }
  funnel: Array<{ step: string; count: number; conversionFromPrev: number }>
  byEvent: Record<string, number>
  bySource: Array<[string, number]>
  waitlist: { total: number; complianceConcern: number; bySegment: Record<string, number> }
}

interface DiscoveryData {
  total: number; converted: number; byStage: Record<string, number>
  calls: Array<{
    id: string; prospect_name: string; org: string; segment: string
    stage: string; call_date: string; mou_signed: boolean; willingness_to_pay: string
  }>
}

interface MoUData {
  total: number; active: number; mrr: number; arr: number
  byStatus: Record<string, number>
  mous: Array<{
    id: string; org_name: string; pilot_tier: string; monthly_value: number
    status: string; start_date: string; contact_name: string
  }>
}

const STAGE_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
  completed: 'bg-gray-800 text-gray-400 border-gray-700',
  converted: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40',
  no_show: 'bg-red-900/40 text-red-400 border-red-700/40',
  lost: 'bg-red-900/40 text-red-400 border-red-700/40',
}

const MOU_STATUS_COLORS: Record<string, string> = {
  draft: 'text-gray-500',
  sent: 'text-blue-400',
  signed: 'text-amber-400',
  active: 'text-emerald-400',
  completed: 'text-gray-400',
  cancelled: 'text-red-400',
}

const STEP_LABELS: Record<string, string> = {
  page_view: 'Page views',
  waitlist_submit: 'Waitlist signups',
  webinar_register: 'Webinar registrants',
  pilot_apply: 'Pilot applications',
  checkout_start: 'Checkout starts',
  checkout_complete: 'Paid customers',
}

// Seed data for discovery calls pipeline
const SEED_CALLS = [
  { prospectName: 'Dr. Rachel Kim', prospectEmail: 'rachel.kim@medaffairs-demo.com', org: 'Novagen Medical Affairs', title: 'VP Medical Affairs', segment: 'pharma', stage: 'completed', callDate: '2026-03-18T14:00:00Z', durationMin: 35, notes: 'Strong interest in compliance SLA. Team of 8 writers. Current tool: manual PubMed + Word. Pain: 4-week review cycle.', nextSteps: 'Send pilot MoU. Agency pilot tier $3k/3mo.', willingnessToPay: '$200-300/mo per user', mouSigned: false },
  { prospectName: 'Tom Walsh', prospectEmail: 'tom.walsh@healthbrand-demo.com', org: 'HealthBrand Agency', title: 'Head of Content', segment: 'agency', stage: 'converted', callDate: '2026-03-21T10:00:00Z', durationMin: 28, notes: 'Agency serving 6 health system clients. Previously tried Jasper — stopped due to citation issues. Very motivated.', nextSteps: 'MoU signed. Onboarding March 28.', willingnessToPay: '$150/mo', mouSigned: true },
  { prospectName: 'Prof. Linda Osei', prospectEmail: 'l.osei@university-demo.edu', org: 'State University Medical Center', title: 'Director of Research Communications', segment: 'researcher', stage: 'completed', callDate: '2026-03-25T16:00:00Z', durationMin: 42, notes: 'Research communications team. 3 writers. Interested in Starter tier. Compliance concern: press releases for clinical trial results.', nextSteps: 'Trial activation. Follow up in 2 weeks.', willingnessToPay: '$49-79/mo', mouSigned: false },
  { prospectName: 'Kenji Mori', prospectEmail: 'kenji@biomediax-demo.com', org: 'BioMediax', title: 'Scientific Communications Lead', segment: 'pharma', stage: 'scheduled', callDate: '2026-04-10T13:00:00Z', durationMin: null, notes: 'Inbound via LinkedIn post. Biotech company. FDA advisory committee submissions. High value prospect.', nextSteps: 'Call scheduled April 10.', willingnessToPay: null, mouSigned: false },
  { prospectName: 'Sarah Jóhanns', prospectEmail: 'sarah@medwritepro-demo.com', org: 'MedWritePro', title: 'Founder', segment: 'agency', stage: 'completed', callDate: '2026-03-28T11:00:00Z', durationMin: 31, notes: 'Solo agency, 2 contractors. AMWA member. Heard about us from webinar announcement. Price-sensitive but high quality bar.', nextSteps: 'Starter trial. Upgrade path discussed.', willingnessToPay: '$49-99/mo', mouSigned: false },
  { prospectName: 'Dr. Marcus Chen', prospectEmail: 'm.chen@globalhealth-demo.org', org: 'Global Health Comm', title: 'Chief Content Officer', segment: 'health_media', stage: 'converted', callDate: '2026-03-30T15:00:00Z', durationMin: 38, notes: 'Health media nonprofit. Produces 20+ pieces/mo on clinical topics. Previously no AI tools at all. Excited about evidence graph.', nextSteps: 'Pro pilot MoU signed. Starting April 5.', willingnessToPay: '$149/mo', mouSigned: true },
]

const SEED_MOUS = [
  { orgName: 'HealthBrand Agency', contactName: 'Tom Walsh', contactEmail: 'tom.walsh@healthbrand-demo.com', segment: 'agency', pilotTier: 'team', monthlyValue: 1500, durationMonths: 3, startDate: '2026-03-28', status: 'active', notes: 'Team pilot. 3 users. Weekly check-in.' },
  { orgName: 'Global Health Comm', contactName: 'Dr. Marcus Chen', contactEmail: 'm.chen@globalhealth-demo.org', segment: 'health_media', pilotTier: 'agency', monthlyValue: 1500, durationMonths: 3, startDate: '2026-04-05', status: 'signed', notes: 'Agency pilot. Pro tier features. Bi-weekly review.' },
  { orgName: 'Novagen Medical Affairs', contactName: 'Dr. Rachel Kim', contactEmail: 'rachel.kim@medaffairs-demo.com', segment: 'pharma', pilotTier: 'enterprise', monthlyValue: 3000, durationMonths: 3, startDate: null, status: 'draft', notes: 'Enterprise pilot pending legal sign-off. Custom compliance packs needed.' },
]

export default function SalesDashboard() {
  const [funnel, setFunnel] = useState<FunnelData | null>(null)
  const [discovery, setDiscovery] = useState<DiscoveryData | null>(null)
  const [mou, setMou] = useState<MoUData | null>(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [tab, setTab] = useState<'funnel' | 'discovery' | 'mou'>('funnel')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [f, d, m] = await Promise.all([
      fetch('/api/funnel?days=30').then(r => r.json()),
      fetch('/api/discovery').then(r => r.json()).catch(() => ({ total: 0, calls: [], byStage: {}, converted: 0 })),
      fetch('/api/mou').then(r => r.json()).catch(() => ({ total: 0, active: 0, mrr: 0, arr: 0, byStatus: {}, mous: [] })),
    ])
    setFunnel(f)
    setDiscovery(d)
    setMou(m)
    setLoading(false)
  }

  async function seedDiscovery() {
    setSeeding(true)
    for (const c of SEED_CALLS) {
      await fetch('/api/discovery', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c),
      }).catch(() => {})
    }
    for (const m of SEED_MOUS) {
      await fetch('/api/mou', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(m),
      }).catch(() => {})
    }
    await fetchAll()
    setSeeding(false)
  }

  if (loading) return <div className="pt-24 text-center text-gray-500 text-sm">Loading sales dashboard…</div>

  const TABS = [
    { id: 'funnel' as const, label: 'Funnel Analytics' },
    { id: 'discovery' as const, label: `Discovery Calls (${discovery?.total || 0})` },
    { id: 'mou' as const, label: `Pilot MoUs (${mou?.total || 0})` },
  ]

  return (
    <div className="pt-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-white">Sales Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">Funnel · Discovery calls · Pilot MoUs · Procurement</p>
          </div>
          <div className="flex gap-2 items-center">
            {!discovery?.total && (
              <button onClick={seedDiscovery} disabled={seeding}
                className="text-xs px-3 py-1.5 border border-gray-700 text-gray-400 rounded-lg hover:border-gray-500">
                {seeding ? 'Seeding…' : 'Seed sample pipeline'}
              </button>
            )}
            <a href="/security" className="text-xs px-3 py-1.5 border border-amber-700/40 text-amber-400 rounded-lg hover:bg-amber-950/20">
              Security / Procurement →
            </a>
            <button onClick={fetchAll} className="text-xs px-3 py-1.5 bg-blue-950/50 border border-blue-700/40 text-blue-400 rounded-lg">
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* KPI strip */}
        {funnel?.summary && (
          <div className="grid grid-cols-6 gap-3 mb-8">
            {[
              { label: 'Unique visitors', value: funnel.summary.uniqueVisitors, target: '≥1,000' },
              { label: 'Waitlist signups', value: funnel.summary.waitlistSignups, target: '≥100' },
              { label: 'Webinar regs', value: funnel.summary.webinarRegistrants, target: '≥50' },
              { label: 'Pilot apps', value: funnel.summary.pilotApplications, target: '≥5' },
              { label: 'Compliance concern', value: `${funnel.summary.complianceConcernPct}%`, target: '≥30%' },
              { label: 'Pilot MRR', value: mou?.mrr ? `$${mou.mrr}` : '$0', target: '≥$4.5k' },
            ].map(({ label, value, target }) => (
              <div key={label} className="rounded-xl border border-gray-800 bg-gray-900 p-3">
                <div className="text-xl font-bold text-white">{value}</div>
                <div className="text-xs text-gray-400 mt-0.5">{label}</div>
                <div className="text-xs text-gray-600">Target: {target}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                tab === t.id ? 'border-blue-600 bg-blue-950/50 text-blue-300' : 'border-gray-700 text-gray-500 hover:border-gray-600'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* FUNNEL TAB */}
        {tab === 'funnel' && funnel && (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">Conversion Funnel ({funnel.period})</h3>
              <div className="space-y-3">
                {funnel.funnel.map(({ step, count, conversionFromPrev }, i) => {
                  const maxCount = Math.max(...funnel.funnel.map(s => s.count), 1)
                  return (
                    <div key={step} className="flex items-center gap-4">
                      <div className="w-32 text-xs text-gray-500 shrink-0">{STEP_LABELS[step] || step}</div>
                      <div className="flex-1 h-6 bg-gray-800 rounded overflow-hidden">
                        <div className="h-full bg-blue-600/60 rounded transition-all"
                          style={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%` }} />
                      </div>
                      <div className="w-16 text-right text-sm font-semibold text-white">{count}</div>
                      {i > 0 && (
                        <div className={`w-16 text-xs text-right ${conversionFromPrev > 0.1 ? 'text-emerald-400' : 'text-gray-600'}`}>
                          {(conversionFromPrev * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Waitlist by Segment</h3>
                <div className="space-y-2">
                  {Object.entries(funnel.waitlist.bySegment).sort((a, b) => b[1] - a[1]).map(([seg, count]) => (
                    <div key={seg} className="flex justify-between text-xs">
                      <span className="text-gray-400 capitalize">{seg.replace('_', ' ')}</span>
                      <span className="text-white font-medium">{count}</span>
                    </div>
                  ))}
                  {Object.keys(funnel.waitlist.bySegment).length === 0 && (
                    <div className="text-xs text-gray-600">No signups yet</div>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-800 text-xs">
                  <span className="text-gray-500">Compliance concern: </span>
                  <span className={funnel.summary.complianceConcernPct >= 30 ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                    {funnel.summary.complianceConcernPct}% 
                    {funnel.summary.complianceConcernPct >= 30 ? ' ✓ Target met' : ' (target ≥30%)'}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Traffic Sources</h3>
                <div className="space-y-2">
                  {funnel.bySource.length > 0 ? funnel.bySource.map(([source, count]) => (
                    <div key={source} className="flex justify-between text-xs">
                      <span className="text-gray-400">{source || 'direct'}</span>
                      <span className="text-white font-medium">{count}</span>
                    </div>
                  )) : (
                    <div className="text-xs text-gray-600">No tracked sources yet. Add UTM params to links.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DISCOVERY TAB */}
        {tab === 'discovery' && discovery && (
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-3 mb-2">
              {['scheduled','completed','converted','no_show','lost'].map(stage => (
                <div key={stage} className="rounded-lg border border-gray-800 bg-gray-900 p-3 text-center">
                  <div className="text-xl font-bold text-white">{discovery.byStage[stage] || 0}</div>
                  <div className="text-xs text-gray-500 capitalize">{stage.replace('_',' ')}</div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['Prospect','Org','Segment','Stage','Call Date','WTP','MoU','Notes'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {discovery.calls.map(c => (
                    <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                      <td className="px-3 py-2 text-white font-medium">{c.prospect_name}</td>
                      <td className="px-3 py-2 text-gray-400">{c.org?.slice(0,20)}</td>
                      <td className="px-3 py-2 text-gray-500 capitalize">{c.segment?.replace('_',' ')}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded border text-xs ${STAGE_COLORS[c.stage] || 'text-gray-500'}`}>
                          {c.stage}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500">
                        {c.call_date ? new Date(c.call_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-2 text-gray-400">{c.willingness_to_pay || '—'}</td>
                      <td className="px-3 py-2">{c.mou_signed ? <span className="text-emerald-400">✓</span> : <span className="text-gray-600">—</span>}</td>
                      <td className="px-3 py-2 text-gray-600 max-w-[150px] truncate">{c.notes?.slice(0,50)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-xs text-gray-600">
              Target: 15 discovery calls. Conversion to pilot: ≥20%.
              POST to /api/discovery to add calls.
            </div>
          </div>
        )}

        {/* MOU TAB */}
        {tab === 'mou' && mou && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3 mb-2">
              {[
                { label: 'Total MoUs', value: mou.total, note: 'target ≥3' },
                { label: 'Active/Signed', value: mou.active, note: '' },
                { label: 'Pilot MRR', value: `$${mou.mrr.toLocaleString()}`, note: 'target $4.5k' },
                { label: 'Pilot ARR', value: `$${mou.arr.toLocaleString()}`, note: '' },
              ].map(({ label, value, note }) => (
                <div key={label} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                  <div className="text-2xl font-bold text-white">{value}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{label}</div>
                  {note && <div className="text-xs text-gray-600 mt-0.5">{note}</div>}
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['Org','Contact','Tier','Monthly Value','Duration','Status','Start Date','Notes'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mou.mous.map(m => (
                    <tr key={m.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                      <td className="px-3 py-2 text-white font-medium">{m.org_name}</td>
                      <td className="px-3 py-2 text-gray-400">{m.contact_name}</td>
                      <td className="px-3 py-2 text-gray-500 capitalize">{m.pilot_tier}</td>
                      <td className="px-3 py-2 text-emerald-400 font-semibold">${m.monthly_value.toLocaleString()}/mo</td>
                      <td className="px-3 py-2 text-gray-500">3 mo</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs font-medium ${MOU_STATUS_COLORS[m.status] || 'text-gray-500'}`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500">
                        {m.start_date ? new Date(m.start_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-2 text-gray-600 max-w-[140px] truncate">
                        {(m as unknown as Record<string,string>).notes?.slice(0,40)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-xs text-gray-600">
              Target: 3 signed MoUs across ≥2 segments at ≥$1.5k/mo each.
              Current: {mou.mous.filter(m => m.status === 'active' || m.status === 'signed').length} active/signed.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
