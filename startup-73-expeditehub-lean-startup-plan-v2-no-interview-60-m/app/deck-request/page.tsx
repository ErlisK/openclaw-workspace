'use client'
import { useState, useEffect } from 'react'
import posthog from 'posthog-js'
import { gtagConversion } from '@/lib/analytics'
import Link from 'next/link'

const DECK_TYPES = [
  'Ground-level attached deck',
  'Elevated attached deck (ledger)',
  'Freestanding / floating deck',
  'Rooftop deck',
  'Pool deck / surround',
]

const MATERIALS = ['Wood (pressure-treated)', 'Composite decking', 'IPE / hardwood', 'Concrete', 'Other']

const TIMELINES = ['ASAP — within 30 days', '1–3 months', '3–6 months', 'Just planning ahead']

type Step = 'details' | 'specs' | 'confirm' | 'submitted'

export default function DeckRequestPage() {
  const [step, setStep] = useState<Step>('details')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [deckType, setDeckType] = useState(DECK_TYPES[0])
  const [deckSqft, setDeckSqft] = useState('')
  const [material, setMaterial] = useState(MATERIALS[0])
  const [heightInches, setHeightInches] = useState('')
  const [timeline, setTimeline] = useState(TIMELINES[0])
  const [existingDeck, setExistingDeck] = useState<'yes' | 'no'>('no')
  const [notes, setNotes] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Consent
  const [consentAI, setConsentAI] = useState(false)
  const [consentTos, setConsentTos] = useState(false)
  const allConsent = consentAI && consentTos

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('email')) setEmail(decodeURIComponent(p.get('email')!))
    if (p.get('address')) setAddress(decodeURIComponent(p.get('address')!))
    posthog.capture('deck_request_view', { metro: 'Austin' })
  }, [])

  const handleDetailsNext = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !address.trim()) return

    // Create project record
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        homeowner_email: email,
        address,
        project_type: 'deck',
        proposed_adu_type: deckType,
        status: 'draft',
        metro: 'Austin',
      }),
    }).catch(() => null)

    if (res?.ok) {
      const data = await res.json()
      setProjectId(data.project?.id ?? null)
    }
    posthog.capture('deck_details_step', { metro: 'Austin', deck_type: deckType })
    setStep('specs')
  }

  const handleFinalSubmit = async () => {
    if (!allConsent) return
    setSubmitting(true)

    // Log consent
    fetch('/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        email,
        items_accepted: ['ai_disclaimer', 'tos_agree'],
        page_url: window.location.href,
      }),
    }).catch(() => {})

    // Update project with specs
    if (projectId) {
      await fetch(`/api/projects/${projectId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposed_adu_sqft: deckSqft ? parseInt(deckSqft) : null,
          notes: `Material: ${material}. Height: ${heightInches || 'unknown'} in. Existing: ${existingDeck}. Timeline: ${timeline}. ${notes}`.trim(),
        }),
      }).catch(() => {})
    }

    posthog.capture('deck_request_submitted', { project_id: projectId, metro: 'Austin' })
    gtagConversion('request_intent_submit')
    setSubmitting(false)
    setStep('submitted')
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
        <Link href="/lp/deck-permit-austin" className="font-bold text-xl text-blue-700">ExpediteHub</Link>
        <span className="text-gray-300">›</span>
        <span className="text-gray-600 text-sm">Deck Permit Request · Austin</span>
      </nav>

      {/* Progress */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-xl mx-auto px-6 py-3 flex items-center gap-2 text-xs text-gray-400">
          {(['details', 'specs', 'confirm'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s ? 'bg-blue-600 text-white' :
                (['details','specs','confirm'].indexOf(step) > i) ? 'bg-green-500 text-white' :
                'bg-gray-100 text-gray-400'
              }`}>{i + 1}</div>
              <span className={step === s ? 'text-gray-800 font-medium' : ''}>
                {({ details: 'Project', specs: 'Specs', confirm: 'Review' } as Record<string, string>)[s]}
              </span>
              {i < 2 && <span className="text-gray-200">›</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 py-8">

        {/* ── Step 1: Details ── */}
        {step === 'details' && (
          <form onSubmit={handleDetailsNext} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h1 className="text-xl font-bold text-gray-900">Your deck project</h1>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Austin deck address</label>
              <input type="text" required value={address} onChange={e => setAddress(e.target.value)}
                placeholder="1234 Maple St, Austin TX"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deck type</label>
              <select value={deckType} onChange={e => setDeckType(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {DECK_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timeline</label>
              <select value={timeline} onChange={e => setTimeline(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {TIMELINES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <button type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all">
              Next: Deck Specs →
            </button>
          </form>
        )}

        {/* ── Step 2: Specs ── */}
        {step === 'specs' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h1 className="text-xl font-bold text-gray-900">Deck specifications</h1>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Approximate deck size (sq ft)</label>
              <input type="number" min="1" max="5000" value={deckSqft} onChange={e => setDeckSqft(e.target.value)}
                placeholder="e.g. 300"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deck material</label>
              <select value={material} onChange={e => setMaterial(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {MATERIALS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deck height above grade (inches) <span className="text-gray-400 font-normal">optional</span>
              </label>
              <input type="number" min="0" max="360" value={heightInches} onChange={e => setHeightInches(e.target.value)}
                placeholder="e.g. 24"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-gray-400 mt-1">Decks over 30 in. from grade require a permit in Austin.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Replacing an existing deck?</label>
              <div className="flex gap-3">
                {(['no', 'yes'] as const).map(v => (
                  <button key={v} type="button" onClick={() => setExistingDeck(v)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      existingDeck === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}>
                    {v === 'yes' ? 'Yes' : 'No — new deck'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional notes <span className="text-gray-400 font-normal">optional</span>
              </label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                rows={2} placeholder="Any special features, HOA requirements, or context…"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('details')}
                className="px-5 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                ← Back
              </button>
              <button onClick={() => setStep('confirm')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all">
                Review & Submit →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Confirm ── */}
        {step === 'confirm' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h1 className="text-xl font-bold text-gray-900">Review your deck request</h1>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              {[
                ['Email', email],
                ['Address', address],
                ['Deck Type', deckType],
                ['Size', deckSqft ? `${deckSqft} sq ft` : 'Not specified'],
                ['Material', material],
                ['Height', heightInches ? `${heightInches} in` : 'Not specified'],
                ['Timeline', timeline],
                ['Replacing existing', existingDeck === 'yes' ? 'Yes' : 'No'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <span className="text-gray-400 w-36 shrink-0">{k}</span>
                  <span className="text-gray-800 font-medium">{v}</span>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800 mb-2">
              <p className="font-semibold mb-1">After you submit:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>AI drafts your Austin deck permit package (24h)</li>
                <li>Licensed Austin contractor quotes same day</li>
                <li>Contractor submits to Austin DSD</li>
                <li>DSD reviews decks in 7–14 business days</li>
              </ol>
            </div>

            {/* Consent */}
            <div className="border border-amber-200 bg-amber-50 rounded-2xl p-4 space-y-3">
              <h3 className="font-semibold text-amber-900 text-sm">⚠️ Required Acknowledgements</h3>
              <label className="flex gap-3 cursor-pointer">
                <input type="checkbox" checked={consentAI} onChange={e => setConsentAI(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-amber-600 shrink-0" />
                <span className="text-xs text-gray-700">
                  <strong>AI Disclaimer:</strong> The permit package is AI-assisted and may contain errors.
                  A licensed contractor reviews it before submission. Municipality acceptance is not guaranteed.
                </span>
              </label>
              <label className="flex gap-3 cursor-pointer">
                <input type="checkbox" checked={consentTos} onChange={e => setConsentTos(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-amber-600 shrink-0" />
                <span className="text-xs text-gray-700">
                  I agree to the <a href="/tos" target="_blank" className="text-blue-600 hover:underline font-medium">Terms of Service</a>.
                </span>
              </label>
              {!allConsent && <p className="text-xs text-amber-700">Please check both boxes to continue.</p>}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('specs')}
                className="px-5 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                ← Back
              </button>
              <button onClick={handleFinalSubmit} disabled={submitting || !allConsent}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all">
                {submitting ? 'Submitting…' : '🚀 Submit Deck Permit Request'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Submitted ── */}
        {step === 'submitted' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Deck Permit Request Submitted!</h1>
            <p className="text-gray-500 mb-4">
              Your project is now on the ExpediteHub Austin contractor board.
              A licensed contractor will review and quote within <strong>24 hours</strong>.
            </p>
            <p className="text-gray-400 text-sm mb-6">Project ID: <code className="bg-gray-100 px-2 py-0.5 rounded">{projectId}</code></p>
            <div className="bg-blue-50 rounded-xl p-4 text-left text-sm text-blue-800 mb-6">
              <p className="font-semibold mb-1">Check your email at {email} for:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Quote from your matched contractor</li>
                <li>Preview of your AI-drafted deck permit package</li>
                <li>Next steps to approve and start</li>
              </ul>
            </div>
            <Link href="/" className="text-sm text-blue-600 hover:underline">← Back to ExpediteHub</Link>
          </div>
        )}
      </div>
    </main>
  )
}
