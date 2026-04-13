'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import CorrectionCapture from '@/components/CorrectionCapture'
import ProjectTimeline from '@/components/ProjectTimeline'

interface Quote {
  id: string
  pro_name: string
  pro_email: string
  quote_amount: number
  timeline_days: number | null
  scope: string | null
  notes: string | null
  packet_review_notes: string | null
  status: string
  created_at: string
}

interface Message {
  id: string
  sender_email: string
  sender_role: string
  body: string
  created_at: string
}

interface Project {
  id: string
  address: string
  proposed_adu_type: string
  proposed_adu_sqft: number | null
  zoning: string | null
  status: string
  packet_status: string
  autofill_score: number | null
  file_urls: string[] | null
  created_at: string
  homeowner_email: string
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const [projectId, setProjectId]       = useState<string | null>(null)
  const [project, setProject]           = useState<Project | null>(null)
  const [quotes, setQuotes]             = useState<Quote[]>([])
  const [messages, setMessages]         = useState<Message[]>([])
  const [loading, setLoading]           = useState(true)
  const [acceptingQuote, setAcceptingQuote] = useState<string | null>(null)
  const [newMessage, setNewMessage]     = useState('')
  const [sending, setSending]           = useState(false)
  const [error, setError]               = useState('')

  useEffect(() => { params.then(p => setProjectId(p.id)) }, [params])

  useEffect(() => {
    if (!projectId) return
    fetchAll()
    const iv = setInterval(fetchAll, 30000)
    return () => clearInterval(iv)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const fetchAll = async () => {
    if (!projectId) return
    try {
      const [projRes, quotesRes, msgsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/quotes?project_id=${projectId}`),
        fetch(`/api/messages?project_id=${projectId}`),
      ])
      if (projRes.ok)   setProject(await projRes.json())
      if (quotesRes.ok) setQuotes((await quotesRes.json()).quotes ?? [])
      if (msgsRes.ok)   setMessages((await msgsRes.json()).messages ?? [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const acceptQuote = async (quoteId: string, amount: number) => {
    if (!projectId) return
    setAcceptingQuote(quoteId)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          quote_id: quoteId,
          amount,
          homeowner_email: project?.homeowner_email,
        }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setError('Checkout failed: ' + (data.error || 'unknown error'))
    } catch {
      setError('Failed to start checkout')
    } finally {
      setAcceptingQuote(null)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !projectId || !project) return
    setSending(true)
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          sender_email: project.homeowner_email,
          sender_role: 'homeowner',
          body: newMessage,
        }),
      })
      setNewMessage('')
      await fetchAll()
    } catch { /* ignore */ }
    finally { setSending(false) }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading project…</div>
      </main>
    )
  }

  if (!project) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Project not found.</p>
          <Link href="/" className="text-blue-600 hover:underline">← Back home</Link>
        </div>
      </main>
    )
  }

  const statusColors: Record<string, string> = {
    submitted: 'bg-blue-100 text-blue-800',
    quoted:    'bg-green-100 text-green-800',
    active:    'bg-purple-100 text-purple-800',
    completed: 'bg-gray-100 text-gray-700',
    draft:     'bg-yellow-100 text-yellow-800',
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="font-bold text-xl text-blue-700">ExpediteHub</Link>
        <span className="text-gray-300">›</span>
        <span className="text-gray-600 text-sm truncate max-w-sm">{project.address}</span>
        <div className="ml-auto">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColors[project.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {project.status}
          </span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Project header strip */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{project.address}</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {project.proposed_adu_type}
              {project.proposed_adu_sqft && ` · ${project.proposed_adu_sqft.toLocaleString()} sq ft`}
              {project.zoning && ` · ${project.zoning}`}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${(project.autofill_score ?? 0) >= 75 ? 'text-green-600' : 'text-amber-500'}`}>
              {project.autofill_score ?? 0}%
            </div>
            <div className="text-xs text-gray-400">AI fill score</div>
          </div>
        </div>

        {/* AI Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
          <span className="font-semibold">⚠️ AI-Assisted Packet:</span>{' '}
          This permit packet was pre-filled by AI from your inputs and public GIS data. A licensed expediter will verify all fields before submission.
          Municipality acceptance is not guaranteed. Review carefully with your Pro before approving.{' '}
          <a href="/tos#ai" target="_blank" className="underline hover:text-amber-900">Learn more →</a>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* ── Timeline + completeness + quotes ─────────────────────────────── */}
        <ProjectTimeline
          project={project}
          quotes={quotes}
          onAcceptQuote={acceptQuote}
          acceptingQuote={acceptingQuote}
        />

        {/* ── Correction Letters ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🔴 Correction Letters</h2>
          <CorrectionCapture
            projectId={project.id}
            userEmail={project.homeowner_email}
            userRole="homeowner"
          />
        </div>

        {/* ── Message Thread ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">💬 Messages</h2>
          <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No messages yet. Accept a quote to start chatting with your pro.</p>
            ) : (
              messages.map(m => (
                <div key={m.id} className={`flex ${m.sender_role === 'homeowner' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-sm rounded-xl px-4 py-2.5 text-sm ${
                    m.sender_role === 'homeowner' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
                  }`}>
                    <p className="text-xs opacity-70 mb-1">{m.sender_role === 'pro' ? m.sender_email : 'You'}</p>
                    <p className="whitespace-pre-line">{m.body}</p>
                    <p className={`text-xs mt-1 ${m.sender_role === 'homeowner' ? 'text-blue-200' : 'text-gray-400'}`}>
                      {new Date(m.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Type a message…"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={sendMessage} disabled={sending || !newMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-xl transition-all">
              Send
            </button>
          </div>
        </div>

      </div>
    </main>
  )
}
