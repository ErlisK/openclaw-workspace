'use client'

/**
 * /admin/safety — Content Moderation & Prompt Safety Dashboard
 *
 * Shows:
 * - Filter stats (total prompts, block rate, sanitize rate)
 * - Unreviewed flags queue (needs human review)
 * - Top flagged terms (bar chart)
 * - Recent blocks / sanitizations table with review actions
 * - Filter version changelog
 * - Test sandbox: run any prompt through the safety filter live
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ModerationSummary {
  total: number
  allow: number
  sanitize: number
  block: number
  blockRate: number
  sanitizeRate: number
  unreviewedFlags: number
}

interface TopFlag { term: string; count: number }

interface ModerationLog {
  id: number
  session_id: string | null
  page_number: number | null
  prompt_raw: string
  prompt_safe: string | null
  flags: string[]
  action: string
  risk_score: number
  filter_version: string
  reviewed: boolean
  review_verdict: string | null
  created_at: string
  image_url: string | null
}

interface ModerationData {
  ok: boolean
  summary: ModerationSummary
  topFlags: TopFlag[]
  logs: ModerationLog[]
  generatedAt: string
}

// ── Filter version changelog ───────────────────────────────────────────────
const FILTER_CHANGELOG = [
  {
    version: 'v1.2', date: '2026-04-04', status: 'current',
    changes: [
      'Added hero name sanitization (story mode)',
      'Enhanced substitution map: 12 fantasy-safe swaps',
      'PII pattern detection (phone, email, address)',
      'Risk score calibration: soft flags 5–30 pts, hard block = 100',
      'Free-text interest sanitization (prompt_ui_v1 variant B)',
    ],
    stats: { blockRate: 0, sanitizeRate: 3.2, flaggedTerms: 50 },
  },
  {
    version: 'v1.1', date: '2026-03-28', status: 'retired',
    changes: [
      'Added PII patterns, real-person detection',
      'Added trademark terms (Mickey Mouse, Peppa Pig, etc.)',
      '8 new soft-flag categories',
    ],
    stats: { blockRate: 0.2, sanitizeRate: 2.1, flaggedTerms: 38 },
  },
  {
    version: 'v1.0', date: '2026-03-15', status: 'retired',
    changes: [
      'Initial blocklist (50 terms)',
      'Basic hard-block on adult/violence content',
      'SAFETY_SUFFIX enforcement on all prompts',
    ],
    stats: { blockRate: 0, sanitizeRate: 0, flaggedTerms: 50 },
  },
]

// ── Action badge ──────────────────────────────────────────────────────────────
function ActionBadge({ action }: { action: string }) {
  const cls = action === 'block'    ? 'bg-red-100 text-red-700' :
              action === 'sanitize' ? 'bg-amber-100 text-amber-700' :
                                      'bg-green-100 text-green-700'
  return <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${cls}`}>{action}</span>
}

// ── Live sandbox ──────────────────────────────────────────────────────────────
interface SandboxResult {
  safe?: boolean; blocked?: boolean; action?: string;
  promptSafe?: string; flags?: string[]; riskScore?: number;
}
function SafetySandbox() {
  const [input, setInput]     = useState('')
  const [result, setResult]   = useState<SandboxResult | null>(null)
  const [loading, setLoading] = useState(false)

  const test = async () => {
    if (!input.trim()) return
    setLoading(true)
    const r = await fetch('/api/v1/moderation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: input, sessionId: 'admin_sandbox' }),
    })
    setResult(await r.json() as SandboxResult)
    setLoading(false)
  }

  const EXAMPLES = [
    'cute dinosaur playing in the forest',
    'friendly witch riding a broomstick',
    'vampire in a scary castle',
    'Peppa Pig having a tea party',
    'zombie apocalypse scene',
    'robot and space explorer on the moon',
  ]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <h2 className="font-bold text-gray-800">🧪 Live Filter Sandbox</h2>
      <p className="text-xs text-gray-500">
        Test any prompt against the v1.2 filter to see what action is taken.
        Results are logged to moderation_logs with session_id=&apos;admin_sandbox&apos;.
      </p>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && test()}
          placeholder="Type a prompt to test…"
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
        />
        <button onClick={test} disabled={loading || !input.trim()}
          className="bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-violet-700 disabled:opacity-50 transition-colors">
          {loading ? '…' : 'Test'}
        </button>
      </div>

      {/* Example prompts */}
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map(ex => (
          <button key={ex} onClick={() => setInput(ex)}
            className="text-xs bg-gray-100 hover:bg-violet-100 text-gray-600 hover:text-violet-700
                       px-2 py-1 rounded-lg transition-colors">
            {ex}
          </button>
        ))}
      </div>

      {result && (
        <div className={`rounded-xl p-4 border text-sm space-y-2 ${
          result.blocked ? 'bg-red-50 border-red-200' :
          result.action === 'sanitize' ? 'bg-amber-50 border-amber-100' :
          'bg-green-50 border-green-100'
        }`}>
          <div className="flex items-center gap-2">
            <ActionBadge action={result.action ?? 'allow'} />
            <span className="font-semibold text-gray-800">
              {result.blocked ? '🚫 BLOCKED' :
               result.action === 'sanitize' ? '✏️ Sanitized' : '✅ Allowed'}
            </span>
            {result.riskScore !== undefined && (
              <span className="ml-auto text-xs text-gray-500">
                Risk score: <strong>{result.riskScore}</strong>/100
              </span>
            )}
          </div>
          {result.promptSafe && !result.blocked && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Safe prompt:</p>
              <p className="text-xs bg-white rounded-lg p-2 border font-mono break-all">
                {String(result.promptSafe)}
              </p>
            </div>
          )}
          {Array.isArray(result.flags) && result.flags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {(result.flags as string[]).map(f => (
                <span key={f} className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded font-mono">
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

// ── Main component ────────────────────────────────────────────────────────────
export default function SafetyAdminPage() {
  const [data, setData]         = useState<ModerationData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<'all' | 'block' | 'sanitize' | 'unreviewed'>('unreviewed')
  const [activeTab, setActiveTab] = useState<'queue' | 'stats' | 'changelog' | 'sandbox'>('queue')

  const load = useCallback(async (action?: string) => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '200' })
    if (action && action !== 'all') {
      if (action === 'unreviewed') params.set('unreviewed', 'true')
      else params.set('action', action)
    }
    const res = await fetch(`/api/v1/moderation?${params}`)
    const d   = await res.json() as ModerationData
    setData(d)
    setLoading(false)
  }, [])

  useEffect(() => { load(filter) }, [load, filter])

  // Mark as reviewed
  const markReviewed = async (id: number, verdict: 'ok' | 'escalate' | 'false_positive') => {
    await fetch('/api/v1/moderation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _reviewId: id, verdict }),
    }).catch(() => {})
    // Optimistic update
    setData(prev => prev ? {
      ...prev,
      logs: prev.logs.map(l => l.id === id
        ? { ...l, reviewed: true, review_verdict: verdict }
        : l),
    } : prev)
  }

  const s = data?.summary
  const maxFlag = Math.max(...(data?.topFlags ?? []).map(f => f.count), 1)

  const tabs = [
    { id: 'queue',     label: '🚩 Review Queue' },
    { id: 'stats',     label: '📊 Stats & Flags' },
    { id: 'changelog', label: '📋 Filter History' },
    { id: 'sandbox',   label: '🧪 Sandbox' },
  ] as const

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-red-700 text-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/admin" className="text-red-300 hover:text-white text-sm">← Admin</Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">🛡️ Content Safety & Moderation</h1>
            <p className="text-red-200 text-xs mt-0.5">
              Filter v1.2 · COPPA-compliant · Hard block + sanitize pipeline · Human review queue
            </p>
          </div>
          {s?.unreviewedFlags !== undefined && s.unreviewedFlags > 0 && (
            <div className="bg-white text-red-700 text-sm font-extrabold px-3 py-1.5 rounded-xl">
              ⚠️ {s.unreviewedFlags} unreviewed
            </div>
          )}
          <button onClick={() => load(filter)}
            className="text-sm border border-red-500 px-3 py-1.5 rounded-lg hover:bg-red-600">
            ↻ Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto mt-3 flex gap-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === t.id
                  ? 'bg-white text-red-700'
                  : 'text-red-200 hover:text-white hover:bg-red-600'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total prompts logged', value: s?.total ?? 0, sub: 'all time', color: 'text-gray-700' },
            { label: 'Block rate',   value: `${s?.blockRate ?? 0}%`,    sub: `${s?.block ?? 0} blocked`, color: 'text-red-600' },
            { label: 'Sanitize rate', value: `${s?.sanitizeRate ?? 0}%`, sub: `${s?.sanitize ?? 0} sanitized`, color: 'text-amber-600' },
            { label: 'Unreviewed flags', value: s?.unreviewedFlags ?? 0, sub: 'need review', color: s?.unreviewedFlags ? 'text-red-600' : 'text-green-600' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className={`text-2xl font-extrabold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
              <p className="text-xs text-gray-400">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* ── REVIEW QUEUE TAB ──────────────────────────────────────────── */}
        {activeTab === 'queue' && (
          <div className="space-y-4">
            {/* Filter buttons */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex gap-2 flex-wrap">
                {(['unreviewed', 'block', 'sanitize', 'all'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                      filter === f ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {f === 'unreviewed' ? '🚩 Unreviewed' :
                     f === 'block'     ? '🚫 Blocks' :
                     f === 'sanitize'  ? '✏️ Sanitized' : '📋 All'}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-400">
                <div className="w-8 h-8 border-2 border-gray-200 border-t-red-500 rounded-full animate-spin mx-auto mb-3"/>
                Loading moderation queue…
              </div>
            ) : data?.logs.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                <p className="text-3xl mb-2">✅</p>
                <p className="font-bold text-green-800">All clear — no items need review</p>
                <p className="text-green-600 text-sm mt-1">
                  {filter === 'unreviewed' ? 'No unreviewed flags.' : `No ${filter} entries.`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data?.logs.map(log => (
                  <div key={log.id}
                    className={`bg-white rounded-2xl border shadow-sm p-4 space-y-2 ${
                      log.action === 'block' ? 'border-red-200' :
                      log.action === 'sanitize' ? 'border-amber-200' : 'border-gray-100'
                    }`}>
                    <div className="flex items-start gap-3">
                      <ActionBadge action={log.action} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-gray-800 break-all line-clamp-2">
                          {log.prompt_raw}
                        </p>
                        {log.prompt_safe && log.action !== 'allow' && (
                          <p className="text-xs text-green-700 font-mono mt-1 break-all line-clamp-1">
                            → {log.prompt_safe.split(',')[0]}…
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right text-xs text-gray-400">
                        <div>Risk: {log.risk_score}/100</div>
                        <div>{log.filter_version}</div>
                        <div>{new Date(log.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>

                    {/* Flags */}
                    {log.flags?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {log.flags.map(f => (
                          <span key={f} className="text-xs bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded font-mono text-gray-600">
                            {f}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Review actions */}
                    {!log.reviewed && log.action !== 'allow' ? (
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => markReviewed(log.id, 'ok')}
                          className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded-lg font-semibold transition-colors">
                          ✅ OK — approve
                        </button>
                        <button onClick={() => markReviewed(log.id, 'false_positive')}
                          className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-lg font-semibold transition-colors">
                          🔵 False positive
                        </button>
                        <button onClick={() => markReviewed(log.id, 'escalate')}
                          className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded-lg font-semibold transition-colors">
                          🔴 Escalate
                        </button>
                      </div>
                    ) : log.reviewed && (
                      <div className="text-xs text-gray-400">
                        Reviewed: <span className="font-semibold">{log.review_verdict}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STATS & FLAGS TAB ────────────────────────────────────────────── */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            {/* Action distribution */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 mb-3">Prompt disposition</h2>
              <div className="flex h-6 rounded-xl overflow-hidden mb-2">
                <div className="bg-green-500" style={{ width: `${100 - (s?.blockRate ?? 0) - (s?.sanitizeRate ?? 0)}%` }}
                  title="Allowed"/>
                <div className="bg-amber-400" style={{ width: `${s?.sanitizeRate ?? 0}%` }} title="Sanitized"/>
                <div className="bg-red-500"   style={{ width: `${s?.blockRate ?? 0}%` }} title="Blocked"/>
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"/>Allowed ({s?.allow ?? 0})</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"/>Sanitized ({s?.sanitize ?? 0})</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"/>Blocked ({s?.block ?? 0})</span>
              </div>
            </div>

            {/* Top flagged terms */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 mb-3">Top flagged terms</h2>
              {data?.topFlags.length === 0 ? (
                <p className="text-sm text-gray-400">No flagged terms yet.</p>
              ) : (
                <div className="space-y-2">
                  {data?.topFlags.map(f => (
                    <div key={f.term} className="flex items-center gap-3">
                      <span className="text-sm font-mono text-gray-600 w-36 flex-shrink-0 truncate">{f.term}</span>
                      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full"
                          style={{ width: `${Math.round(f.count / maxFlag * 100)}%` }}/>
                      </div>
                      <span className="text-sm font-bold text-gray-700 w-6 text-right">{f.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* False positives / calibration */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
              <h3 className="font-bold text-amber-800 mb-2">⚖️ Filter calibration notes</h3>
              <div className="space-y-1 text-sm text-amber-700">
                <p>• <strong>witch / skeleton / ghost</strong>: Low risk score (5–10). OK for older kids (8+) — monitor for age context.</p>
                <p>• <strong>pokemon / minecraft</strong>: Trademark risk — substituted to generic terms. Verify output quality.</p>
                <p>• <strong>sword / bow</strong>: Fantasy context OK — substituted to &apos;magic wand&apos; only if risk score &gt;20.</p>
                <p>• <strong>zombie</strong>: Medium block (20 pts) — substituted to &apos;friendly ghost&apos;. Common kid theme, watch recall rate.</p>
                <p>• <strong>Review any &apos;escalate&apos;</strong> verdicts within 24h. No hard-blocks should go unreviewed &gt;72h.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── FILTER CHANGELOG TAB ─────────────────────────────────────────── */}
        {activeTab === 'changelog' && (
          <div className="space-y-4">
            {FILTER_CHANGELOG.map(v => (
              <div key={v.version}
                className={`bg-white rounded-2xl border shadow-sm p-5 ${
                  v.status === 'current' ? 'border-violet-200' : 'border-gray-100'
                }`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
                    v.status === 'current' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'
                  }`}>{v.version}</span>
                  <span className="text-sm text-gray-500">{v.date}</span>
                  {v.status === 'current' && (
                    <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                      ✅ ACTIVE
                    </span>
                  )}
                </div>
                <ul className="space-y-1 mb-3">
                  {v.changes.map(c => (
                    <li key={c} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-gray-400 flex-shrink-0">→</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
                <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-xl p-3 text-xs">
                  <div className="text-center">
                    <div className="font-bold text-red-600">{v.stats.blockRate}%</div>
                    <div className="text-gray-500">Block rate</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-amber-600">{v.stats.sanitizeRate}%</div>
                    <div className="text-gray-500">Sanitize rate</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-violet-600">{v.stats.flaggedTerms}</div>
                    <div className="text-gray-500">Terms in filter</div>
                  </div>
                </div>
              </div>
            ))}

            {/* Planned v1.3 */}
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-5 text-gray-400">
              <p className="font-bold mb-2">🔭 Planned: v1.3</p>
              <ul className="text-sm space-y-1">
                <li>→ Image-level moderation via Pollinations response headers</li>
                <li>→ Age-gated filter profiles (2–4 stricter than 8–11)</li>
                <li>→ ML-assisted scoring (if Replicate API key available)</li>
                <li>→ Async review webhook → Agentmail notification on escalation</li>
              </ul>
            </div>
          </div>
        )}

        {/* ── SANDBOX TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'sandbox' && <SafetySandbox />}

      </div>
    </div>
  )
}
