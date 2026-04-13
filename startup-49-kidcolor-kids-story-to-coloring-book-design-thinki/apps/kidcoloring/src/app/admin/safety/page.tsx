'use client'
/**
 * /admin/safety — Moderation Pipeline Dashboard (v1.3)
 *
 * Tabs:
 *   1. Review Queue     — unreviewed flags with bulk actions
 *   2. Escalations      — high-risk & grooming alerts
 *   3. Stats & Trends   — 7d overview, top flag categories
 *   4. Session Abuse    — per-session abuse level tracker
 *   5. NSFW Heuristics  — image moderation signals
 *   6. Filter Sandbox   — test prompts live
 *   7. Filter Changelog — version history
 */
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

// ── Types ────────────────────────────────────────────────────────────────────
interface QueueItem {
  id: number
  session_id: string | null
  page_number: number | null
  prompt_raw: string
  prompt_safe: string | null
  flags: string[]
  risk_score: number
  nsfw_score: number
  semantic_score: number
  action: string
  image_url: string | null
  reviewed: boolean
  escalated: boolean
  age_profile: string
  created_at: string
  review_verdict: string | null
}
interface Stats {
  total: number; unreviewed: number; blocked: number; escalated: number
  recent7d: { count: number; allow: number; sanitize: number; block: number; avgRisk: number }
  topFlags: { cat: string; count: number }[]
  filterVersion: string
}
interface AbuseSession {
  session_id: string; total_attempts: number; blocked_count: number
  sanitized_count: number; max_risk_score: number; abuse_level: string
  last_seen_at: string; flagged_ips: string[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const RISK_COLOR = (score: number) =>
  score >= 80 ? 'text-red-700 bg-red-100' :
  score >= 50 ? 'text-orange-700 bg-orange-100' :
  score >= 30 ? 'text-yellow-700 bg-yellow-100' :
  'text-gray-500 bg-gray-100'

const ACTION_BADGE = (action: string) =>
  action === 'block'    ? 'bg-red-100 text-red-700' :
  action === 'sanitize' ? 'bg-yellow-100 text-yellow-700' :
  'bg-green-100 text-green-700'

const ABUSE_COLOR = (level: string) =>
  level === 'banned'  ? 'bg-red-600 text-white' :
  level === 'high'    ? 'bg-red-100 text-red-700' :
  level === 'medium'  ? 'bg-orange-100 text-orange-700' :
  level === 'low'     ? 'bg-yellow-100 text-yellow-700' :
  'bg-gray-100 text-gray-500'

function ts(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Review Queue Item ─────────────────────────────────────────────────────────
function QueueRow({ item, onVerdict, selected, onSelect }: {
  item: QueueItem
  onVerdict: (id: number, v: 'ok' | 'escalate' | 'false_positive') => void
  selected: boolean
  onSelect: (id: number, v: boolean) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (v: 'ok' | 'escalate' | 'false_positive') => {
    setSubmitting(true)
    await onVerdict(item.id, v)
    setSubmitting(false)
  }

  return (
    <div className={`rounded-xl border ${item.escalated ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-white'} p-3`}>
      <div className="flex items-start gap-2">
        <input type="checkbox" checked={selected} onChange={e => onSelect(item.id, e.target.checked)}
          className="mt-1 accent-violet-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ACTION_BADGE(item.action)}`}>
              {item.action}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${RISK_COLOR(item.risk_score)}`}>
              risk {item.risk_score}
            </span>
            {item.nsfw_score > 0 && (
              <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">
                nsfw {item.nsfw_score}
              </span>
            )}
            {item.semantic_score > 0 && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                semantic {item.semantic_score}
              </span>
            )}
            {item.escalated && (
              <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-bold">
                🚨 escalated
              </span>
            )}
            <span className="text-xs text-gray-400">{item.age_profile}</span>
            <span className="text-xs text-gray-400">{ts(item.created_at)}</span>
          </div>

          {/* Prompt preview */}
          <p className="text-sm font-mono text-gray-800 break-all">
            {expanded ? item.prompt_raw : item.prompt_raw.slice(0, 120) + (item.prompt_raw.length > 120 ? '…' : '')}
          </p>
          {item.prompt_safe && item.prompt_safe !== item.prompt_raw && (
            <p className="text-xs text-gray-400 mt-0.5 font-mono">
              → {item.prompt_safe.slice(0, 100)}
            </p>
          )}

          {/* Flags */}
          {item.flags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {item.flags.slice(0, expanded ? 999 : 5).map((f, i) => (
                <span key={i} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                  {f}
                </span>
              ))}
              {!expanded && item.flags.length > 5 && (
                <button onClick={() => setExpanded(true)}
                  className="text-xs text-violet-500 underline">
                  +{item.flags.length - 5} more
                </button>
              )}
            </div>
          )}

          {/* Session & image links */}
          <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
            {item.session_id && <span>session: {item.session_id.slice(0, 12)}…</span>}
            {item.page_number && <span>page {item.page_number}</span>}
            {item.image_url && (
              <a href={item.image_url} target="_blank" rel="noreferrer"
                className="text-violet-500 underline">view image ↗</a>
            )}
          </div>
        </div>
      </div>

      {/* Review buttons */}
      {!item.reviewed && !item.review_verdict && (
        <div className="flex gap-2 mt-2">
          <button onClick={() => submit('ok')} disabled={submitting}
            className="flex-1 text-xs bg-green-100 text-green-700 font-bold py-1.5 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50">
            ✓ OK — safe
          </button>
          <button onClick={() => submit('false_positive')} disabled={submitting}
            className="flex-1 text-xs bg-yellow-100 text-yellow-700 font-bold py-1.5 rounded-lg hover:bg-yellow-200 transition-colors disabled:opacity-50">
            ⚠ False positive
          </button>
          <button onClick={() => submit('escalate')} disabled={submitting}
            className="flex-1 text-xs bg-red-100 text-red-700 font-bold py-1.5 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50">
            🚨 Escalate
          </button>
        </div>
      )}
      {item.review_verdict && (
        <div className="mt-2 text-xs font-semibold text-gray-500">
          Reviewed: <span className="capitalize">{item.review_verdict.replace('_', ' ')}</span>
        </div>
      )}
    </div>
  )
}

// ── Sandbox ──────────────────────────────────────────────────────────────────
function FilterSandbox() {
  const [prompt, setPrompt] = useState('')
  const [age, setAge]       = useState('all')
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  const test = async () => {
    const r = await fetch('/api/v1/moderation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, ageProfile: age }),
    })
    const d = await r.json() as Record<string, unknown>
    setResult(d)
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Test prompt</label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
          placeholder="Enter a prompt to test the safety filter…"
        />
      </div>
      <div className="flex gap-2">
        <select value={age} onChange={e => setAge(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white">
          <option value="all">All ages</option>
          <option value="toddler">Toddler (2-4)</option>
          <option value="elementary">Elementary (5-7)</option>
          <option value="tween">Tween (8-11)</option>
        </select>
        <button onClick={test} disabled={!prompt.trim()}
          className="bg-violet-600 text-white font-bold px-4 py-1.5 rounded-lg text-sm hover:bg-violet-700 transition-colors disabled:opacity-50">
          Test filter
        </button>
      </div>
      {result && (
        <div className={`rounded-xl p-3 border text-sm font-mono ${
          (result as {blocked?: boolean}).blocked ? 'bg-red-50 border-red-200' :
          (result as {action?: string}).action === 'sanitize' ? 'bg-yellow-50 border-yellow-200' :
          'bg-green-50 border-green-200'
        }`}>
          <div className="flex gap-2 flex-wrap mb-2">
            <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${
              (result as {blocked?: boolean}).blocked ? 'bg-red-200 text-red-800' :
              (result as {action?: string}).action === 'sanitize' ? 'bg-yellow-200 text-yellow-800' :
              'bg-green-200 text-green-800'
            }`}>
              {(result as {action?: string}).action?.toUpperCase() ?? 'UNKNOWN'}
            </span>
            <span className="text-xs text-gray-500">risk: {(result as {riskScore?: number}).riskScore}</span>
            <span className="text-xs text-gray-500">nsfw: {(result as {nsfw_score?: number}).nsfw_score}</span>
            <span className="text-xs text-gray-500">semantic: {(result as {semanticScore?: number}).semanticScore}</span>
          </div>
          {!((result as {blocked?: boolean}).blocked) && (result as {promptSafe?: string}).promptSafe && (
            <p className="text-xs text-gray-700 mb-2">
              <strong>Safe prompt:</strong> {(result as {promptSafe?: string}).promptSafe?.slice(0, 200)}
            </p>
          )}
          {((result as {flags?: string[]}).flags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {((result as {flags?: string[]}).flags ?? []).map((f, i) => (
                <span key={i} className="text-xs bg-white/60 border border-gray-200 px-1.5 py-0.5 rounded">
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SafetyAdminPage() {
  const [tab,      setTab]      = useState<'queue' | 'escalated' | 'stats' | 'sessions' | 'sandbox' | 'changelog'>('queue')
  const [queue,    setQueue]    = useState<QueueItem[]>([])
  const [stats,    setStats]    = useState<Stats | null>(null)
  const [sessions, setSessions] = useState<AbuseSession[]>([])
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [filter,   setFilter]   = useState<'unreviewed' | 'escalated' | 'blocked' | 'all'>('unreviewed')

  const loadQueue = useCallback(async (f = filter) => {
    setLoading(true)
    const r = await fetch(`/api/admin/moderation?filter=${f}&limit=50`)
    if (r.ok) {
      const d = await r.json() as { items: QueueItem[]; total: number }
      setQueue(d.items ?? [])
      setTotal(d.total ?? 0)
    }
    setLoading(false)
  }, [filter])

  const loadStats = useCallback(async () => {
    const r = await fetch('/api/admin/moderation?view=stats')
    if (r.ok) setStats(await r.json() as Stats)
  }, [])

  const loadSessions = useCallback(async () => {
    const r = await fetch('/api/admin/moderation?view=sessions')
    if (r.ok) {
      const d = await r.json() as { sessions: AbuseSession[] }
      setSessions(d.sessions ?? [])
    }
  }, [])

  useEffect(() => {
    loadStats()
    if (tab === 'queue' || tab === 'escalated') loadQueue(tab === 'escalated' ? 'escalated' : filter)
    if (tab === 'sessions') loadSessions()
  }, [tab, filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleVerdict = async (logId: number, verdict: 'ok' | 'escalate' | 'false_positive') => {
    await fetch('/api/admin/moderation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logId, verdict }),
    })
    setQueue(prev => prev.map(i => i.id === logId ? { ...i, reviewed: true, review_verdict: verdict } : i))
  }

  const handleBulkVerdict = async (verdict: 'ok' | 'escalate' | 'false_positive') => {
    if (!selected.size) return
    const logIds = [...selected]
    await fetch('/api/admin/moderation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bulk: true, logIds, verdict }),
    })
    setQueue(prev => prev.map(i =>
      selected.has(i.id) ? { ...i, reviewed: true, review_verdict: verdict } : i
    ))
    setSelected(new Set())
  }

  const toggleSelect = (id: number, v: boolean) =>
    setSelected(prev => { const n = new Set(prev); if (v) { n.add(id) } else { n.delete(id) } return n })

  const selectAll = () => setSelected(new Set(queue.filter(i => !i.reviewed).map(i => i.id)))

  const tabs = [
    { id: 'queue',     label: `📋 Queue (${stats?.unreviewed ?? '…'})` },
    { id: 'escalated', label: `🚨 Escalated (${stats?.escalated ?? '…'})` },
    { id: 'stats',     label: '📊 Stats' },
    { id: 'sessions',  label: '🕵️ Abuse Sessions' },
    { id: 'sandbox',   label: '🧪 Sandbox' },
    { id: 'changelog', label: '📜 Changelog' },
  ] as const

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-red-700 text-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link href="/admin" className="text-red-300 hover:text-white text-sm">← Admin</Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">🛡️ Content Moderation Pipeline</h1>
            <p className="text-red-200 text-xs mt-0.5">
              Filter v1.3 · 6-stage pipeline · NSFW heuristics · session abuse tracker · Agentmail alerts
            </p>
          </div>
          <button onClick={() => { loadStats(); loadQueue() }}
            className="text-sm border border-red-500 px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors">
            ↻ Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto mt-3 flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                tab === t.id ? 'bg-white/20 text-white' : 'text-red-200 hover:text-white hover:bg-red-600'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-6 py-3 grid grid-cols-5 gap-4">
            {[
              { label: 'Total logs',   value: stats.total.toLocaleString(),       color: 'text-gray-800' },
              { label: 'Unreviewed',   value: stats.unreviewed.toLocaleString(),   color: 'text-orange-600' },
              { label: 'Blocked',      value: stats.blocked.toLocaleString(),      color: 'text-red-600' },
              { label: 'Escalated',    value: stats.escalated.toLocaleString(),    color: 'text-red-700' },
              { label: '7d block rate',value: `${stats.recent7d.count ? Math.round(stats.recent7d.block/stats.recent7d.count*100) : 0}%`, color: 'text-violet-700' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-6">

        {/* ── REVIEW QUEUE ─────────────────────────────────────────────── */}
        {(tab === 'queue' || tab === 'escalated') && (
          <div className="space-y-4">
            {/* Filter + bulk controls */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-1">
                {(['unreviewed', 'blocked', 'all'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                      filter === f ? 'bg-red-700 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}>
                    {f}
                  </button>
                ))}
              </div>
              {selected.size > 0 && (
                <div className="flex gap-2 ml-auto">
                  <span className="text-xs text-gray-500">{selected.size} selected</span>
                  {(['ok', 'false_positive', 'escalate'] as const).map(v => (
                    <button key={v} onClick={() => handleBulkVerdict(v)}
                      className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${
                        v === 'escalate' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                        v === 'ok' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                        'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                      }`}>
                      {v === 'false_positive' ? 'false positive' : v}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={selectAll} className="text-xs text-violet-600 underline ml-auto">
                Select all
              </button>
            </div>

            <p className="text-xs text-gray-500">{total} total items</p>

            {loading ? (
              <div className="text-center py-8 text-gray-400">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-red-500 rounded-full animate-spin mx-auto mb-2"/>
                Loading…
              </div>
            ) : queue.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <p className="text-3xl mb-2">✅</p>
                <p className="font-bold text-gray-700">Queue is empty</p>
                <p className="text-sm text-gray-400">No unreviewed moderation flags.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {queue.map(item => (
                  <QueueRow key={item.id} item={item}
                    onVerdict={handleVerdict}
                    selected={selected.has(item.id)}
                    onSelect={toggleSelect} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STATS ──────────────────────────────────────────────────────── */}
        {tab === 'stats' && stats && (
          <div className="grid sm:grid-cols-2 gap-6">
            {/* 7-day overview */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 mb-3">Last 7 days</h2>
              <div className="space-y-2">
                {[
                  { label: 'Total prompts', value: stats.recent7d.count, pct: 100 },
                  { label: 'Allowed',   value: stats.recent7d.allow,    pct: stats.recent7d.count ? Math.round(stats.recent7d.allow/stats.recent7d.count*100) : 0, color: 'bg-green-500' },
                  { label: 'Sanitized', value: stats.recent7d.sanitize, pct: stats.recent7d.count ? Math.round(stats.recent7d.sanitize/stats.recent7d.count*100) : 0, color: 'bg-yellow-500' },
                  { label: 'Blocked',   value: stats.recent7d.block,    pct: stats.recent7d.count ? Math.round(stats.recent7d.block/stats.recent7d.count*100) : 0, color: 'bg-red-500' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-20">{s.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${s.color ?? 'bg-gray-300'}`} style={{ width: `${s.pct}%` }}/>
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-8 text-right">{s.value}</span>
                    <span className="text-xs text-gray-400 w-8">{s.pct}%</span>
                  </div>
                ))}
                <p className="text-xs text-gray-400 mt-2">Avg risk score: {stats.recent7d.avgRisk}</p>
              </div>
            </div>

            {/* Top flag categories */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 mb-3">Top flag categories (7d)</h2>
              {stats.topFlags.length === 0 ? (
                <p className="text-sm text-gray-400">No flags yet</p>
              ) : (
                <div className="space-y-2">
                  {stats.topFlags.map(f => (
                    <div key={f.cat} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-700 flex-1">{f.cat}</span>
                      <div className="w-24 bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-red-400" style={{ width: `${Math.min((f.count / (stats.topFlags[0]?.count || 1)) * 100, 100)}%` }}/>
                      </div>
                      <span className="text-xs font-bold text-gray-600 w-6 text-right">{f.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* NSFW heuristics explanation */}
            <div className="sm:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 mb-3">NSFW Heuristics (v1.3)</h2>
              <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <p className="font-semibold text-gray-800 mb-2">Text-level (prompt scan)</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Hard block list (80+ terms) → score = 100</li>
                    <li>• PII regex (phone/email/address) → block</li>
                    <li>• Semantic combinations (grooming, violence combos) → block/flag</li>
                    <li>• Age-adaptive: toddler blocks skeleton/spider/fire etc</li>
                    <li>• Soft flags: trademark, mild scary, age-ambiguous</li>
                    <li>• L33tspeak decoder before all checks</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 mb-2">Image-level (post-generation)</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Pollinations X-Has-Warning header (+60 score)</li>
                    <li>• Safety suffix presence in URL (+20 if missing)</li>
                    <li>• Content-type mismatch (+30)</li>
                    <li>• Image size heuristic (too small = +10)</li>
                    <li>• Canvas pixel sampling: warm-pixel ratio &gt;35% (+40)</li>
                    <li>• Low white-pixel ratio &lt;30% (not line art) (+20)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SESSION ABUSE ──────────────────────────────────────────────── */}
        {tab === 'sessions' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Per-session block/flag counts. Sessions with abuse_level ≥ high trigger Agentmail alert.
            </p>
            {sessions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <p className="text-2xl mb-2">🟢</p>
                <p className="font-semibold text-gray-700">No abuse sessions detected</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Session', 'Attempts', 'Blocked', 'Sanitized', 'Max Risk', 'Level', 'Last seen'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(s => (
                      <tr key={s.session_id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-gray-700">{s.session_id.slice(0, 16)}…</td>
                        <td className="px-3 py-2 text-center">{s.total_attempts}</td>
                        <td className="px-3 py-2 text-center font-bold text-red-600">{s.blocked_count}</td>
                        <td className="px-3 py-2 text-center text-yellow-600">{s.sanitized_count}</td>
                        <td className="px-3 py-2 text-center">{s.max_risk_score}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full font-bold ${ABUSE_COLOR(s.abuse_level)}`}>
                            {s.abuse_level}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-400">{ts(s.last_seen_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── SANDBOX ────────────────────────────────────────────────────── */}
        {tab === 'sandbox' && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 mb-1">Live Filter Sandbox</h2>
              <p className="text-xs text-gray-500 mb-4">
                Test prompts against the v1.3 safety filter. Results are not logged.
              </p>
              <FilterSandbox />
            </div>
          </div>
        )}

        {/* ── CHANGELOG ─────────────────────────────────────────────────── */}
        {tab === 'changelog' && (
          <div className="max-w-3xl space-y-4">
            {[
              {
                version: 'v1.3', date: 'Apr 2026',
                changes: [
                  'Semantic combination scanner: detect harmful word pairs (grooming, violence combos)',
                  'Age-adaptive filtering: toddler/elementary profiles with extra blocks',
                  'L33tspeak decoder: normalises 4→a, 3→e, 0→o before scanning',
                  'Expanded hard block list: +30 terms (grooming, hate, self-harm)',
                  'NSFW heuristics: canvas pixel sampling (warm-pixel ratio), Pollinations header check',
                  'Session abuse tracker: moderation_sessions table, levels: none→low→medium→high→banned',
                  'Agentmail escalation alerts for grooming semantics and high-risk sessions',
                  'Post-generation image moderation: auto-delete from Storage if NSFW score ≥ 41',
                  'nsfw_score + semanticScore added to SafetyResult and moderation_logs',
                  'New moderation orchestration layer: src/lib/moderation.ts',
                ],
              },
              {
                version: 'v1.2', date: 'Mar 2026',
                changes: [
                  'Hero name sanitization: sanitizeHeroName()',
                  'Enhanced substitution map (12 term replacements)',
                  'Risk scoring (0–100) with calibrated weights per soft flag',
                  'moderation_logs table with fire-and-forget logging at session creation',
                  'Admin safety dashboard: 4-tab review queue + filter sandbox',
                ],
              },
              {
                version: 'v1.1', date: 'Feb 2026',
                changes: [
                  'PII regex detector (phone, email, street address, SSN)',
                  'Real-person detection: blocks "realistic person", "celebrity", etc.',
                  'Free-text interest sanitization: sanitizeInterest()',
                ],
              },
              {
                version: 'v1.0', date: 'Feb 2026',
                changes: [
                  'Initial hard block list (50 terms): violence, adult, horror, hate, drugs, self-harm',
                  'Safe substitutions map: zombie→friendly ghost, sword→magic wand, etc.',
                  'SAFETY_SUFFIX enforcement on all prompts',
                  'Soft flag list (30 terms) with per-category risk scores',
                ],
              },
            ].map(v => (
              <div key={v.version} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-violet-100 text-violet-700 font-bold text-sm px-2.5 py-1 rounded-full">
                    {v.version}
                  </span>
                  <span className="text-sm text-gray-500">{v.date}</span>
                  {v.version === 'v1.3' && (
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <ul className="space-y-1">
                  {v.changes.map((c, i) => (
                    <li key={i} className="text-sm text-gray-600 flex gap-2">
                      <span className="text-violet-400 flex-shrink-0">•</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
