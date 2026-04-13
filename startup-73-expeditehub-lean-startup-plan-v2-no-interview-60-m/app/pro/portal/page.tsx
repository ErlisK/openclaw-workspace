'use client'
import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import Link from 'next/link'
import CorrectionCapture from '@/components/CorrectionCapture'

interface Project {
  id: string
  address: string
  zip: string | null
  proposed_adu_type: string | null
  proposed_adu_sqft: number | null
  zoning: string | null
  lot_size_sqft: number | null
  year_built: number | null
  existing_sqft: number | null
  has_plans: boolean
  plans_ready: string | null
  timeline: string | null
  packet_status: string | null
  autofill_score: number | null
  file_urls: string[] | null
  status: string
  created_at: string
}

interface Quote {
  id: string
  project_id: string
  pro_email: string
  quote_amount: number
  timeline_days: number | null
  scope: string | null
  notes: string | null
  status: string
  created_at: string
}

interface Message {
  id: string
  project_id: string
  sender_email: string
  sender_role: string
  body: string
  created_at: string
}

type View = 'board' | 'project'

export default function ProPortalPage() {
  const [proEmail, setProEmail]     = useState<string | null>(null)
  const [proName, setProName]       = useState<string>('')
  const [authLoading, setAuthLoading] = useState(true)

  const [view, setView]             = useState<View>('board')
  const [projects, setProjects]     = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [myQuotes, setMyQuotes]     = useState<Quote[]>([])
  const [messages, setMessages]     = useState<Message[]>([])

  const [quoteAmount, setQuoteAmount]   = useState('')
  const [quoteDays, setQuoteDays]       = useState('')
  const [quoteScope, setQuoteScope]     = useState('')
  const [quoteNotes, setQuoteNotes]     = useState('')
  const [packetNotes, setPacketNotes]   = useState('')
  const [quoteType, setQuoteType]       = useState<'flat' | 'milestone'>('flat')

  // Quoting UX v1.5: scope checklist + presets
  const SCOPE_PRESETS = [
    { label: 'Full Service', amount: '2800', days: '45', scope: 'Complete ADU permit package: BP-001 form preparation, site plan review, DSD submission, corrections management, permit issuance follow-up. Includes up to 2 correction cycles.' },
    { label: 'Packet Only', amount: '1200', days: '14', scope: 'Permit packet preparation only: review AI-generated BP-001 draft, correct errors, finalize forms for homeowner self-submission to Austin DSD.' },
    { label: 'Rush (10-day)', amount: '3500', days: '10', scope: 'Expedited full-service permit package with priority DSD submission. Guaranteed packet delivery in 5 business days. Includes dedicated case tracking.' },
  ]

  // Milestone presets — editable rows
  interface Milestone { label: string; pct: number; desc: string }
  const DEFAULT_MILESTONES: Milestone[] = [
    { label: 'M1 — Packet Complete', pct: 40, desc: 'BP-001 forms finalized, site plan reviewed, packet delivered to homeowner for review' },
    { label: 'M2 — DSD Submitted', pct: 40, desc: 'Application submitted to Austin Development Services Department; case number received' },
    { label: 'M3 — Permit Issued', pct: 20, desc: 'Permit approved and issued by Austin DSD; all corrections resolved' },
  ]
  const [milestones, setMilestones] = useState<Milestone[]>(DEFAULT_MILESTONES)
  const milestonePctTotal = milestones.reduce((s, m) => s + m.pct, 0)

  // Required attachments checklist
  const REQUIRED_ATTACHMENTS = [
    { key: 'survey', label: 'Boundary / ALTA survey', required: true },
    { key: 'site_plan', label: 'Site plan showing ADU footprint + setbacks', required: true },
    { key: 'floor_plan', label: 'ADU floor plan (all rooms labeled)', required: true },
    { key: 'elevation', label: 'Building elevations (all 4 sides)', required: true },
    { key: 'title', label: 'Proof of ownership (deed or title)', required: true },
    { key: 'impervious', label: 'Impervious cover calculation worksheet', required: true },
    { key: 'utility', label: 'Utility connection diagram / engineer letter', required: false },
    { key: 'hoa', label: 'HOA approval letter (if applicable)', required: false },
    { key: 'tree_survey', label: 'Tree survey (heritage trees within 10 ft of footprint)', required: false },
  ]
  const [attachments, setAttachments] = useState<Record<string, boolean>>(
    Object.fromEntries(REQUIRED_ATTACHMENTS.map(a => [a.key, false]))
  )
  const reqAttachmentsDone = REQUIRED_ATTACHMENTS.filter(a => a.required && attachments[a.key]).length
  const reqAttachmentsTotal = REQUIRED_ATTACHMENTS.filter(a => a.required).length

  const DEFAULT_CHECKLIST = [
    'Reviewed AI-generated packet for accuracy',
    'Verified zoning district (SF-3 / other) with Austin GIS',
    'Confirmed impervious cover calculation',
    'Checked setbacks against LDC §25-2-492',
    'Confirmed lot size from Travis CAD',
    'Verified ADU size ≤ code maximum',
    'Reviewed uploaded site plans / survey',
    'Confirmed utility connection type with homeowner',
  ]
  const [checklist, setChecklist] = useState<boolean[]>(DEFAULT_CHECKLIST.map(() => false))
  const checklistComplete = checklist.filter(Boolean).length
  const checklistTotal = checklist.length
  const [submittingQuote, setSubmittingQuote] = useState(false)
  const [quoteSubmitted, setQuoteSubmitted]   = useState(false)

  const [newMessage, setNewMessage]   = useState('')
  const [sendingMsg, setSendingMsg]   = useState(false)

  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createSupabaseBrowser()
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email ?? null
      setProEmail(email)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setProEmail(session?.user?.email ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Load pro profile ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!proEmail) return
    fetch(`/api/pro-board/profile?email=${encodeURIComponent(proEmail)}`)
      .then(r => r.json())
      .then(d => { if (d.name) setProName(d.name) })
      .catch(() => {})
  }, [proEmail])

  // ── Load projects ─────────────────────────────────────────────────────────
  const loadProjects = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pro-board')
      const data = await res.json()
      setProjects(data.projects ?? [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (proEmail) loadProjects()
  }, [proEmail, loadProjects])

  // ── Open project ──────────────────────────────────────────────────────────
  const openProject = async (p: Project) => {
    setSelectedProject(p)
    setView('project')
    setQuoteSubmitted(false)
    setError('')

    // Load quotes + messages
    const [qRes, mRes] = await Promise.all([
      fetch(`/api/quotes?project_id=${p.id}`),
      fetch(`/api/messages?project_id=${p.id}`),
    ])
    const qData = await qRes.json()
    const mData = await mRes.json()

    // Show only this pro's quotes
    const allQuotes: Quote[] = qData.quotes ?? []
    setMyQuotes(allQuotes.filter(q => q.pro_email === proEmail))
    setMessages(mData.messages ?? [])

    // Check if already quoted
    if (allQuotes.some(q => q.pro_email === proEmail)) {
      setQuoteSubmitted(true)
    }
  }

  // ── Submit quote ──────────────────────────────────────────────────────────
  const submitQuote = async () => {
    if (!selectedProject || !proEmail || !quoteAmount) return
    setSubmittingQuote(true)
    setError('')
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProject.id,
          pro_email: proEmail,
          pro_name: proName || proEmail,
          quote_amount: parseFloat(quoteAmount),
          timeline_days: quoteDays ? parseInt(quoteDays) : null,
          scope: quoteScope || null,
          notes: quoteNotes || null,
          packet_review_notes: packetNotes || null,
          quote_type: quoteType,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setQuoteSubmitted(true)
      setMyQuotes([{ ...data, pro_email: proEmail, quote_amount: parseFloat(quoteAmount) } as Quote])
      // Reload messages (auto-message was created)
      const mRes = await fetch(`/api/messages?project_id=${selectedProject.id}`)
      setMessages((await mRes.json()).messages ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit quote')
    } finally {
      setSubmittingQuote(false)
    }
  }

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedProject || !proEmail) return
    setSendingMsg(true)
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProject.id,
          sender_email: proEmail,
          sender_role: 'pro',
          body: newMessage.trim(),
        }),
      })
      setNewMessage('')
      const mRes = await fetch(`/api/messages?project_id=${selectedProject.id}`)
      setMessages((await mRes.json()).messages ?? [])
    } catch { /* ignore */ }
    finally { setSendingMsg(false) }
  }

  // ── Sign out ──────────────────────────────────────────────────────────────
  const signOut = async () => {
    await createSupabaseBrowser().auth.signOut()
    window.location.href = '/pro/login'
  }

  // ── Loading / auth gate ───────────────────────────────────────────────────
  if (authLoading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </main>
    )
  }

  if (!proEmail) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border p-8 max-w-sm w-full text-center">
          <h1 className="text-xl font-bold mb-2">Pro Portal</h1>
          <p className="text-gray-500 text-sm mb-4">Sign in to access the project board and submit quotes.</p>
          <Link href="/pro/login" className="block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl">
            Sign In →
          </Link>
        </div>
      </main>
    )
  }

  // ── Project Board ─────────────────────────────────────────────────────────
  if (view === 'board') {
    return (
      <main className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-bold text-xl text-blue-700">ExpediteHub</Link>
            <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-1 rounded-full">Pro Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{proName || proEmail}</span>
            <button onClick={signOut} className="text-xs text-gray-400 hover:text-gray-600">Sign out</button>
          </div>
        </nav>

        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Project Board</h1>
              <p className="text-gray-500 text-sm">Austin ADU projects ready for quotes</p>
            </div>
            <button onClick={loadProjects} disabled={loading}
              className="border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-all">
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-16 text-gray-400">Loading projects…</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <p className="text-gray-400">No projects available right now.</p>
              <p className="text-xs text-gray-300 mt-1">Check back soon — new ADU requests arrive daily.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map(p => (
                <ProjectCard key={p.id} project={p} onOpen={() => openProject(p)} />
              ))}
            </div>
          )}
        </div>
      </main>
    )
  }

  // ── Project Detail ────────────────────────────────────────────────────────
  if (view === 'project' && selectedProject) {
    const p = selectedProject
    return (
      <main className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
          <Link href="/" className="font-bold text-xl text-blue-700">ExpediteHub</Link>
          <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-1 rounded-full">Pro Portal</span>
          <button onClick={() => setView('board')} className="text-sm text-gray-500 hover:text-blue-600">
            ← Back to board
          </button>
        </nav>

        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Project details + packet info */}
          <div className="lg:col-span-2 space-y-5">

            {/* Project card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {/* Anonymized: hide exact street number */}
                    {anonymizeAddress(p.address)}
                  </h2>
                  <p className="text-gray-400 text-sm">Austin, TX {p.zip}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  p.status === 'submitted' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }`}>{p.status}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mb-4">
                <Detail label="ADU Type" value={p.proposed_adu_type} />
                <Detail label="Size" value={p.proposed_adu_sqft ? `${p.proposed_adu_sqft} sq ft` : null} />
                <Detail label="Zoning" value={p.zoning} />
                <Detail label="Lot Size" value={p.lot_size_sqft ? `${p.lot_size_sqft.toLocaleString()} sq ft` : null} />
                <Detail label="Existing Home" value={p.existing_sqft ? `${p.existing_sqft.toLocaleString()} sq ft` : null} />
                <Detail label="Year Built" value={p.year_built?.toString()} />
                <Detail label="Has Plans" value={p.has_plans ? 'Yes' : p.plans_ready === 'yes_partial' ? 'Partial' : 'No'} />
                <Detail label="Timeline" value={p.timeline} />
                <Detail label="Files" value={p.file_urls?.length ? `${p.file_urls.length} uploaded` : 'None'} />
              </div>

              <div className="text-xs text-gray-400">
                Posted {new Date(p.created_at).toLocaleDateString()}
              </div>
            </div>

            {/* AI Packet status */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-3">AI Permit Packet</h3>
              {p.packet_status === 'draft_ready' ? (
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-green-600 font-semibold text-sm">Packet ready</span>
                      {p.autofill_score !== null && (
                        <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full">
                          {p.autofill_score}% pre-filled
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      AI has pre-filled {p.autofill_score}% of required Austin ADU form fields.
                      Download to review before quoting.
                    </p>
                  </div>
                  <button
                    onClick={() => window.open(`/api/projects/${p.id}/packet-download`, '_blank')}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg whitespace-nowrap">
                    Download PDF
                  </button>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
                  <p className="font-medium">Packet generating…</p>
                  <p className="text-xs mt-1 text-amber-700">The AI packet will be ready before your quote is presented to the homeowner.</p>
                </div>
              )}
            </div>

            {/* Correction Letters */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">🔴 Correction Letters</h3>
              {selectedProject && proEmail && (
                <CorrectionCapture
                  projectId={selectedProject.id}
                  userEmail={proEmail}
                  userRole="pro"
                  quoteId={myQuotes[0]?.id}
                />
              )}
            </div>

            {/* Message thread */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Messages</h3>
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">No messages yet.</p>
                ) : messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_role === 'pro' && m.sender_email === proEmail ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-sm rounded-xl px-4 py-2.5 text-sm ${
                      m.sender_role === 'pro' && m.sender_email === proEmail
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      <p className="text-xs opacity-70 mb-1">
                        {m.sender_role === 'homeowner' ? 'Homeowner' : m.sender_role === 'pro' ? 'You' : m.sender_email}
                      </p>
                      <p className="whitespace-pre-line">{m.body}</p>
                      <p className="text-xs mt-1 opacity-60">{new Date(m.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              {quoteSubmitted ? (
                <div className="flex gap-2">
                  <input
                    type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Ask a question or add context…"
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={sendMessage} disabled={sendingMsg || !newMessage.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-xl">
                    Send
                  </button>
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center">Submit a quote to unlock messaging.</p>
              )}
            </div>
          </div>

          {/* Right: Quote submission */}
          <div className="space-y-5">
            {quoteSubmitted && myQuotes.length > 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                <p className="text-green-800 font-semibold mb-3">Quote Submitted</p>
                {myQuotes.map(q => (
                  <div key={q.id} className="text-sm space-y-1 text-green-700">
                    <p className="text-2xl font-bold text-green-900">${Number(q.quote_amount).toLocaleString()}</p>
                    {q.timeline_days && <p>{q.timeline_days}-day timeline</p>}
                    {q.scope && <p className="text-xs mt-2">{q.scope}</p>}
                  </div>
                ))}
                <p className="text-xs text-green-600 mt-3">
                  The homeowner has been notified. Use messaging to answer questions.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Submit a Quote</h3>
                {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}

                {/* Quote type toggle */}
                <div className="flex gap-2 mb-4">
                  {(['flat', 'milestone'] as const).map(t => (
                    <button key={t} onClick={() => setQuoteType(t)}
                      className={`flex-1 text-sm py-2 rounded-lg font-medium transition-all ${
                        quoteType === t ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}>
                      {t === 'flat' ? 'Flat Fee' : 'Milestones'}
                    </button>
                  ))}
                </div>

                {/* Presets */}
                <div className="mb-3">
                  <div className="text-xs font-medium text-gray-600 mb-2">Quick Presets</div>
                  <div className="grid grid-cols-3 gap-2">
                    {SCOPE_PRESETS.map(preset => (
                      <button key={preset.label}
                        onClick={() => { setQuoteAmount(preset.amount); setQuoteDays(preset.days); setQuoteScope(preset.scope) }}
                        className="border border-blue-200 rounded-lg p-2 text-left hover:bg-blue-50 transition-colors">
                        <div className="text-xs font-semibold text-blue-700">{preset.label}</div>
                        <div className="text-xs text-gray-600">${preset.amount} · {preset.days}d</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pre-submission checklist */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-gray-700">Pre-Quote Checklist</div>
                    <div className={`text-xs font-medium ${checklistComplete === checklistTotal ? 'text-green-600' : 'text-gray-500'}`}>
                      {checklistComplete}/{checklistTotal} complete
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {DEFAULT_CHECKLIST.map((item, i) => (
                      <label key={i} className="flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" checked={checklist[i]} onChange={e => setChecklist(prev => prev.map((v, j) => j === i ? e.target.checked : v))}
                          className="mt-0.5 shrink-0" />
                        <span className={`text-xs ${checklist[i] ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {quoteType === 'flat' ? 'Flat Fee ($)' : 'Total Amount ($)'} *
                    </label>
                    <input type="number" value={quoteAmount} onChange={e => setQuoteAmount(e.target.value)}
                      placeholder="e.g. 2800" min="100"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Timeline (days)</label>
                    <input type="number" value={quoteDays} onChange={e => setQuoteDays(e.target.value)}
                      placeholder="e.g. 45"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Scope of work</label>
                    <textarea value={quoteScope} onChange={e => setQuoteScope(e.target.value)}
                      rows={3} placeholder="What's included in your quote…"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  {quoteType === 'milestone' && (
                    <div className="border border-blue-200 rounded-lg overflow-hidden">
                      <div className="bg-blue-600 text-white px-3 py-2 flex items-center justify-between">
                        <span className="text-xs font-semibold">Milestone Schedule</span>
                        <span className={`text-xs font-medium ${
                          milestonePctTotal === 100 ? 'text-green-300' : 'text-yellow-300'
                        }`}>{milestonePctTotal}% allocated {milestonePctTotal !== 100 && '⚠️ must = 100%'}</span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {milestones.map((m, i) => (
                          <div key={i} className="p-3 bg-white">
                            <div className="flex gap-2 items-start">
                              <div className="flex-1">
                                <input
                                  value={m.label}
                                  onChange={e => setMilestones(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                                  className="text-xs font-semibold text-gray-800 border-b border-transparent hover:border-gray-300 focus:border-blue-400 outline-none w-full bg-transparent"
                                />
                                <input
                                  value={m.desc}
                                  onChange={e => setMilestones(prev => prev.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))}
                                  className="text-xs text-gray-500 mt-0.5 border-b border-transparent hover:border-gray-300 focus:border-blue-400 outline-none w-full bg-transparent"
                                />
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <input
                                  type="number" min={0} max={100}
                                  value={m.pct}
                                  onChange={e => setMilestones(prev => prev.map((x, j) => j === i ? { ...x, pct: parseInt(e.target.value) || 0 } : x))}
                                  className="w-12 text-xs border rounded px-1.5 py-1 text-center"
                                />
                                <span className="text-xs text-gray-500">%</span>
                                {quoteAmount && (
                                  <span className="text-xs text-blue-600 font-medium ml-1">
                                    ${Math.round(parseFloat(quoteAmount || '0') * m.pct / 100).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="bg-gray-50 px-3 py-2 flex gap-2">
                        <button
                          onClick={() => setMilestones(DEFAULT_MILESTONES)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >↺ Reset defaults</button>
                        <button
                          onClick={() => setMilestones(prev => [...prev, { label: `M${prev.length + 1} — `, pct: 0, desc: '' }])}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >+ Add milestone</button>
                      </div>
                    </div>
                  )}

                  {/* Required Attachments Checklist */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-800 text-white px-3 py-2 flex items-center justify-between">
                      <span className="text-xs font-semibold">📎 Required Attachments</span>
                      <span className={`text-xs font-medium ${
                        reqAttachmentsDone === reqAttachmentsTotal ? 'text-green-300' : 'text-yellow-300'
                      }`}>{reqAttachmentsDone}/{reqAttachmentsTotal} required confirmed</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {REQUIRED_ATTACHMENTS.map(att => (
                        <label key={att.key} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={attachments[att.key]}
                            onChange={e => setAttachments(prev => ({ ...prev, [att.key]: e.target.checked }))}
                            className="shrink-0"
                          />
                          <span className={`text-xs flex-1 ${
                            attachments[att.key] ? 'text-gray-400 line-through' : 'text-gray-700'
                          }`}>{att.label}</span>
                          {!att.required && (
                            <span className="text-xs text-gray-400 shrink-0">optional</span>
                          )}
                          {att.required && !attachments[att.key] && (
                            <span className="text-xs text-red-500 shrink-0">required</span>
                          )}
                        </label>
                      ))}
                    </div>
                    <div className="bg-gray-50 px-3 py-2">
                      <p className="text-xs text-gray-400">Homeowner uploads files in /request. You can request missing docs via the message thread.</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Notes on AI packet</label>
                    <textarea value={packetNotes} onChange={e => setPacketNotes(e.target.value)}
                      rows={2} placeholder="Any issues or observations about the pre-filled packet…"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Additional notes</label>
                    <textarea value={quoteNotes} onChange={e => setQuoteNotes(e.target.value)}
                      rows={2} placeholder="Questions for homeowner, availability, etc."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  <button onClick={submitQuote}
                    disabled={submittingQuote || !quoteAmount}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all">
                    {submittingQuote ? 'Submitting…' : 'Submit Quote'}
                  </button>

                  <p className="text-xs text-gray-400 text-center">
                    Homeowner will be notified by email.
                    Payment held in escrow until milestones approved.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    )
  }

  return null
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2.5">
      <p className="text-gray-400 text-xs">{label}</p>
      <p className="font-medium text-gray-800 text-sm">{value ?? '—'}</p>
    </div>
  )
}

function ProjectCard({ project: p, onOpen }: { project: Project; onOpen: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-blue-200 transition-all cursor-pointer"
      onClick={onOpen}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{anonymizeAddress(p.address)}</h3>
          <p className="text-gray-400 text-xs">Austin, TX {p.zip} · Posted {new Date(p.created_at).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2">
          {p.packet_status === 'draft_ready' && p.autofill_score !== null && (
            <span className="text-xs bg-green-100 text-green-800 font-semibold px-2 py-0.5 rounded-full">
              AI {p.autofill_score}% filled
            </span>
          )}
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            p.status === 'submitted' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
          }`}>{p.status}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {p.proposed_adu_type && (
          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">{p.proposed_adu_type}</span>
        )}
        {p.proposed_adu_sqft && (
          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">{p.proposed_adu_sqft} sq ft</span>
        )}
        {p.zoning && (
          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">Zoning: {p.zoning}</span>
        )}
        {p.has_plans && (
          <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded">Has plans</span>
        )}
        {p.timeline && (
          <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded">{p.timeline}</span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {p.file_urls?.length ? `${p.file_urls.length} file(s) attached` : 'No files uploaded'}
        </span>
        <span className="text-blue-600 text-sm font-medium">View & Quote →</span>
      </div>
    </div>
  )
}

function anonymizeAddress(address: string): string {
  // Show block (round to nearest 100) and street name only — not the exact number
  const match = address.match(/^(\d+)\s+(.+?),/)
  if (!match) return address.split(',')[0]
  const num = parseInt(match[1])
  const block = Math.floor(num / 100) * 100
  return `${block} block of ${match[2]}`
}
