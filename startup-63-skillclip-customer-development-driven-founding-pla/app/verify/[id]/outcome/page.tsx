'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

type Verification = {
  id: string
  scheduled_at: string
  duration_minutes: number
  timezone: string
  status: string
  skill_to_demonstrate: string
  meeting_link: string
  challenge_prompt: string
  mentor_confirmation_signed: boolean
  tradesperson_confirmation_signed: boolean
  outcome: string | null
  outcome_notes: string | null
  mentor_notes: string | null
  tradesperson_rating: number | null
  employer_perceived_value: number | null
  employer_value_notes: string | null
  no_show: boolean
  tradesperson: { full_name: string; email: string }
  mentor: { full_name: string; email: string }
  trade: { name: string; slug: string }
  region: { name: string; region_code: string; code_standard: string }
  schedule: { id: string; confirmation_token: string } | null
}

const OUTCOME_OPTIONS = [
  { value: 'pass', label: '✅ Pass', desc: 'Tradesperson demonstrated the skill correctly per code', color: 'border-green-400 bg-green-50 text-green-800' },
  { value: 'fail', label: '❌ Fail', desc: 'Skill not demonstrated to journeyman standard', color: 'border-red-400 bg-red-50 text-red-800' },
  { value: 'no_show_tradesperson', label: '👻 No-show (tradesperson)', desc: 'Tradesperson did not join the session', color: 'border-amber-400 bg-amber-50 text-amber-800' },
  { value: 'no_show_mentor', label: '👻 No-show (mentor)', desc: 'Mentor did not join the session', color: 'border-amber-400 bg-amber-50 text-amber-800' },
  { value: 'cancelled', label: '🚫 Cancelled', desc: 'Session cancelled before it started', color: 'border-gray-300 bg-gray-50 text-gray-700' },
]

function OutcomePageInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const verificationId = params.id as string
  const actorType = searchParams.get('actor') || 'mentor'
  const token = searchParams.get('token')

  const [ver, setVer] = useState<Verification | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [outcome, setOutcome] = useState('')
  const [mentorNotes, setMentorNotes] = useState('')
  const [outcomeNotes, setOutcomeNotes] = useState('')
  const [tradeRating, setTradeRating] = useState(4)
  const [employerValue, setEmployerValue] = useState(5)
  const [employerValueNotes, setEmployerValueNotes] = useState('')

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (!verificationId) return
    fetch(`/api/schedule?verification_id=${verificationId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setNotFound(true); setLoading(false); return }
        setVer(d)
        if (d.outcome) setOutcome(d.outcome)
        if (d.mentor_notes) setMentorNotes(d.mentor_notes)
        if (d.outcome_notes) setOutcomeNotes(d.outcome_notes)
        if (d.tradesperson_rating) setTradeRating(d.tradesperson_rating)
        if (d.employer_perceived_value) setEmployerValue(d.employer_perceived_value)
        if (d.employer_value_notes) setEmployerValueNotes(d.employer_value_notes)
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [verificationId])

  const handleSubmit = async () => {
    if (!ver || !outcome) return
    setSaving(true); setSaveError('')

    const res = await fetch('/api/schedule', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verification_id: ver.id,
        schedule_id: ver.schedule?.id || null,
        actor_type: actorType,
        confirmation_signed: true,
        outcome,
        outcome_notes: outcomeNotes,
        mentor_notes: actorType === 'mentor' ? mentorNotes : undefined,
        tradesperson_rating: actorType === 'mentor' ? tradeRating : undefined,
        employer_perceived_value: actorType === 'employer' ? employerValue : undefined,
        employer_value_notes: actorType === 'employer' ? employerValueNotes : undefined,
      }),
    })

    const data = await res.json()
    if (!res.ok) { setSaveError(data.error || 'Failed to save'); setSaving(false); return }
    setVer(data.verification)
    setSaved(true)
    setSaving(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400 animate-pulse">Loading…</div>
  if (notFound) return <div className="min-h-screen flex items-center justify-center text-gray-500">Verification not found.</div>
  if (!ver) return null

  const sessionTime = new Date(ver.scheduled_at)
  const isCompleted = ['completed', 'no_show', 'cancelled'].includes(ver.status)
  const outcomeInfo = OUTCOME_OPTIONS.find(o => o.value === (ver.outcome || outcome))

  if (saved || (isCompleted && ver.mentor_confirmation_signed)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center">
          <div className="text-5xl mb-4">{ver.outcome === 'pass' ? '🏅' : ver.outcome?.includes('no_show') ? '👻' : ver.outcome === 'fail' ? '📋' : '✅'}</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Outcome Recorded</h1>
          <p className="text-gray-500 mb-4">The session outcome has been signed and recorded.</p>

          <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2 text-left mb-5">
            <div className="flex justify-between"><span className="text-gray-500">Tradesperson</span><span className="font-medium">{ver.tradesperson?.full_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Skill</span><span className="font-medium text-right max-w-[55%]">{ver.skill_to_demonstrate?.slice(0, 50)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Outcome</span>
              <span className={`font-bold ${ver.outcome === 'pass' ? 'text-green-700' : 'text-red-600'}`}>{outcomeInfo?.label || ver.outcome}</span>
            </div>
            <div className="flex justify-between"><span className="text-gray-500">Mentor signed</span><span className="font-medium">{ver.mentor_confirmation_signed ? '✓ Yes' : 'Pending'}</span></div>
          </div>

          {ver.outcome === 'pass' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800 mb-4">
              🏅 A jurisdiction-tagged badge will be issued to the tradesperson's wallet within 24 hours.
            </div>
          )}

          {ver.outcome?.includes('no_show') && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 mb-4">
              No-show recorded. A full refund will be processed within 3 business days.
            </div>
          )}

          <a href="/search" className="block bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 text-sm text-center">
            Back to Search
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Session Outcome</h1>
          <p className="text-gray-500 text-sm mt-0.5 capitalize">{actorType} confirmation · Signed record</p>
        </div>

        {/* Session summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="font-semibold text-gray-800 mb-3">Session Summary</h2>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Tradesperson</span><span className="font-medium">{ver.tradesperson?.full_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Mentor</span><span className="font-medium">{ver.mentor?.full_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Skill</span><span className="font-medium text-right max-w-[55%] text-xs">{ver.skill_to_demonstrate}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Trade</span><span className="font-medium">{ver.trade?.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Jurisdiction</span><span className="font-medium">{ver.region?.region_code} · {ver.region?.code_standard}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Scheduled</span><span className="font-medium">{sessionTime.toLocaleDateString()} {sessionTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Meeting Link</span><a href={ver.meeting_link} target="_blank" className="text-blue-600 hover:underline text-xs font-mono">{ver.meeting_link}</a></div>
          </div>
        </div>

        {ver.challenge_prompt && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm">
            <div className="font-semibold text-amber-900 mb-1">🎯 Challenge Prompt</div>
            <p className="text-amber-800">{ver.challenge_prompt}</p>
          </div>
        )}

        {/* Outcome form */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="font-semibold text-gray-800 mb-3">Record Outcome *</h2>
          <div className="space-y-2">
            {OUTCOME_OPTIONS.map(opt => (
              <div key={opt.value} onClick={() => setOutcome(opt.value)}
                className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${outcome === opt.value ? opt.color : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">{opt.label}</div>
                    <div className="text-xs opacity-75">{opt.desc}</div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${outcome === opt.value ? 'bg-current border-current' : 'border-gray-300'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mentor-specific fields */}
        {actorType === 'mentor' && outcome && !outcome.includes('no_show') && outcome !== 'cancelled' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 space-y-3">
            <h2 className="font-semibold text-gray-800">Mentor Observations</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tradesperson skill rating</label>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setTradeRating(s)}
                    className={`text-2xl transition-transform hover:scale-110 ${s <= tradeRating ? 'text-yellow-400' : 'text-gray-200'}`}>★</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mentor notes (shared with tradesperson)</label>
              <textarea value={mentorNotes} onChange={e => setMentorNotes(e.target.value)} rows={3}
                placeholder="Describe what was demonstrated, code compliance assessment, areas for improvement…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Outcome justification</label>
              <textarea value={outcomeNotes} onChange={e => setOutcomeNotes(e.target.value)} rows={2}
                placeholder="Specific reason for pass/fail decision, code section references…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>
        )}

        {/* Employer-specific fields */}
        {actorType === 'employer' && outcome && !outcome.includes('no_show') && outcome !== 'cancelled' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 space-y-3">
            <h2 className="font-semibold text-gray-800">Employer Feedback</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">How valuable was this verification? (1–5)</label>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setEmployerValue(s)}
                    className={`text-2xl transition-transform hover:scale-110 ${s <= employerValue ? 'text-blue-400' : 'text-gray-200'}`}>⭐</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Feedback notes</label>
              <textarea value={employerValueNotes} onChange={e => setEmployerValueNotes(e.target.value)} rows={3}
                placeholder="Did you make a hiring decision? Was this verification useful?"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>
        )}

        {/* Confirmation */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 text-xs text-gray-600">
          By clicking "Sign & Submit", you digitally sign this outcome report as <strong>{actorType}</strong>.
          This record is stored with your identity, IP address, and timestamp in CertClip's immutable audit log.
        </div>

        {saveError && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-3 text-sm">{saveError}</div>}

        <button onClick={handleSubmit} disabled={!outcome || saving}
          className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors">
          {saving ? 'Saving…' : '✍️ Sign & Submit Outcome'}
        </button>
      </div>
    </div>
  )
}

export default function OutcomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 animate-pulse">Loading…</div>}>
      <OutcomePageInner />
    </Suspense>
  )
}
