'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function FeedbackPage() {
  const { id } = useParams() as { id: string }
  const [verification, setVerification] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [rating, setRating] = useState(0)
  const [notes, setNotes] = useState('')
  const [wouldUseAgain, setWouldUseAgain] = useState<boolean | null>(null)
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null)
  const [vsTraditional, setVsTraditional] = useState('')
  const [timeSaved, setTimeSaved] = useState('')
  const [suggestions, setSuggestions] = useState('')
  const [employerEmail, setEmployerEmail] = useState('')
  const [employerCompany, setEmployerCompany] = useState('')

  useEffect(() => {
    if (!id) return
    supabase
      .from('live_verifications')
      .select(`
        id, skill_to_demonstrate, status, scheduled_at, duration_minutes,
        code_standards, challenge_prompt, metadata, employer_perceived_value, employer_value_notes,
        tradesperson:profiles!live_verifications_tradesperson_id_fkey(full_name),
        mentor:profiles!live_verifications_mentor_id_fkey(full_name, years_experience),
        trade:trades(name, slug),
        region:regions(name, code_standard)
      `)
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setVerification(data)
        if (data?.metadata?.employer_email) setEmployerEmail(data.metadata.employer_email)
        if (data?.metadata?.employer_company) setEmployerCompany(data.metadata.employer_company)
        if (data?.employer_perceived_value) { setRating(data.employer_perceived_value); setNotes(data.employer_value_notes || '') }
        setLoading(false)
      })
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rating) { setError('Please rate the perceived value'); return }
    setSubmitting(true); setError('')

    const res = await fetch('/api/verify/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verification_id: id,
        employer_perceived_value: rating,
        employer_value_notes: notes,
        would_use_again: wouldUseAgain,
        would_recommend: wouldRecommend,
        vs_traditional_interview: vsTraditional,
        time_saved_hours: timeSaved ? parseFloat(timeSaved) : null,
        improvement_suggestions: suggestions,
        employer_email: employerEmail,
        employer_company: employerCompany,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSubmitting(false); return }
    setSubmitted(true); setSubmitting(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500">Loading verification details…</div>
    </div>
  )

  if (!verification) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-red-500">Verification not found</div>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">🙏</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank you for your feedback!</h1>
        <p className="text-gray-600 mb-6">Your response helps us build a better tool. We read every submission.</p>
        <div className="flex gap-3">
          <a href="/verify" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 text-center">
            Book Another
          </a>
          <a href="/pricing" className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 text-center">
            View Plans
          </a>
        </div>
      </div>
    </div>
  )

  const isCompleted = verification.status === 'completed'

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <a href="/verify" className="text-blue-600 text-sm hover:text-blue-700">← Back to Schedule</a>
        </div>

        {/* Session summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Live Verification Feedback</h1>
              <p className="text-gray-500 text-sm mt-0.5">Your 10-minute session summary</p>
            </div>
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
              isCompleted ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {isCompleted ? '✓ Completed' : '⏰ Scheduled'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: 'Skill Verified', value: verification.skill_to_demonstrate },
              { label: 'Tradesperson', value: (verification.tradesperson as any)?.full_name || '—' },
              { label: 'Mentor', value: `${(verification.mentor as any)?.full_name || '—'} (${(verification.mentor as any)?.years_experience}yr exp)` },
              { label: 'Trade', value: (verification.trade as any)?.name || '—' },
              { label: 'Jurisdiction', value: `${(verification.region as any)?.name || '—'} — ${(verification.region as any)?.code_standard || '—'}` },
              { label: 'Session Time', value: new Date(verification.scheduled_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-0.5">{label}</p>
                <p className="text-gray-800 font-medium">{value}</p>
              </div>
            ))}
          </div>

          {verification.code_standards?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {verification.code_standards.map((s: string) => (
                <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-200">{s}</span>
              ))}
            </div>
          )}
        </div>

        {/* Feedback form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

          {/* Core: Perceived value rating */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 mb-1">Perceived Value *</h2>
            <p className="text-gray-500 text-sm mb-4">How valuable was this live verification for your hiring decision?</p>
            <div className="flex gap-3">
              {[
                { n: 1, label: 'Not useful', emoji: '😞' },
                { n: 2, label: 'Slightly useful', emoji: '😕' },
                { n: 3, label: 'Useful', emoji: '😐' },
                { n: 4, label: 'Very useful', emoji: '😊' },
                { n: 5, label: 'Essential', emoji: '🤩' },
              ].map(({ n, label, emoji }) => (
                <button key={n} type="button" onClick={() => setRating(n)}
                  className={`flex-1 py-4 rounded-xl border-2 text-center transition-colors ${
                    rating === n ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <div className="text-2xl mb-1">{emoji}</div>
                  <div className={`text-xs font-medium ${rating === n ? 'text-blue-700' : 'text-gray-500'}`}>{label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Open notes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <label className="block font-bold text-gray-900 mb-1">What specific value did you get?</label>
            <p className="text-gray-500 text-sm mb-3">Be specific — what did you learn that you couldn't get from a resume or phone screen?</p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="e.g. I could see the candidate actually knew the code section. Their torque technique was correct. The mentor's commentary on the tap rule issue was exactly what I needed."
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Behavioral signals */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
            <h2 className="font-bold text-gray-900">Follow-up Signals</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Would you commission another live verification?</label>
              <div className="flex gap-3">
                {[true, false].map(v => (
                  <button key={String(v)} type="button" onClick={() => setWouldUseAgain(v)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-colors ${
                      wouldUseAgain === v ? (v ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-400 bg-red-50 text-red-700') : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
                    {v ? '✅ Yes, definitely' : '❌ Probably not'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Would you recommend CertClip to a peer?</label>
              <div className="flex gap-3">
                {[true, false].map(v => (
                  <button key={String(v)} type="button" onClick={() => setWouldRecommend(v)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-colors ${
                      wouldRecommend === v ? (v ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-400 bg-red-50 text-red-700') : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
                    {v ? '✅ Yes' : '❌ No'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">How does this compare to a traditional in-person skills test?</label>
              <select value={vsTraditional} onChange={e => setVsTraditional(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500">
                <option value="">— Select —</option>
                <option value="much_better">Much better — more information, faster</option>
                <option value="better">Better — similar info, much less time</option>
                <option value="similar">About the same — different trade-offs</option>
                <option value="worse">Worse — I still prefer in-person</option>
                <option value="no_comparison">I don't currently do in-person tests</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">How much interviewer/coordinator time did this save? (hours)</label>
              <input value={timeSaved} onChange={e => setTimeSaved(e.target.value)} type="number" min="0" max="24" step="0.5" placeholder="e.g. 2"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">What would make this more valuable?</label>
              <textarea value={suggestions} onChange={e => setSuggestions(e.target.value)} rows={2}
                placeholder="e.g. Longer session, multiple skills per session, real-time notes shared with us during the call"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Email (for follow-up)</label>
              <input value={employerEmail} onChange={e => setEmployerEmail(e.target.value)} type="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input value={employerCompany} onChange={e => setEmployerCompany(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
            </div>
          </div>

          <button type="submit" disabled={submitting || !rating}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">
            {submitting ? 'Submitting…' : 'Submit Feedback'}
          </button>
        </form>
      </div>
    </div>
  )
}
