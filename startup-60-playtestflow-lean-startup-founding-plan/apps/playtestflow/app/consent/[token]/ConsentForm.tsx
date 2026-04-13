'use client'
import { useState } from 'react'
import Link from 'next/link'

const CONSENT_TEXT = {
  title: 'Research Participation Consent',
  version: 'v1',
  body: [
    {
      heading: 'What you are agreeing to',
      text: 'You are signing up to participate in a remote playtest session. During and after the session, you will be asked to provide structured feedback on the game you tested. Your feedback helps the designer improve their game.',
    },
    {
      heading: 'How your data is used',
      text: 'Your name and email are stored securely and used only to communicate session details. An anonymized ID (shown above) is used to link your feedback to your signup without exposing your identity to other participants or in published research.',
    },
    {
      heading: 'What we collect',
      text: 'Pre-session survey responses (experience level, preferences), session feedback (ratings, notes, confusion points), and attendance status. We do not collect financial information, location data, or any data beyond what you provide in forms.',
    },
    {
      heading: 'Your rights',
      text: 'Participation is entirely voluntary. You may withdraw at any time before submitting your post-session survey. To request deletion of your data, email research@playtestflow.com with your tester ID.',
    },
    {
      heading: 'Data retention',
      text: 'Your data is retained for up to 24 months for research purposes. Aggregated, anonymized insights may be shared publicly. Individual responses are never shared without explicit additional consent.',
    },
  ],
}

export default function ConsentForm({
  token,
  testerName,
  alreadyConsented,
  consentedAt,
  preSurveyCompleted,
  sessionId,
}: {
  token: string
  testerName: string
  alreadyConsented: boolean
  consentedAt: string | null
  preSurveyCompleted: boolean
  sessionId: string
}) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  if (alreadyConsented) {
    return (
      <div className="space-y-4">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-green-400">✓</span>
            <span className="text-green-300 font-medium text-sm">Consent recorded</span>
          </div>
          <p className="text-gray-400 text-xs">
            You consented on {consentedAt ? new Date(consentedAt).toLocaleString() : 'a previous visit'}.
            {' '}Version: {CONSENT_TEXT.version}
          </p>
        </div>

        {!preSurveyCompleted ? (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-5">
            <h3 className="font-semibold mb-1">Next step: Pre-session survey</h3>
            <p className="text-gray-400 text-sm mb-4">
              Takes about 2 minutes. Helps the designer match roles and prepare for the session.
            </p>
            <Link
              href={`/survey/pre/${token}`}
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
            >
              Start Pre-Session Survey →
            </Link>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
            <div className="text-4xl mb-2">✅</div>
            <h3 className="font-semibold mb-1">All set!</h3>
            <p className="text-gray-400 text-sm">
              Consent recorded and pre-session survey complete. You'll receive session details by email.
            </p>
          </div>
        )}
      </div>
    )
  }

  async function handleConsent(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed) return
    setStatus('loading')

    const res = await fetch('/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const data = await res.json()

    if (data.success) {
      setStatus('done')
    } else {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-xl font-bold mb-2">Consent recorded</h2>
        <p className="text-gray-400 text-sm mb-6">Thank you, {testerName}. Please complete the pre-session survey next.</p>
        <Link
          href={`/survey/pre/${token}`}
          className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-semibold transition-colors"
        >
          Start Pre-Session Survey →
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleConsent} className="space-y-5">
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="font-bold text-lg">{CONSENT_TEXT.title}</h2>
          <p className="text-gray-500 text-xs mt-0.5">Version {CONSENT_TEXT.version} · Please read before proceeding</p>
        </div>

        <div className="divide-y divide-white/5">
          {CONSENT_TEXT.body.map((section, i) => (
            <div key={i} className="px-6">
              <button
                type="button"
                onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full flex items-center justify-between py-4 text-left"
              >
                <span className="font-medium text-sm">{section.heading}</span>
                <span className="text-gray-500 text-lg leading-none ml-4">
                  {expanded === i ? '−' : '+'}
                </span>
              </button>
              {expanded === i && (
                <p className="text-gray-400 text-sm pb-4 leading-relaxed">{section.text}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 accent-orange-500"
        />
        <span className="text-sm text-gray-300 leading-relaxed">
          I have read and understand the consent information above. I agree to participate in this
          playtest session and provide feedback. I understand I can withdraw at any time by emailing
          <a href="mailto:research@playtestflow.com" className="text-orange-400 mx-1">
            research@playtestflow.com
          </a>
          with my tester ID.
        </span>
      </label>

      {status === 'error' && (
        <p className="text-red-400 text-sm">Something went wrong. Please try again.</p>
      )}

      <button
        type="submit"
        disabled={!agreed || status === 'loading'}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white py-4 rounded-xl font-bold transition-colors"
      >
        {status === 'loading' ? 'Recording consent…' : 'I Agree — Continue to Survey →'}
      </button>

      <p className="text-center text-gray-600 text-xs">
        Powered by <a href="https://playtestflow.vercel.app" className="text-orange-400/60">PlaytestFlow</a>
        {' · '}Version {CONSENT_TEXT.version}
      </p>
    </form>
  )
}
