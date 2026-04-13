'use client'
import { useState, useEffect, useCallback } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────
interface Project {
  id: string; address: string; status: string; packet_status: string | null
  autofill_score: number | null; created_at: string; homeowner_email: string
  proposed_adu_type: string | null; zoning: string | null
}
interface Pro {
  id: string; name: string; email: string; specialty: string
  status: string; license_number: string | null; zip: string | null; created_at: string
  license_status: string | null; license_doc_url: string | null
  license_doc_path: string | null; license_verified_at: string | null
  license_rejection_reason: string | null; license_expiry: string | null
}
interface Quote {
  id: string; project_id: string; pro_name: string; pro_email: string
  quote_amount: number; status: string; created_at: string
}
interface Lead {
  id: string; email: string; project_type: string | null; created_at: string
}
interface AuditEntry {
  id: string; created_at: string; actor_email: string | null; actor_role: string | null
  action: string; entity_type: string; entity_id: string | null; meta: Record<string, unknown> | null
}
interface Stats {
  projects: number; projects_with_packet: number
  pros_pending: number; pros_active: number; quotes: number; leads: number
}

interface Deposit {
  id: string; created_at: string; homeowner_email: string; amount_cents: number
  status: string; stripe_session_id: string | null; stripe_payment_intent: string | null
  receipt_sent_at: string | null; refunded_at: string | null; project_id: string | null
  metro: string | null
}

interface ConsentLog {
  id: string; created_at: string; email: string; project_id: string | null
  consent_version: string; items_accepted: string[]; ip_address: string | null
}

type Tab = 'overview' | 'projects' | 'pros' | 'quotes' | 'leads' | 'deposits' | 'consent' | 'audit'

export default function AdminPage() {
  const [secret, setSecret]   = useState('')
  const [authed, setAuthed]   = useState(false)
  const [tab, setTab]         = useState<Tab>('overview')

  const [stats, setStats]     = useState<Stats | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [pros, setPros]       = useState<Pro[]>([])
  const [quotes, setQuotes]   = useState<Quote[]>([])
  const [leads, setLeads]     = useState<Lead[]>([])
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [consentLogs, setConsentLogs] = useState<ConsentLog[]>([])
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async (s = secret) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { 'x-admin-secret': s },
      })
      if (!res.ok) { setAuthed(false); return }
      const data = await res.json()
      setStats(data.stats)
      setProjects(data.projects)
      setPros(data.pros)
      setQuotes(data.quotes)
      setLeads(data.leads)
      setAuditLog(data.audit_log ?? [])
      // Load deposits separately
      fetch('/api/admin/deposits', { headers: { 'x-admin-secret': s ?? secret } })
        .then(r => r.json()).then(d => setDeposits(d.deposits ?? [])).catch(() => {})
      fetch('/api/admin/consent', { headers: { 'x-admin-secret': s ?? secret } })
        .then(r => r.json()).then(d => setConsentLogs(d.consent_logs ?? [])).catch(() => {})
      setAuthed(true)
      // Persist secret in session
      sessionStorage.setItem('admin_secret', s)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [secret])

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_secret')
    if (saved) { setSecret(saved); loadData(saved) }
  }, []) // eslint-disable-line

  // ── Actions ────────────────────────────────────────────────────────────────
  const [licenseNoteModal, setLicenseNoteModal] = useState<{id:string;action:'approve'|'reject'}|null>(null)
  const [licenseNote, setLicenseNote] = useState('')

  const proAction = async (id: string, status: string) => {
    const res = await fetch(`/api/admin/pros/${id}`, {
      method: 'PATCH',
      headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await res.json()
    if (data.success) { setMessage(`Pro status → ${status}`); await loadData() }
    else setMessage(`Error: ${data.error}`)
    setTimeout(() => setMessage(''), 3000)
  }

  const licenseVerifyAction = async (id: string, action: 'approve' | 'reject', note?: string) => {
    const res = await fetch(`/api/admin/pros/${id}/verify`, {
      method: 'POST',
      headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, note: note ?? '', admin_email: 'scide-founder@agentmail.to' }),
    })
    const data = await res.json()
    if (data.ok) { setMessage(`License ${action}d ✓`); await loadData() }
    else setMessage(`Error: ${data.error}`)
    setLicenseNoteModal(null)
    setLicenseNote('')
    setTimeout(() => setMessage(''), 3000)
  }

  const projectAction = async (id: string, action: string, extra?: Record<string, string>) => {
    const res = await fetch(`/api/admin/projects/${id}`, {
      method: 'PATCH',
      headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    })
    const data = await res.json()
    if (data.success || data.autofill_score !== undefined) {
      setMessage(action === 'generate_packet'
        ? `Packet generated — score: ${data.autofill_score}%`
        : `Project ${action}`
      )
      await loadData()
    } else {
      setMessage(`Error: ${data.error}`)
    }
    setTimeout(() => setMessage(''), 4000)
  }

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <main className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
          <h1 className="text-xl font-bold text-gray-900 mb-1">ExpediteHub Admin</h1>
          <p className="text-gray-400 text-sm mb-5">Internal console — authorized access only</p>
          <form onSubmit={e => { e.preventDefault(); loadData() }} className="space-y-3">
            <input type="password" placeholder="Admin secret" value={secret}
              onChange={e => setSecret(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" disabled={loading}
              className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl">
              {loading ? 'Verifying…' : 'Enter'}
            </button>
          </form>
        </div>
      </main>
    )
  }

  const tabCls = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-all ${
      tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
    }`

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg">ExpediteHub</span>
          <span className="text-xs bg-red-600 px-2 py-0.5 rounded font-semibold">ADMIN</span>
        </div>
        <div className="flex items-center gap-3">
          {message && <span className="text-xs bg-green-600 px-3 py-1 rounded-full">{message}</span>}
          <button onClick={() => loadData()} disabled={loading}
            className="text-xs border border-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-700">
            {loading ? 'Refreshing…' : '⟳ Refresh'}
          </button>
          <a href="/admin/template-editor" className="text-xs bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-500">🧩 Template Editor</a>
          <button onClick={() => { sessionStorage.removeItem('admin_secret'); setAuthed(false) }}
            className="text-xs text-gray-400 hover:text-white">Sign out</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="bg-gray-100 rounded-xl p-1 flex gap-1 mb-6 w-fit">
          {(['overview','projects','pros','quotes','leads','deposits','consent','audit'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} className={tabCls(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'pros' && stats && stats.pros_pending > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 rounded-full">{stats.pros_pending}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Overview ────────────────────────────────────────────────────── */}
        {tab === 'overview' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Projects', value: stats.projects, color: 'blue' },
                { label: 'With Packet', value: stats.projects_with_packet, color: 'green' },
                { label: 'Pros (active)', value: stats.pros_active, color: 'purple' },
                { label: 'Pros (pending)', value: stats.pros_pending, color: 'red' },
                { label: 'Quotes', value: stats.quotes, color: 'amber' },
                { label: 'Leads', value: stats.leads, color: 'gray' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-5">
                  <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                  <p className={`text-3xl font-bold ${
                    s.color === 'blue' ? 'text-blue-700' :
                    s.color === 'green' ? 'text-green-700' :
                    s.color === 'purple' ? 'text-purple-700' :
                    s.color === 'red' ? 'text-red-600' :
                    s.color === 'amber' ? 'text-amber-700' : 'text-gray-700'
                  }`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Recent activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Recent Projects</h3>
                <div className="space-y-2">
                  {projects.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-gray-800 font-medium">{p.address?.split(',')[0]}</p>
                        <p className="text-gray-400 text-xs">{p.homeowner_email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.autofill_score != null && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">{p.autofill_score}%</span>
                        )}
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Pending Pro Approvals</h3>
                {pros.filter(p => p.status === 'pending').length === 0 ? (
                  <p className="text-gray-400 text-sm">No pending approvals.</p>
                ) : (
                  <div className="space-y-3">
                    {pros.filter(p => p.status === 'pending').map(p => (
                      <div key={p.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.email} · {p.specialty}</p>
                          {p.license_number && <p className="text-xs text-gray-400">License: {p.license_number}</p>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => proAction(p.id, 'active')}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg">
                            Approve
                          </button>
                          <button onClick={() => proAction(p.id, 'rejected')}
                            className="border border-red-200 text-red-600 text-xs px-3 py-1.5 rounded-lg hover:bg-red-50">
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Projects ────────────────────────────────────────────────────── */}
        {tab === 'projects' && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">All Projects ({projects.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Address', 'Email', 'ADU Type', 'Zoning', 'Status', 'Packet', 'Score', 'Created', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projects.map(p => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-xs truncate">{p.address?.split(',')[0]}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{p.homeowner_email}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{p.proposed_adu_type ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{p.zoning ?? '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          p.packet_status === 'draft_ready' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>{p.packet_status ?? 'pending'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {p.autofill_score != null ? (
                          <span className={`text-xs font-bold ${p.autofill_score >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                            {p.autofill_score}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {p.status === 'draft' && (
                            <ActionBtn onClick={() => projectAction(p.id, 'publish')} label="Publish" color="blue" />
                          )}
                          {p.status === 'submitted' && (
                            <ActionBtn onClick={() => projectAction(p.id, 'unpublish')} label="Unpublish" color="gray" />
                          )}
                          {p.packet_status !== 'draft_ready' && (
                            <ActionBtn onClick={() => projectAction(p.id, 'generate_packet')} label="Gen Packet" color="green" />
                          )}
                          {p.packet_status === 'draft_ready' && (
                            <ActionBtn onClick={() => projectAction(p.id, 'generate_packet')} label="Regen" color="purple" />
                          )}
                          <select
                            defaultValue=""
                            onChange={e => { if (e.target.value) projectAction(p.id, 'set_status', { status: e.target.value }) }}
                            className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 bg-white"
                          >
                            <option value="">Set status…</option>
                            {['draft','submitted','quoted','active','completed','cancelled'].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Pros ─────────────────────────────────────────────────────────── */}
        {tab === 'pros' && (
          <div className="space-y-4">
            {/* License review modal */}
            {licenseNoteModal && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                  <h3 className="font-bold text-lg mb-3">
                    {licenseNoteModal.action === 'approve' ? '✅ Approve License' : '❌ Reject License'}
                  </h3>
                  <textarea
                    value={licenseNote}
                    onChange={e => setLicenseNote(e.target.value)}
                    placeholder={licenseNoteModal.action === 'reject' ? 'Reason for rejection (required)' : 'Optional note'}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  />
                  <div className="flex gap-3">
                    <button onClick={() => { setLicenseNoteModal(null); setLicenseNote('') }}
                      className="flex-1 border border-gray-200 rounded-xl py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                      Cancel
                    </button>
                    <button
                      onClick={() => licenseVerifyAction(licenseNoteModal.id, licenseNoteModal.action, licenseNote)}
                      disabled={licenseNoteModal.action === 'reject' && !licenseNote.trim()}
                      className={`flex-1 rounded-xl py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                        licenseNoteModal.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                      }`}>
                      Confirm {licenseNoteModal.action === 'approve' ? 'Approval' : 'Rejection'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Pending review queue */}
            {pros.filter(p => p.license_status === 'pending_review').length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="font-semibold text-amber-900 mb-3">
                  ⏳ Pending License Review ({pros.filter(p => p.license_status === 'pending_review').length})
                </h3>
                <div className="space-y-3">
                  {pros.filter(p => p.license_status === 'pending_review').map(p => (
                    <div key={p.id} className="bg-white border border-amber-200 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-gray-800">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.email} · {p.specialty}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            License #: <span className="font-mono">{p.license_number ?? 'not provided'}</span>
                            {p.license_expiry && ` · Expiry: ${p.license_expiry}`}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {p.license_doc_url && (
                            <a href={p.license_doc_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200 font-medium">
                              📄 View Doc
                            </a>
                          )}
                          <button onClick={() => setLicenseNoteModal({ id: p.id, action: 'approve' })}
                            className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 font-medium">
                            ✅ Approve
                          </button>
                          <button onClick={() => setLicenseNoteModal({ id: p.id, action: 'reject' })}
                            className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 font-medium">
                            ❌ Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All pros table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">All Pros ({pros.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['Name', 'Email', 'Specialty', 'License #', 'License Status', 'Status', 'Applied', 'Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pros.map(p => (
                      <tr key={p.id} className={`border-b border-gray-50 hover:bg-gray-50 ${p.license_status === 'pending_review' ? 'bg-amber-50/40' : ''}`}>
                        <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{p.email}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{p.specialty}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs font-mono">{p.license_number ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            p.license_status === 'approved' ? 'bg-green-100 text-green-700' :
                            p.license_status === 'pending_review' ? 'bg-amber-100 text-amber-700' :
                            p.license_status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {p.license_status ?? 'not_submitted'}
                          </span>
                          {p.license_doc_url && (
                            <a href={p.license_doc_url} target="_blank" rel="noopener noreferrer"
                              className="ml-1 text-xs text-blue-500 hover:underline">📄</a>
                          )}
                        </td>
                        <td className="px-4 py-3"><ProStatusBadge status={p.status} /></td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {p.license_status === 'pending_review' && (
                              <>
                                <ActionBtn onClick={() => setLicenseNoteModal({ id: p.id, action: 'approve' })} label="✓ Verify" color="green" />
                                <ActionBtn onClick={() => setLicenseNoteModal({ id: p.id, action: 'reject' })} label="× Reject" color="red" />
                              </>
                            )}
                            {p.status === 'active' && (
                              <ActionBtn onClick={() => proAction(p.id, 'suspended')} label="Suspend" color="amber" />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Quotes ──────────────────────────────────────────────────────── */}
        {tab === 'quotes' && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">All Quotes ({quotes.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Pro', 'Pro Email', 'Amount', 'Status', 'Date'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {quotes.map(q => (
                    <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{q.pro_name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{q.pro_email}</td>
                      <td className="px-4 py-3 text-green-700 font-semibold">${Number(q.quote_amount).toLocaleString()}</td>
                      <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(q.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Leads ───────────────────────────────────────────────────────── */}
        {tab === 'leads' && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">All Leads ({leads.length})</h2>
            </div>
            {leads.length === 0 ? (
              <p className="text-gray-400 text-sm p-6">No leads yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['Email', 'Project Type', 'Created'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map(l => (
                      <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{l.email}</td>
                        <td className="px-4 py-3 text-gray-600">{l.project_type ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{new Date(l.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'deposits' && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Deposits ({deposits.length})</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Total: ${deposits.filter(d=>d.status==='authorized'||d.status==='captured').reduce((s,d)=>s+d.amount_cents,0)/100} captured &nbsp;·&nbsp;
                  {deposits.filter(d=>d.status==='refunded').length} refunded
                </p>
              </div>
            </div>
            {deposits.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">No deposits yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Email','Amount','Status','Receipt','Project','Created'].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {deposits.map(d => (
                      <tr key={d.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-xs">{d.homeowner_email}</td>
                        <td className="px-4 py-2 text-xs font-mono">${(d.amount_cents/100).toFixed(2)}</td>
                        <td className="px-4 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            d.status==='captured'||d.status==='authorized' ? 'bg-green-100 text-green-700' :
                            d.status==='refunded' ? 'bg-red-100 text-red-700' :
                            d.status==='pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{d.status}</span>
                        </td>
                        <td className="px-4 py-2 text-xs">{d.receipt_sent_at ? '✅ sent' : '—'}</td>
                        <td className="px-4 py-2 text-xs font-mono">{d.project_id?.slice(0,8) ?? '—'}</td>
                        <td className="px-4 py-2 text-xs text-gray-400">{new Date(d.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'consent' && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Consent Logs ({consentLogs.length})</h2>
              <p className="text-xs text-gray-400 mt-0.5">Immutable ToS + AI disclaimer acceptance records. Version {consentLogs[0]?.consent_version ?? 'v1.0-2026-04-12'}.</p>
            </div>
            {consentLogs.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">No consent logs yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Email','Items Accepted','Version','Project','IP','Date'].map(h => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {consentLogs.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-xs">{c.email}</td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-1">
                            {c.items_accepted.map(item => (
                              <span key={item} className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{item}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-xs font-mono">{c.consent_version}</td>
                        <td className="px-4 py-2 text-xs font-mono">{c.project_id?.slice(0,8) ?? '—'}</td>
                        <td className="px-4 py-2 text-xs text-gray-400">{c.ip_address ?? '—'}</td>
                        <td className="px-4 py-2 text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'audit' && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Audit Log ({auditLog.length})</h2>
              <p className="text-xs text-gray-400 mt-0.5">Immutable record of quote submissions, document actions, and message events.</p>
            </div>
            {auditLog.length === 0 ? (
              <p className="text-gray-400 text-sm p-6">No audit events yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['Timestamp', 'Action', 'Actor', 'Role', 'Entity', 'Entity ID'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {auditLog.map(e => (
                      <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{e.action}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{e.actor_email ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            e.actor_role === 'pro' ? 'bg-blue-100 text-blue-700' :
                            e.actor_role === 'homeowner' ? 'bg-green-100 text-green-700' :
                            e.actor_role === 'admin' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{e.actor_role ?? 'system'}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{e.entity_type}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs font-mono">{e.entity_id?.slice(0, 8)}…</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft:      'bg-gray-100 text-gray-600',
    submitted:  'bg-blue-100 text-blue-800',
    quoted:     'bg-green-100 text-green-800',
    active:     'bg-purple-100 text-purple-800',
    completed:  'bg-gray-100 text-gray-600',
    cancelled:  'bg-red-100 text-red-700',
    pending:    'bg-amber-100 text-amber-800',
  }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

function ProStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending:   'bg-amber-100 text-amber-800',
    active:    'bg-green-100 text-green-800',
    rejected:  'bg-red-100 text-red-700',
    suspended: 'bg-orange-100 text-orange-700',
  }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

function ActionBtn({ onClick, label, color }: { onClick: () => void; label: string; color: string }) {
  const cls: Record<string, string> = {
    blue:   'bg-blue-600 hover:bg-blue-700 text-white',
    green:  'bg-green-600 hover:bg-green-700 text-white',
    red:    'bg-red-600 hover:bg-red-700 text-white',
    gray:   'border border-gray-200 text-gray-600 hover:bg-gray-50',
    amber:  'bg-amber-500 hover:bg-amber-600 text-white',
    purple: 'bg-purple-600 hover:bg-purple-700 text-white',
  }
  return (
    <button onClick={onClick} className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${cls[color] ?? cls.gray}`}>
      {label}
    </button>
  )
}
