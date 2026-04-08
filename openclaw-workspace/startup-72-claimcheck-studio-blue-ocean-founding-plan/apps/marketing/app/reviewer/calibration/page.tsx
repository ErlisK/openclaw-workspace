'use client'
import { useState, useEffect } from 'react'

interface CalibTask {
  id: string
  claim_text: string
  source_title: string | null
  source_doi: string | null
  difficulty: string
  specialization: string
}

interface CalibResult {
  is_correct: boolean
  expert_verdict: string
  expert_rationale: string
  calibration_passed: boolean
  score: { correct: number; total: number; pct: number }
}

const VERDICT_OPTIONS = [
  { value: 'supported', label: '✅ Supported', desc: 'The cited source clearly supports the claim as stated' },
  { value: 'partially_supported', label: '🟡 Partially supported', desc: 'Source provides relevant evidence but claim overstates or misrepresents it' },
  { value: 'unsupported', label: '❌ Unsupported', desc: 'No credible evidence in the source(s) supports the claim' },
  { value: 'misleading', label: '⚠️ Misleading', desc: 'Claim is technically true but presented in a way that creates false impressions' },
  { value: 'needs_context', label: '📝 Needs context', desc: 'Claim is correct but requires important caveats or qualifications' },
]

const DIFFICULTY_STYLE: Record<string, string> = {
  easy: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
  medium: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
  hard: 'text-red-400 bg-red-950/40 border-red-800/40',
}

export default function CalibrationPage() {
  const [tasks, setTasks] = useState<CalibTask[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [verdict, setVerdict] = useState('')
  const [rationale, setRationale] = useState('')
  const [confidence, setConfidence] = useState(0.7)
  const [result, setResult] = useState<CalibResult | null>(null)
  const [history, setHistory] = useState<Array<{ task: CalibTask; result: CalibResult }>>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  // Demo reviewer ID
  const DEMO_REVIEWER = 'demo-calibration-user'

  useEffect(() => {
    fetch('/api/reviewer/calibration?count=5')
      .then(r => r.json())
      .then(d => { setTasks(d.tasks || []); setLoading(false) })
  }, [])

  async function submitVerdict() {
    if (!verdict || !tasks[currentIdx]) return
    setSubmitting(true)

    const res = await fetch('/api/reviewer/calibration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reviewer_id: DEMO_REVIEWER,
        task_id: tasks[currentIdx].id,
        verdict, rationale,
        confidence,
      }),
    }).then(r => r.json())

    setResult(res)
    setSubmitting(false)
  }

  function nextTask() {
    if (result) setHistory([...history, { task: tasks[currentIdx], result }])
    setResult(null)
    setVerdict('')
    setRationale('')
    setConfidence(0.7)

    if (currentIdx >= tasks.length - 1) {
      setDone(true)
    } else {
      setCurrentIdx(currentIdx + 1)
    }
  }

  if (loading) return <div className="pt-24 text-center text-gray-500 text-sm">Loading calibration tasks…</div>
  if (tasks.length === 0) return <div className="pt-24 text-center text-gray-500 text-sm">No calibration tasks available. Contact hello@citebundle.com</div>

  const task = tasks[currentIdx]
  const totalScore = history.length > 0
    ? Math.round(history.filter(h => h.result.is_correct).length / history.length * 100)
    : 0

  if (done) {
    const correct = history.filter(h => h.result.is_correct).length
    const pct = Math.round(correct / history.length * 100)
    const passed = pct >= 80
    return (
      <div className="pt-14 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
          <div className={`text-5xl mb-4 text-center`}>{passed ? '🎉' : '📚'}</div>
          <h2 className={`text-2xl font-bold text-center mb-2 ${passed ? 'text-emerald-400' : 'text-amber-400'}`}>
            {passed ? 'Calibration passed!' : 'Not yet — keep studying'}
          </h2>
          <div className="text-center text-gray-400 mb-6">
            Score: {correct}/{history.length} ({pct}%) · Passing: ≥80%
          </div>

          {passed ? (
            <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-5 text-center mb-6">
              <div className="text-emerald-300 text-sm font-semibold mb-1">🥉 Bronze tier unlocked</div>
              <div className="text-gray-400 text-xs">You can now receive peer review microtasks. Check the reviewer dashboard for available tasks.</div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-5 text-center mb-6">
              <div className="text-amber-300 text-sm font-semibold mb-1">Review the training materials and try again</div>
              <div className="text-gray-400 text-xs">Focus on the Evidence Hierarchy and Claim Extraction modules. You can retake calibration after 24 hours.</div>
            </div>
          )}

          <div className="space-y-3">
            {history.map((h, i) => (
              <div key={i} className={`rounded-lg border p-3 text-xs ${h.result.is_correct ? 'border-emerald-800/40 bg-emerald-950/10' : 'border-red-800/40 bg-red-950/10'}`}>
                <div className="text-gray-300 mb-1 font-medium">{i + 1}. {h.task.claim_text.slice(0, 80)}…</div>
                <div className="flex gap-4 text-gray-500">
                  <span>Your verdict: <span className={h.result.is_correct ? 'text-emerald-400' : 'text-red-400'}>{h.result.is_correct ? '✓ ' : '✗ '}{h.task.claim_text ? '' : ''}{verdict}</span></span>
                  <span>Expert: <span className="text-gray-300">{h.result.expert_verdict}</span></span>
                </div>
                {!h.result.is_correct && <div className="text-gray-500 mt-1 italic">{h.result.expert_rationale?.slice(0, 120)}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-14">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-bold text-white">Calibration Assessment</h1>
            <span className="text-xs text-gray-500">Task {currentIdx + 1} of {tasks.length}</span>
          </div>
          <div className="w-full bg-gray-800 h-1.5 rounded-full">
            <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${(currentIdx / tasks.length) * 100}%` }} />
          </div>
          {history.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">Current score: {totalScore}% ({history.filter(h => h.result.is_correct).length}/{history.length} correct)</div>
          )}
        </div>

        {/* Task card */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <span className={`px-2 py-0.5 rounded border text-xs ${DIFFICULTY_STYLE[task.difficulty] || ''}`}>{task.difficulty}</span>
            {task.specialization && <span className="text-xs text-gray-600 capitalize">{task.specialization.replace('_', ' ')}</span>}
          </div>

          <div className="text-base font-medium text-gray-200 leading-relaxed mb-4">&ldquo;{task.claim_text}&rdquo;</div>

          {task.source_title && (
            <div className="text-xs text-gray-500 mb-4">
              Source: <span className="text-gray-400">{task.source_title}</span>
              {task.source_doi && <span className="ml-2 font-mono">[{task.source_doi}]</span>}
            </div>
          )}
          {!task.source_title && (
            <div className="text-xs text-amber-600 mb-4">⚠ No source cited with this claim</div>
          )}

          {!result ? (
            <>
              <div className="space-y-2 mb-4">
                {VERDICT_OPTIONS.map(opt => (
                  <label key={opt.value}
                    className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${verdict === opt.value ? 'border-blue-600 bg-blue-950/40' : 'border-gray-700 hover:border-gray-600'}`}>
                    <input type="radio" name="verdict" value={opt.value} checked={verdict === opt.value}
                      onChange={() => setVerdict(opt.value)} className="mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-200">{opt.label}</div>
                      <div className="text-xs text-gray-500">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              <textarea value={rationale} onChange={e => setRationale(e.target.value)}
                placeholder="Rationale (optional — explain your reasoning)"
                className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-gray-500 resize-none mb-4"
                rows={2} />

              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs text-gray-500">Confidence:</span>
                <input type="range" min="0.5" max="1" step="0.05" value={confidence}
                  onChange={e => setConfidence(parseFloat(e.target.value))}
                  className="flex-1 max-w-[140px]" />
                <span className="text-xs text-gray-400">{Math.round(confidence * 100)}%</span>
              </div>

              <button onClick={submitVerdict} disabled={!verdict || submitting}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-lg font-medium">
                {submitting ? 'Submitting…' : 'Submit verdict'}
              </button>
            </>
          ) : (
            <div className={`rounded-xl border p-4 ${result.is_correct ? 'border-emerald-700/40 bg-emerald-950/20' : 'border-red-700/40 bg-red-950/20'}`}>
              <div className={`text-base font-semibold mb-2 ${result.is_correct ? 'text-emerald-300' : 'text-red-300'}`}>
                {result.is_correct ? '✓ Correct' : '✗ Incorrect'}
              </div>
              <div className="text-xs text-gray-400 mb-1">Expert verdict: <span className="text-gray-200 font-medium">{result.expert_verdict?.replace('_', ' ')}</span></div>
              {result.expert_rationale && (
                <div className="text-xs text-gray-500 italic mt-1 leading-relaxed">{result.expert_rationale}</div>
              )}
              <button onClick={nextTask}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg">
                {currentIdx >= tasks.length - 1 ? 'View results →' : 'Next task →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
