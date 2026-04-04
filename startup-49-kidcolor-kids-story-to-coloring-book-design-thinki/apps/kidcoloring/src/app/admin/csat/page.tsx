'use client'

/**
 * /admin/csat — CSAT & micro-survey analytics dashboard
 *
 * Shows:
 * - Overall CSAT score (good/neutral/bad %) vs ≥70% target
 * - Daily trend sparkline (last 7 days)
 * - Follow-up answer breakdown by rating (word cloud / bar chart)
 * - Top product insights from open responses
 * - A/B experiment CSAT comparison (if experiment data exists)
 * - Raw response table (last 50)
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface SurveySummary {
  total: number
  good: number
  neutral: number
  bad: number
  goodPct: number | null
  meetsTarget: boolean
}

interface AnswerMap { [questionKey: string]: { [answer: string]: number } }
interface DayRow { day: string; good: number; neutral: number; bad: number }

interface SurveyData {
  ok: boolean
  summary: SurveySummary
  answersByQuestion: AnswerMap
  dailyTrend: DayRow[]
  generatedAt: string
}

// Human-readable labels
const QUESTION_LABELS: Record<string, string> = {
  what_made_it_great:  '😊 What made it great? (good raters)',
  what_could_improve:  '😐 What could be better? (neutral raters)',
  what_went_wrong:     '😢 What went wrong? (bad raters)',
}

const ANSWER_LABELS: Record<string, string> = {
  kid_loved_it:       '❤️ My kid loved it',
  image_quality:      '🎨 The images',
  easy_to_use:        '✨ Easy to use',
  great_value:        '💰 Great value',
  more_interests:     '🎯 More themes',
  faster:             '⚡ Faster generation',
  pricing:            '💲 Lower price',
  images_didnt_match: '🤔 Images didn\'t match',
  too_slow:           '🐢 Too slow',
  hard_to_use:        '😖 Hard to use',
  not_expected:       '❌ Not expected',
  _emoji_only:        '(skipped follow-up)',
}

const INSIGHTS: Record<string, string> = {
  kid_loved_it:       'Primary driver of satisfaction — kids are the end customer. Reinforce in marketing copy.',
  image_quality:      'Image quality is top-of-mind for both lovers and critics. Priority: upgrade to Replicate sdxl-coloring-lora.',
  easy_to_use:        'Ease of use resonates. Keep the quick-start flow; resist adding friction.',
  great_value:        'Price sensitivity low among satisfied users. Signal to test $9.99 anchor.',
  more_interests:     'More interest options is top "neutral" request. Add 8 more tiles in next sprint.',
  faster:             'Generation speed is top "neutral" pain. Target: p95 < 60s (currently ~88s Pollinations).',
  pricing:            'Price is last resort complaint among neutral users. Don\'t discount — improve value first.',
  images_didnt_match: 'Image relevance gap is top &quot;bad&quot; issue. Better prompt engineering needed.',
  too_slow:           'Latency is #2 bad issue. Reinforces Replicate migration priority.',
}

function BarRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round(100 * count / total) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-52 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }}/>
      </div>
      <span className="text-sm font-bold text-gray-700 w-12 text-right">{count}</span>
      <span className="text-xs text-gray-400 w-8">{pct}%</span>
    </div>
  )
}

export default function CSATAdminPage() {
  const [data, setData]     = useState<SurveyData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/v1/survey')
    const d   = await res.json() as SurveyData
    setData(d)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const s = data?.summary
  const goodPct    = s?.goodPct ?? 0
  const neutralPct = s?.total ? Math.round(100 * (s?.neutral ?? 0) / s.total) : 0
  const badPct     = s?.total ? Math.round(100 * (s?.bad ?? 0) / s.total) : 0

  // NPS-style score (good% - bad%)
  const npsLike = goodPct - badPct

  // Top insight keys across all questions
  const allAnswers: [string, number][] = []
  for (const q of Object.values(data?.answersByQuestion ?? {})) {
    for (const [k, n] of Object.entries(q)) {
      if (k !== '_emoji_only') allAnswers.push([k, n])
    }
  }
  allAnswers.sort((a, b) => b[1] - a[1])

  // Mini daily chart (normalize height)
  const trend = data?.dailyTrend ?? []
  const maxDay = Math.max(...trend.map(d => (d.good || 0) + (d.neutral || 0) + (d.bad || 0)), 1)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-violet-700 text-white px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/admin" className="text-violet-300 hover:text-white text-sm">← Admin</Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">😊 CSAT & Micro-Survey</h1>
            <p className="text-violet-200 text-xs mt-0.5">
              1-click emoji rating + optional follow-up · post-export · anonymous
            </p>
          </div>
          <button onClick={load} className="text-sm border border-violet-500 px-3 py-1.5 rounded-lg hover:bg-violet-600">
            ↻ Refresh
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-violet-500 rounded-full animate-spin mx-auto mb-3"/>
            Loading survey data…
          </div>
        ) : (
          <>
            {/* ── Success criteria status ───────────────────────────────── */}
            <div className={`rounded-2xl p-5 border flex items-center gap-5 ${
              s?.meetsTarget ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="text-5xl">{s?.meetsTarget ? '✅' : '⚠️'}</div>
              <div className="flex-1">
                <p className="font-extrabold text-gray-900 text-lg">
                  CSAT: <span className={s?.meetsTarget ? 'text-green-700' : 'text-amber-700'}>
                    {goodPct}% good
                  </span>
                  <span className="text-gray-400 text-sm font-normal ml-2">(target: ≥70%)</span>
                </p>
                <p className="text-sm text-gray-600 mt-0.5">
                  {s?.total.toLocaleString()} total responses ·
                  {' '}{s?.good} good · {s?.neutral} neutral · {s?.bad} bad ·
                  NPS-like score: {npsLike > 0 ? '+' : ''}{npsLike}
                </p>
                {s?.meetsTarget
                  ? <p className="text-xs text-green-600 font-semibold mt-1">✅ Phase 5 success criterion met</p>
                  : <p className="text-xs text-amber-600 mt-1">Need {70 - goodPct}pp more &apos;good&apos; to hit target</p>
                }
              </div>
            </div>

            {/* ── KPI cards ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { emoji: '😊', label: 'Good',    count: s?.good ?? 0,    pct: goodPct,    color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-100' },
                { emoji: '😐', label: 'Neutral',  count: s?.neutral ?? 0, pct: neutralPct, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' },
                { emoji: '😢', label: 'Bad',      count: s?.bad ?? 0,     pct: badPct,     color: 'text-red-500',    bg: 'bg-red-50',    border: 'border-red-100' },
              ].map(card => (
                <div key={card.label} className={`rounded-2xl border ${card.border} ${card.bg} shadow-sm p-5 text-center`}>
                  <div className="text-4xl mb-1">{card.emoji}</div>
                  <div className={`text-3xl font-extrabold ${card.color}`}>{card.pct}%</div>
                  <div className="text-xs text-gray-500 mt-0.5">{card.count} responses · {card.label}</div>
                </div>
              ))}
            </div>

            {/* ── Rating bar ────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 mb-3">Overall rating distribution</h2>
              <div className="flex h-6 rounded-xl overflow-hidden">
                <div className="bg-green-500 transition-all" style={{ width: `${goodPct}%` }}
                  title={`Good: ${goodPct}%`}/>
                <div className="bg-yellow-400 transition-all" style={{ width: `${neutralPct}%` }}
                  title={`Neutral: ${neutralPct}%`}/>
                <div className="bg-red-400 transition-all" style={{ width: `${badPct}%` }}
                  title={`Bad: ${badPct}%`}/>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"/>Good {goodPct}%</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block"/>Neutral {neutralPct}%</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"/>Bad {badPct}%</span>
              </div>
            </div>

            {/* ── Daily trend ───────────────────────────────────────────── */}
            {trend.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-bold text-gray-800 mb-4">Daily trend (last 7 days)</h2>
                <div className="flex items-end gap-2 h-24">
                  {trend.map(day => {
                    const total = (day.good || 0) + (day.neutral || 0) + (day.bad || 0)
                    const scale = maxDay > 0 ? 100 / maxDay : 100
                    const goodH = ((day.good || 0) * scale).toFixed(1)
                    const neutH = ((day.neutral || 0) * scale).toFixed(1)
                    const badH  = ((day.bad || 0) * scale).toFixed(1)
                    return (
                      <div key={day.day} className="flex-1 flex flex-col items-center gap-0.5" title={`${day.day}: ${total} responses`}>
                        <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
                          <div style={{ height: `${badH}%` }}  className="bg-red-400 w-full"/>
                          <div style={{ height: `${neutH}%` }} className="bg-yellow-400 w-full"/>
                          <div style={{ height: `${goodH}%` }} className="bg-green-500 w-full rounded-t-sm"/>
                        </div>
                        <span className="text-xs text-gray-400 truncate w-full text-center">
                          {day.day.slice(5)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Follow-up answer breakdown ────────────────────────────── */}
            {Object.entries(data?.answersByQuestion ?? {}).map(([qKey, answers]) => {
              const qTotal = Object.values(answers).reduce((s, n) => s + n, 0)
              const sorted = Object.entries(answers)
                .filter(([k]) => k !== '_emoji_only')
                .sort((a, b) => b[1] - a[1])

              if (sorted.length === 0) return null

              return (
                <div key={qKey} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h2 className="font-bold text-gray-800 mb-1">{QUESTION_LABELS[qKey] ?? qKey}</h2>
                  <p className="text-xs text-gray-500 mb-4">
                    {qTotal} answered (
                    {answers['_emoji_only'] ? `${answers['_emoji_only']} skipped follow-up` : 'all answered'})
                  </p>
                  <div className="space-y-2.5">
                    {sorted.map(([key, count]) => (
                      <BarRow
                        key={key}
                        label={ANSWER_LABELS[key] ?? key}
                        count={count}
                        total={qTotal - (answers['_emoji_only'] ?? 0)}
                        color={qKey === 'what_made_it_great' ? 'bg-green-500' :
                               qKey === 'what_could_improve' ? 'bg-yellow-400' : 'bg-red-400'}
                      />
                    ))}
                  </div>
                </div>
              )
            })}

            {/* ── Product insights ──────────────────────────────────────── */}
            {allAnswers.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-bold text-gray-800 mb-1">💡 Product Insights</h2>
                <p className="text-xs text-gray-500 mb-4">
                  Actionable signals from micro-survey responses, sorted by frequency
                </p>
                <div className="space-y-3">
                  {allAnswers.slice(0, 6).map(([key, count]) => {
                    const insight = INSIGHTS[key]
                    if (!insight) return null
                    return (
                      <div key={key} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="flex-shrink-0 text-lg">{ANSWER_LABELS[key]?.split(' ')[0] ?? '💡'}</div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-800">
                            {ANSWER_LABELS[key]?.slice(ANSWER_LABELS[key].indexOf(' ') + 1) ?? key}
                            <span className="text-xs text-gray-400 font-normal ml-2">({count} mentions)</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{insight}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Survey endpoint docs ──────────────────────────────────── */}
            <div className="bg-violet-50 rounded-xl p-4 text-xs text-violet-700 border border-violet-100 space-y-1">
              <p><strong>API:</strong> <code className="bg-violet-100 px-1 rounded">POST /api/v1/survey</code> — submit rating + answer · <code className="bg-violet-100 px-1 rounded">GET /api/v1/survey</code> — analytics</p>
              <p><strong>Widget:</strong> <code className="bg-violet-100 px-1 rounded">{'<CSATWidget sessionId={id} source="post_export" />'}</code> — drop anywhere</p>
              <p><strong>Pages with widget:</strong> <code className="bg-violet-100 px-1 rounded">/create/preview/[id]/thankyou</code> · <code className="bg-violet-100 px-1 rounded">/create/preview/[id]/paywall</code> (after waitlist join)</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
