'use client'
import { useState, useEffect, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MicroTask {
  id: string
  task_type: string
  priority: number
  reward_cents: number
  status: string
  sla_hours: number
  expires_at: string
  claim_text: string
  claim_type: string
  confidence_band: string
  risk_flags: string[]
  assignments_count: number
  required_reviews: number
  completed_reviews: number
}

interface EvidenceSource {
  id: string
  doi?: string
  title: string
  authors?: string[]
  year?: number
  journal?: string
  study_type?: string
  abstract_snippet?: string
  oa_full_text_url?: string
  scite_support?: number
  scite_contrast?: number
  retracted?: boolean
}

interface RiskFlag {
  flag_type: string
  severity: string
  detail: string
  suggestion?: string
}

interface TaskDetail {
  task: MicroTask & { instructions?: string }
  claim: { text: string; claim_type: string; confidence_band: string; confidence_score: number } | null
  sources: EvidenceSource[]
  riskFlags: RiskFlag[]
  assignmentCount: number
  completedCount: number
}

interface ReviewerProfile {
  id: string
  display_name: string
  reviewer_tier: string
  tasks_completed: number
  total_earned_cents: number
  kappa_score: number | null
}

const VERDICT_OPTIONS = [
  { value: 'agree',     label: '✅ Agree',     desc: 'Evidence supports the claim',       color: 'border-emerald-600 bg-emerald-950/40 text-emerald-300' },
  { value: 'disagree',  label: '❌ Disagree',  desc: 'Evidence contradicts or is missing', color: 'border-red-600 bg-red-950/40 text-red-300' },
  { value: 'uncertain', label: '🤔 Uncertain', desc: 'Insufficient data to decide',       color: 'border-amber-600 bg-amber-950/40 text-amber-300' },
  { value: 'flag',      label: '🚩 Flag',      desc: 'Requires compliance/regulatory review', color: 'border-purple-600 bg-purple-950/40 text-purple-300' },
]

const TIER_STYLES: Record<string, string> = {
  trainee: 'text-gray-400 bg-gray-800',
  junior:  'text-blue-300 bg-blue-950/50',
  senior:  'text-emerald-300 bg-emerald-950/50',
  expert:  'text-amber-300 bg-amber-950/50',
}

const BAND_STYLES: Record<string, string> = {
  high:     'text-emerald-300 bg-emerald-950/40 border-emerald-700/40',
  moderate: 'text-amber-300 bg-amber-950/40 border-amber-700/40',
  low:      'text-red-300 bg-red-950/40 border-red-700/40',
  none:     'text-gray-400 bg-gray-800 border-gray-700',
}

// ── Mock reviewer session (in production: replace with Supabase Auth) ─────────
const MOCK_REVIEWER: ReviewerProfile = {
  id: 'demo-reviewer-id',
  display_name: 'Demo Reviewer',
  reviewer_tier: 'junior',
  tasks_completed: 7,
  total_earned_cents: 350,
  kappa_score: 0.72,
}

export default function ReviewerPage() {
  const [tab, setTab] = useState<'queue' | 'active' | 'profile'>('queue')
  const [queue, setQueue] = useState<MicroTask[]>([])
  const [queueStats, setQueueStats] = useState<Record<string, number>>({})
  const [activeTask, setActiveTask] = useState<TaskDetail | null>(null)
  const [loadingQueue, setLoadingQueue] = useState(false)
  const [loadingTask, setLoadingTask] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState<{ verdict: string; reward: number; badges: string[]; kappa: number | null } | null>(null)

  // Review form
  const [verdict, setVerdict] = useState('')
  const [confidence, setConfidence] = useState(0.7)
  const [notes, setNotes] = useState('')
  const [suggestedFix, setSuggestedFix] = useState('')
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set())
  const [startTime] = useState(Date.now())

  const reviewer = MOCK_REVIEWER

  const fetchQueue = useCallback(async () => {
    setLoadingQueue(true)
    try {
      const res = await fetch(`/api/marketplace/tasks?reviewer_id=${reviewer.id}`)
      const data = await res.json()
      setQueue(data.tasks || [])
      setQueueStats(data.queueStats || {})
    } finally {
      setLoadingQueue(false)
    }
  }, [reviewer.id])

  useEffect(() => { fetchQueue() }, [fetchQueue])

  async function pickUpTask(taskId: string) {
    setLoadingTask(true)
    try {
      // First mark as started
      await fetch(`/api/marketplace/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerId: reviewer.id, action: 'start' }),
      })
      // Fetch full detail
      const res = await fetch(`/api/marketplace/tasks/${taskId}`)
      const data = await res.json()
      setActiveTask(data)
      setTab('active')
      setVerdict('')
      setConfidence(0.7)
      setNotes('')
      setSuggestedFix('')
      setSelectedSources(new Set())
    } finally {
      setLoadingTask(false)
    }
  }

  async function submitReview() {
    if (!activeTask || !verdict) return
    setSubmitting(true)
    try {
      const timeSpent = Math.round((Date.now() - startTime) / 1000)
      const res = await fetch(`/api/marketplace/tasks/${activeTask.task.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewerId: reviewer.id,
          verdict,
          confidence,
          notes: notes || undefined,
          suggestedFix: suggestedFix || undefined,
          evidenceUsed: Array.from(selectedSources),
          timeSpentSec: timeSpent,
        }),
      })
      const data = await res.json()
      setLastResult({
        verdict,
        reward: data.rewardCents || 0,
        badges: data.badgesAwarded || [],
        kappa: data.kappa?.kappa || null,
      })
      setActiveTask(null)
      setTab('queue')
      await fetchQueue()
    } finally {
      setSubmitting(false)
    }
  }

  function hoursUntilExpiry(expiresAt: string): string {
    const hrs = (new Date(expiresAt).getTime() - Date.now()) / 3600000
    if (hrs < 1) return `${Math.round(hrs * 60)}min`
    return `${Math.round(hrs)}h`
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Reviewer Marketplace</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Evidence review · Claim verification · Compliance checks
          </p>
        </div>
        {/* Reviewer mini-profile */}
        <div className="flex items-center gap-3 border border-gray-800 rounded-lg px-3 py-2">
          <div>
            <div className="text-xs font-semibold text-white">{reviewer.display_name}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-xs px-1.5 py-0.5 rounded ${TIER_STYLES[reviewer.reviewer_tier]}`}>
                {reviewer.reviewer_tier}
              </span>
              <span className="text-xs text-gray-500">{reviewer.tasks_completed} tasks</span>
              {reviewer.kappa_score && (
                <span className="text-xs text-blue-400">κ={reviewer.kappa_score.toFixed(2)}</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-emerald-400 font-semibold">
              ${(reviewer.total_earned_cents / 100).toFixed(2)}
            </div>
            <div className="text-xs text-gray-600">earned</div>
          </div>
        </div>
      </div>

      {/* Last result banner */}
      {lastResult && (
        <div className="rounded-lg border border-emerald-700/40 bg-emerald-950/30 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 text-lg">✓</span>
            <div>
              <div className="text-sm text-emerald-300 font-medium">
                Review submitted — verdict: <strong>{lastResult.verdict}</strong>
              </div>
              <div className="text-xs text-emerald-500 mt-0.5">
                Earned ${(lastResult.reward / 100).toFixed(2)}
                {lastResult.kappa !== null && ` · Agreement score: ${(lastResult.kappa * 100).toFixed(0)}%`}
                {lastResult.badges.length > 0 && ` · 🏅 Badge${lastResult.badges.length > 1 ? 's' : ''} earned: ${lastResult.badges.join(', ')}`}
              </div>
            </div>
          </div>
          <button onClick={() => setLastResult(null)} className="text-emerald-600 hover:text-emerald-400 text-xs">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1">
        {(['queue', 'active', 'profile'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              tab === t ? 'border-blue-600 bg-blue-950/50 text-blue-300' : 'border-gray-700 text-gray-500 hover:border-gray-600'
            }`}>
            {t === 'queue' && `Queue ${queueStats.open ? `(${queueStats.open} open)` : ''}`}
            {t === 'active' && (activeTask ? '📋 Active Review' : 'Active Review')}
            {t === 'profile' && 'My Profile'}
          </button>
        ))}
      </div>

      {/* ── QUEUE TAB ── */}
      {tab === 'queue' && (
        <div className="space-y-3">
          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Open', count: queueStats.open || 0, color: 'text-blue-400' },
              { label: 'In Review', count: queueStats.in_review || 0, color: 'text-amber-400' },
              { label: 'Completed', count: queueStats.completed || 0, color: 'text-emerald-400' },
              { label: 'Expired', count: queueStats.expired || 0, color: 'text-gray-500' },
            ].map(({ label, count, color }) => (
              <div key={label} className="border border-gray-800 rounded-lg p-2.5 text-center">
                <div className={`text-xl font-bold ${color}`}>{count}</div>
                <div className="text-xs text-gray-600">{label}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">{queue.length} tasks available for you</div>
            <button onClick={fetchQueue} disabled={loadingQueue}
              className="text-xs text-gray-500 hover:text-gray-300">
              {loadingQueue ? '⟳ Loading…' : '⟳ Refresh'}
            </button>
          </div>

          {queue.length === 0 && !loadingQueue && (
            <div className="border border-dashed border-gray-800 rounded-xl p-12 text-center">
              <div className="text-3xl mb-2">🔍</div>
              <div className="text-sm text-gray-400">No open tasks right now</div>
              <div className="text-xs text-gray-600 mt-1">Check back soon — new claims are added as documents are processed</div>
            </div>
          )}

          {queue.map(task => (
            <div key={task.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-semibold text-blue-400">{task.task_type.replace('_', ' ')}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${BAND_STYLES[task.confidence_band] || BAND_STYLES.none}`}>
                      {task.confidence_band || 'unscored'}
                    </span>
                    <span className="text-xs text-gray-500">{task.claim_type}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      task.priority <= 2 ? 'text-red-300 bg-red-950/30' :
                      task.priority <= 5 ? 'text-amber-300 bg-amber-950/30' : 'text-gray-500'
                    }`}>
                      P{task.priority}
                    </span>
                    <span className="text-xs text-gray-500">
                      ⏱ {hoursUntilExpiry(task.expires_at)} left
                    </span>
                    {task.risk_flags?.length > 0 && (
                      <span className="text-xs text-red-400">⚑ {task.risk_flags.length} flag{task.risk_flags.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed line-clamp-2">{task.claim_text}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                    <span>{task.completed_reviews}/{task.required_reviews} reviews done</span>
                    <span>SLA: {task.sla_hours}h</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="text-sm font-semibold text-emerald-400">
                    ${(task.reward_cents / 100).toFixed(2)}
                  </div>
                  <button
                    onClick={() => pickUpTask(task.id)}
                    disabled={loadingTask}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg text-xs font-medium transition-colors">
                    {loadingTask ? '…' : 'Pick Up →'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ACTIVE REVIEW TAB ── */}
      {tab === 'active' && (
        <div>
          {!activeTask ? (
            <div className="border border-dashed border-gray-800 rounded-xl p-12 text-center">
              <div className="text-3xl mb-2">📋</div>
              <div className="text-sm text-gray-400">No active review</div>
              <button onClick={() => setTab('queue')} className="mt-3 text-xs text-blue-400">← Browse queue</button>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-4">
              {/* Left: claim + evidence */}
              <div className="col-span-3 space-y-3">
                {/* Claim context */}
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-semibold text-blue-400">
                      {activeTask.task.task_type.replace('_', ' ')}
                    </span>
                    {activeTask.claim?.confidence_band && (
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${BAND_STYLES[activeTask.claim.confidence_band] || BAND_STYLES.none}`}>
                        {activeTask.claim.confidence_band}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">{activeTask.claim?.claim_type || activeTask.task.claim_type}</span>
                    <span className="ml-auto text-xs text-emerald-400 font-semibold">${(activeTask.task.reward_cents / 100).toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-white leading-relaxed">
                    {activeTask.claim?.text || activeTask.task.claim_text}
                  </p>
                  {activeTask.task.instructions && (
                    <p className="text-xs text-gray-500 mt-2 border-t border-gray-800 pt-2">
                      📌 {activeTask.task.instructions}
                    </p>
                  )}
                </div>

                {/* Risk flags */}
                {activeTask.riskFlags.length > 0 && (
                  <div className="rounded-xl border border-amber-700/30 bg-amber-950/20 p-4 space-y-2">
                    <div className="text-xs font-semibold text-amber-300 mb-2">⚑ Pre-flagged Risk Signals</div>
                    {activeTask.riskFlags.map((f, i) => (
                      <div key={i} className="text-xs">
                        <span className={`font-medium ${f.severity === 'critical' ? 'text-red-400' : f.severity === 'error' ? 'text-orange-400' : 'text-amber-400'}`}>
                          [{f.severity.toUpperCase()}] {f.flag_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-gray-500"> — {f.detail}</span>
                        {f.suggestion && <p className="text-gray-600 mt-0.5 pl-2">💡 {f.suggestion}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Evidence sources */}
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                  <div className="text-xs font-semibold text-gray-400 mb-3">
                    Evidence Sources ({activeTask.sources.length})
                    <span className="text-gray-600 font-normal ml-1">— click to cite</span>
                  </div>
                  {activeTask.sources.length === 0 && (
                    <div className="text-xs text-gray-600 text-center py-4">No sources found for this claim</div>
                  )}
                  <div className="space-y-2">
                    {activeTask.sources.map(s => (
                      <div key={s.id}
                        onClick={() => setSelectedSources(prev => {
                          const next = new Set(prev)
                          next.has(s.id) ? next.delete(s.id) : next.add(s.id)
                          return next
                        })}
                        className={`rounded-lg border p-3 cursor-pointer transition-all text-xs ${
                          selectedSources.has(s.id)
                            ? 'border-blue-600/60 bg-blue-950/20'
                            : s.retracted ? 'border-red-700/40 bg-red-950/10' : 'border-gray-800 bg-gray-800/40 hover:border-gray-700'
                        }`}>
                        <div className="flex items-start gap-2">
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                            selectedSources.has(s.id) ? 'border-blue-500 bg-blue-600' : 'border-gray-700'
                          }`}>
                            {selectedSources.has(s.id) && <span className="text-white text-xs">✓</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium leading-snug line-clamp-1 ${s.retracted ? 'text-red-300' : 'text-gray-200'}`}>
                              {s.retracted && '⚠ RETRACTED — '}{s.title}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 text-gray-500 flex-wrap">
                              <span>{s.authors?.[0]?.split(',')[0] || 'Unknown'} et al.</span>
                              {s.year && <span>· {s.year}</span>}
                              {s.journal && <span className="truncate max-w-[120px]">· {s.journal}</span>}
                              {s.study_type && <span className="text-blue-500">· {s.study_type.replace('_', ' ')}</span>}
                              {(s.scite_support || s.scite_contrast) && (
                                <span className="text-gray-600">· Scite: {s.scite_support}↑{s.scite_contrast}↓</span>
                              )}
                              {s.oa_full_text_url && (
                                <a href={s.oa_full_text_url} target="_blank" rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="text-blue-400 hover:text-blue-300 ml-auto">OA ↗</a>
                              )}
                            </div>
                            {s.abstract_snippet && (
                              <p className="text-gray-600 mt-1 line-clamp-2">{s.abstract_snippet}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: review form */}
              <div className="col-span-2 space-y-3">
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 sticky top-20">
                  <div className="text-sm font-semibold text-white mb-4">Submit Your Review</div>

                  {/* Verdict */}
                  <div className="space-y-2 mb-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Verdict *</div>
                    {VERDICT_OPTIONS.map(opt => (
                      <label key={opt.value}
                        className={`flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer transition-all ${
                          verdict === opt.value ? opt.color : 'border-gray-800 hover:border-gray-700'
                        }`}>
                        <input type="radio" name="verdict" value={opt.value}
                          checked={verdict === opt.value}
                          onChange={() => setVerdict(opt.value)}
                          className="mt-0.5 accent-blue-500" />
                        <div>
                          <div className="text-xs font-medium text-white">{opt.label}</div>
                          <div className="text-xs text-gray-500">{opt.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Confidence */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="text-xs text-gray-500 uppercase tracking-wider">Your Confidence</div>
                      <div className="text-xs font-semibold text-white">{(confidence * 100).toFixed(0)}%</div>
                    </div>
                    <input type="range" min="0" max="1" step="0.05"
                      value={confidence}
                      onChange={e => setConfidence(parseFloat(e.target.value))}
                      className="w-full accent-blue-500" />
                    <div className="flex justify-between text-xs text-gray-700 mt-0.5">
                      <span>Uncertain</span><span>Certain</span>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mb-3">
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Notes (optional)</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                      placeholder="Explain your reasoning, note specific concerns…"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-blue-600 resize-none" />
                  </div>

                  {/* Suggested fix */}
                  {(verdict === 'disagree' || verdict === 'flag') && (
                    <div className="mb-3">
                      <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Suggested Fix</label>
                      <textarea value={suggestedFix} onChange={e => setSuggestedFix(e.target.value)} rows={2}
                        placeholder="How should this claim be revised?"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-blue-600 resize-none" />
                    </div>
                  )}

                  {/* Evidence cited */}
                  {selectedSources.size > 0 && (
                    <div className="mb-3 text-xs text-blue-400">
                      {selectedSources.size} source{selectedSources.size !== 1 ? 's' : ''} cited
                    </div>
                  )}

                  <button onClick={submitReview}
                    disabled={!verdict || submitting}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors">
                    {submitting ? '⟳ Submitting…' : 'Submit Review →'}
                  </button>

                  <div className="mt-2 text-xs text-gray-600 text-center">
                    Reward: ${(activeTask.task.reward_cents / 100).toFixed(2)} · Expires in {hoursUntilExpiry(activeTask.task.expires_at)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PROFILE TAB ── */}
      {tab === 'profile' && (
        <ReviewerProfilePanel reviewer={reviewer} />
      )}
    </div>
  )
}

// ── Reviewer Profile Panel ────────────────────────────────────────────────────

function ReviewerProfilePanel({ reviewer }: { reviewer: ReviewerProfile }) {
  const [badges, setBadges] = useState<Array<{ slug: string; name: string; icon: string; tier: string; awardedAt: string }>>([])
  const [pending, setPending] = useState<{ pendingCents: number; pendingCount: number }>({ pendingCents: 0, pendingCount: 0 })
  const [loading, setLoading] = useState(true)
  const [requestingPayout, setRequestingPayout] = useState(false)
  const [payoutResult, setPayoutResult] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/marketplace/reviewers?id=${reviewer.id}`).then(r => r.json()),
      fetch(`/api/marketplace/payouts?reviewer_id=${reviewer.id}`).then(r => r.json()),
    ]).then(([profile, payoutData]) => {
      setBadges(profile.badges || [])
      setPending({ pendingCents: payoutData.pendingCents || 0, pendingCount: payoutData.pendingCount || 0 })
    }).finally(() => setLoading(false))
  }, [reviewer.id])

  async function requestPayout() {
    setRequestingPayout(true)
    try {
      const res = await fetch('/api/marketplace/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerId: reviewer.id, method: 'manual' }),
      })
      const data = await res.json()
      if (data.payoutId) {
        setPayoutResult(`✅ Payout request created (ref: ${data.manualRef}). We'll process within 5 business days.`)
        setPending({ pendingCents: 0, pendingCount: 0 })
      } else {
        setPayoutResult(`❌ ${data.error}`)
      }
    } finally {
      setRequestingPayout(false)
    }
  }

  const TIER_PROGRESS: Record<string, { next: string; needed: number }> = {
    trainee: { next: 'junior', needed: 10 },
    junior:  { next: 'senior', needed: 50 },
    senior:  { next: 'expert', needed: 100 },
    expert:  { next: 'expert', needed: 100 },
  }
  const tierInfo = TIER_PROGRESS[reviewer.reviewer_tier] || TIER_PROGRESS.trainee
  const progress = Math.min((reviewer.tasks_completed / tierInfo.needed) * 100, 100)

  const BADGE_TIER_COLOR: Record<string, string> = {
    bronze:   'border-orange-700/40 bg-orange-950/20 text-orange-300',
    silver:   'border-gray-500/40 bg-gray-800/40 text-gray-300',
    gold:     'border-amber-600/40 bg-amber-950/20 text-amber-300',
    platinum: 'border-blue-600/40 bg-blue-950/20 text-blue-300',
  }

  if (loading) return <div className="text-xs text-gray-600 p-4">Loading profile…</div>

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-base font-bold text-white">{reviewer.display_name}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${TIER_STYLES[reviewer.reviewer_tier]}`}>
                {reviewer.reviewer_tier}
              </span>
              {reviewer.kappa_score && (
                <span className={`text-xs px-1.5 py-0.5 rounded border ${
                  reviewer.kappa_score >= 0.85 ? 'border-amber-600/40 text-amber-300' :
                  reviewer.kappa_score >= 0.75 ? 'border-emerald-700/40 text-emerald-300' :
                  reviewer.kappa_score >= 0.60 ? 'border-blue-700/40 text-blue-300' : 'border-gray-700 text-gray-500'
                }`}>
                  κ = {reviewer.kappa_score.toFixed(2)}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-emerald-400">${(reviewer.total_earned_cents / 100).toFixed(2)}</div>
            <div className="text-xs text-gray-600">total earned</div>
          </div>
        </div>

        {/* Tier progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{reviewer.tasks_completed} / {tierInfo.needed} tasks to {tierInfo.next}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full">
            <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Payout section */}
        {pending.pendingCents > 0 && (
          <div className="rounded-lg border border-emerald-700/30 bg-emerald-950/20 p-3 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-emerald-300">
                  ${(pending.pendingCents / 100).toFixed(2)} pending
                </div>
                <div className="text-xs text-gray-500">{pending.pendingCount} reviews awaiting payout</div>
              </div>
              <button onClick={requestPayout} disabled={requestingPayout}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white rounded-lg text-xs font-medium">
                {requestingPayout ? '…' : 'Request Payout'}
              </button>
            </div>
          </div>
        )}

        {payoutResult && (
          <div className="text-xs text-gray-400 bg-gray-800 rounded-lg p-2.5 mb-3">{payoutResult}</div>
        )}
      </div>

      {/* Badges */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="text-sm font-semibold text-white mb-3">Badges ({badges.length})</div>
        {badges.length === 0 ? (
          <div className="text-xs text-gray-600 text-center py-4">
            Complete your first review to earn your first badge!
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {badges.map(b => (
              <div key={b.slug} className={`rounded-lg border p-2.5 ${BADGE_TIER_COLOR[b.tier] || BADGE_TIER_COLOR.bronze}`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{b.icon}</span>
                  <div>
                    <div className="text-xs font-semibold">{b.name}</div>
                    <div className="text-xs opacity-70 capitalize">{b.tier}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
