'use client'
import { useState, useEffect } from 'react'

interface BetaStats {
  users: {
    total: number; active: number; invited: number; waitlist: number
    activeWeekly: number; byTier: { team: number; partner: number; reviewer: number }
  }
  reviewers: {
    total: number; approved: number; screening: number; applied: number; active: number
    specialties: string[]
  }
  partners: {
    total: number; active: number
    byTier: { anchor: number; premium: number; standard: number }
    list: Array<{ org_name: string; status: string; partnership_tier: string; weekly_usage_target: number }>
  }
  sla: { total: number; breached: number; completed: number; breachRate: string }
  disputes: { total: number; open: number; resolved: number }
  recentActivity: Array<{ name: string; org_name: string; status: string; activated_at: string }>
}

interface BetaUser {
  id: string; email: string; name: string; org_name: string; org_type: string
  role: string; status: string; tier: string; invite_code: string
  weekly_sessions: number; total_sessions: number; created_at: string
}

interface ReviewerApp {
  id: string; name: string; email: string; specialty: string; status: string
  years_experience: number; publication_count: number; highest_degree: string
  institution: string; orcid_id: string; created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40',
  invited: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
  waitlist: 'bg-gray-800 text-gray-400 border-gray-700',
  rejected: 'bg-red-900/40 text-red-400 border-red-700/40',
  approved: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40',
  screening: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
  applied: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
}

const TIER_COLORS: Record<string, string> = {
  anchor: 'text-amber-300', premium: 'text-purple-300', standard: 'text-gray-400',
  team: 'text-blue-300', partner: 'text-amber-300', reviewer: 'text-emerald-300',
}

export default function BetaAdminPage() {
  const [stats, setStats] = useState<BetaStats | null>(null)
  const [users, setUsers] = useState<BetaUser[]>([])
  const [reviewers, setReviewers] = useState<ReviewerApp[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'reviewers' | 'partners' | 'playbooks'>('overview')
  const [inviting, setInviting] = useState<string | null>(null)
  const [inviteResult, setInviteResult] = useState<Record<string, string>>({})

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [statsRes, usersRes, reviewersRes] = await Promise.all([
      fetch('/api/beta?view=summary').then(r => r.json()),
      fetch('/api/beta?view=users').then(r => r.json()),
      fetch('/api/beta?view=reviewers').then(r => r.json()),
    ])
    setStats(statsRes)
    setUsers(usersRes.users || [])
    setReviewers(reviewersRes.reviewers || [])
    setLoading(false)
  }

  async function sendInvite(userId: string) {
    setInviting(userId)
    const res = await fetch('/api/beta/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const data = await res.json()
    if (data.inviteUrl) {
      setInviteResult(prev => ({ ...prev, [userId]: data.inviteUrl }))
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'invited' } : u))
    }
    setInviting(null)
  }

  if (loading) return <div className="text-gray-500 text-sm p-8">Loading beta ops dashboard…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Beta Ops</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Closed beta · 50 users · 15 reviewers · 3 design partners · Phase 4
          </p>
        </div>
        <a href="/join" target="_blank"
          className="px-3 py-1.5 border border-blue-700/40 text-blue-400 text-xs rounded-lg hover:bg-blue-950/30 transition-colors">
          → Public Join Page
        </a>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {(['overview', 'users', 'reviewers', 'partners', 'playbooks'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
              activeTab === t ? 'border-blue-600 bg-blue-950/50 text-blue-300' : 'border-gray-700 text-gray-500 hover:border-gray-600'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-5">
          {/* KPI grid */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Beta Users', value: stats.users.total, sub: `${stats.users.active} active · ${stats.users.invited} invited`, target: '≥50', ok: stats.users.total >= 50 },
              { label: 'Weekly Active', value: stats.users.activeWeekly, sub: `${stats.users.active} total active accounts`, target: '≥10', ok: stats.users.activeWeekly >= 10 },
              { label: 'Vetted Reviewers', value: stats.reviewers.approved, sub: `${stats.reviewers.screening} screening · ${stats.reviewers.applied} applied`, target: '15–25', ok: stats.reviewers.approved >= 15 },
              { label: 'Design Partners', value: stats.partners.active, sub: stats.partners.list.map(p => p.org_name).join(', ').slice(0, 40), target: '3–5', ok: stats.partners.active >= 3 },
            ].map(({ label, value, sub, target, ok }) => (
              <div key={label} className={`rounded-xl border p-4 ${ok ? 'border-emerald-700/30 bg-emerald-950/10' : 'border-gray-700 bg-gray-900'}`}>
                <div className="flex items-start justify-between">
                  <div className="text-2xl font-bold text-white">{value}</div>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${ok ? 'bg-emerald-900/40 text-emerald-400' : 'bg-gray-800 text-gray-500'}`}>
                    {ok ? '✓' : '○'} {target}
                  </span>
                </div>
                <div className="text-xs font-medium text-gray-300 mt-1">{label}</div>
                <div className="text-xs text-gray-600 mt-0.5">{sub}</div>
              </div>
            ))}
          </div>

          {/* User breakdown */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">User Status</h3>
              <div className="space-y-2">
                {[
                  { label: 'Active', count: stats.users.active, bar: stats.users.active / stats.users.total, color: 'bg-emerald-500' },
                  { label: 'Invited', count: stats.users.invited, bar: stats.users.invited / stats.users.total, color: 'bg-blue-500' },
                  { label: 'Waitlist', count: stats.users.waitlist, bar: stats.users.waitlist / stats.users.total, color: 'bg-gray-600' },
                ].map(({ label, count, bar, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-16 text-xs text-gray-500">{label}</div>
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full`} style={{ width: `${bar * 100}%` }} />
                    </div>
                    <div className="w-8 text-xs text-gray-400 text-right">{count}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Reviewer Pipeline</h3>
              <div className="space-y-2">
                {[
                  { label: 'Approved', count: stats.reviewers.approved, color: 'bg-emerald-500' },
                  { label: 'Screening', count: stats.reviewers.screening, color: 'bg-amber-500' },
                  { label: 'Applied', count: stats.reviewers.applied, color: 'bg-blue-500' },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-16 text-xs text-gray-500">{label}</div>
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full`} style={{ width: `${(count / 15) * 100}%` }} />
                    </div>
                    <div className="w-8 text-xs text-gray-400 text-right">{count}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {stats.reviewers.specialties.slice(0, 8).map(s => (
                  <span key={s} className="text-xs px-1.5 py-0.5 bg-gray-800 rounded text-gray-500">{s}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Design partners */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Design Partners</h3>
            <div className="space-y-2">
              {stats.partners.list.map(p => (
                <div key={p.org_name} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div>
                    <div className="text-sm text-white">{p.org_name}</div>
                    <div className={`text-xs ${TIER_COLORS[p.partnership_tier] || 'text-gray-500'}`}>{p.partnership_tier} partner</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLORS[p.status] || ''}`}>{p.status}</div>
                    <div className="text-xs text-gray-600 mt-0.5">≥{p.weekly_usage_target}x/week</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          {stats.recentActivity.length > 0 && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Recently Activated</h3>
              <div className="space-y-1.5">
                {stats.recentActivity.slice(0, 6).map(u => (
                  <div key={u.name} className="flex items-center justify-between text-xs">
                    <span className="text-gray-300">{u.name}</span>
                    <span className="text-gray-600">{u.org_name}</span>
                    <span className="text-gray-600">{u.activated_at ? new Date(u.activated_at).toLocaleDateString() : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Users tab ── */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">{users.length} users total</div>
            <div className="flex gap-2 text-xs">
              {['active','invited','waitlist'].map(s => (
                <span key={s} className={`px-2 py-0.5 rounded border ${STATUS_COLORS[s]}`}>
                  {users.filter(u => u.status === s).length} {s}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Name','Org','Role','Status','Tier','Sessions','Invite'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-3 py-2 text-white">{u.name}</td>
                    <td className="px-3 py-2 text-gray-400">{u.org_name?.slice(0, 25)}</td>
                    <td className="px-3 py-2 text-gray-500">{u.role?.slice(0, 20)}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded border text-xs ${STATUS_COLORS[u.status] || 'text-gray-500'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs ${TIER_COLORS[u.tier] || 'text-gray-500'}`}>{u.tier}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-400">{u.weekly_sessions || 0}/wk</td>
                    <td className="px-3 py-2">
                      {u.status === 'waitlist' ? (
                        <button onClick={() => sendInvite(u.id)} disabled={inviting === u.id}
                          className="px-2 py-0.5 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs transition-colors">
                          {inviting === u.id ? '…' : 'Invite'}
                        </button>
                      ) : inviteResult[u.id] ? (
                        <span className="text-emerald-500 text-xs">✓ Invited</span>
                      ) : (
                        <span className="text-gray-600 text-xs font-mono">{u.invite_code?.slice(0, 8)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Reviewers tab ── */}
      {activeTab === 'reviewers' && (
        <div className="space-y-3">
          <div className="text-xs text-gray-500">{reviewers.length} reviewer applications</div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Name','Specialty','Status','Degree','Exp','Pubs','ORCID'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reviewers.map(r => (
                  <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-3 py-2 text-white">{r.name}</td>
                    <td className="px-3 py-2 text-gray-400">{r.specialty}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded border text-xs ${STATUS_COLORS[r.status] || 'text-gray-500'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{r.highest_degree}</td>
                    <td className="px-3 py-2 text-gray-500">{r.years_experience}y</td>
                    <td className="px-3 py-2 text-gray-500">{r.publication_count}</td>
                    <td className="px-3 py-2 text-gray-600 font-mono">{r.orcid_id ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Partners tab ── */}
      {activeTab === 'partners' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {['MedComm Solutions','BioInform Analytics','HealthWrite Agency'].map((org, i) => {
              const tiers = ['anchor','premium','standard']
              const contacts = ['Dr. Sarah Chen', 'Prof. James OBrien', 'Maya Patel']
              const colors = ['border-amber-700/30 bg-amber-950/10', 'border-purple-700/30 bg-purple-950/10', 'border-gray-700 bg-gray-900']
              return (
                <div key={org} className={`rounded-xl border p-4 ${colors[i]}`}>
                  <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${TIER_COLORS[tiers[i]]}`}>{tiers[i]}</div>
                  <div className="text-sm font-semibold text-white">{org}</div>
                  <div className="text-xs text-gray-400 mt-1">{contacts[i]}</div>
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-gray-600">Status</span><span className="text-emerald-400">Active ✓</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">NDA</span><span className="text-gray-400">{i < 2 ? 'Signed' : 'Pending'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">SLA</span><span className="text-gray-400">72h</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Target</span><span className="text-gray-400">≥3 sessions/wk</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Check-in</span><span className="text-gray-400">{['Weekly','Bi-weekly','Monthly'][i]}</span></div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Partner Health Scoring</h3>
            <p className="text-xs text-gray-500">
              Score ≥15: Healthy 🟢 · Score 8–14: At-risk 🟡 (proactive outreach) · Score &lt;8: Churning 🔴 (founder call within 24h)
            </p>
          </div>
        </div>
      )}

      {/* ── Playbooks tab ── */}
      {activeTab === 'playbooks' && (
        <div className="space-y-3">
          {[
            { title: 'Beta Intake Playbook', desc: 'Application → invite → activation flow, screening criteria, email templates', link: '#intake' },
            { title: 'Reviewer Onboarding', desc: 'Qualification criteria, calibration protocol, kappa thresholds, reward tiers', link: '#reviewer' },
            { title: 'Design Partner Playbook', desc: 'Partner tiers, kickoff agenda, health scoring, feedback cadence, case study pipeline', link: '#partner' },
            { title: 'Review SLA Playbook', desc: 'SLA commitments (12h pickup / 48h completion), monitoring, escalation matrix', link: '#sla' },
            { title: 'Dispute Resolution', desc: 'Dispute types, auto-resolution, arbitration flow, payout appeals', link: '#dispute' },
            { title: 'Weekly Ops Checklist', desc: 'Monday/Wednesday/Friday and monthly checklists', link: '#checklist' },
          ].map(({ title, desc }) => (
            <div key={title} className="rounded-xl border border-gray-800 bg-gray-900 p-4 flex items-start justify-between">
              <div>
                <div className="text-sm font-medium text-white">{title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
              </div>
              <a href="/admin" className="text-xs text-gray-600 hover:text-gray-400 ml-4 shrink-0">📄 BETA_PLAYBOOKS.md</a>
            </div>
          ))}
          <div className="text-xs text-gray-600 mt-2">
            Full playbooks: <code className="text-gray-500">BETA_PLAYBOOKS.md</code> in project root
          </div>
        </div>
      )}
    </div>
  )
}
