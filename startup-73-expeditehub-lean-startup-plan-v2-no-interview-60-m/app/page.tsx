'use client'
import { useState, useEffect, useRef } from 'react'
import posthog from 'posthog-js'
import {
  trackLpView,
  trackPriceVariant,
  trackHomeownerCtaClick,
  trackProCtaClick,
  trackEmailCaptured,
  trackRequestIntentSubmit,
  trackCheckoutView,
  getDistinctId,
} from '@/lib/analytics'

const TIMELINES = ['ASAP (within 2 weeks)', '1–3 months', '3–6 months', 'Just exploring']
const PROJECT_TYPES = [
  'Detached ADU (backyard cottage)',
  'Attached ADU (addition)',
  'Garage conversion',
  'Junior ADU (internal)',
  'Deck / Patio',
  'Pool',
  'Other addition',
]

type PriceVariant = 'control' | 'beta_149' | 'beta_99'

const PRICES: Record<PriceVariant, { display: string; label: string }> = {
  control:  { display: '$199', label: 'Standard' },
  beta_149: { display: '$149', label: 'Limited Beta' },
  beta_99:  { display: '$99',  label: 'Early Access' },
}

export default function HomePage() {
  const [showModal, setShowModal]         = useState(false)
  // step: 'intake' | 'survey' | 'redirecting'
  const [step, setStep]                   = useState<'intake' | 'survey' | 'redirecting'>('intake')
  const [email, setEmail]                 = useState('')
  const [address, setAddress]             = useState('')
  const [zip, setZip]                     = useState('')
  const [timeline, setTimeline]           = useState('')
  const [projectType, setProjectType]     = useState('')
  const [loading, setLoading]             = useState(false)
  // survey answers
  const [surveyTimeline, setSurveyTimeline] = useState('')
  const [surveyHasPlans, setSurveyHasPlans] = useState('')
  const [surveyLoading, setSurveyLoading]   = useState(false)
  const [checkoutUrl, setCheckoutUrl]       = useState('')
  const [priceVariant, setPriceVariant]   = useState<PriceVariant>('control')
  const [cancelled, setCancelled]         = useState(false)
  const [emailSaved, setEmailSaved]       = useState(false)
  const emailSaveTimer                    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const variantFired                      = useRef(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('cancelled')) setCancelled(true)

    // Fire lp_view once
    trackLpView({ referrer: document.referrer || 'direct' })

    // Resolve PostHog feature flag
    const resolveFlag = () => {
      const v = posthog.getFeatureFlag('price-test') as PriceVariant | undefined
      const resolved: PriceVariant = v === 'beta_149' || v === 'beta_99' ? v : 'control'
      setPriceVariant(resolved)
      if (!variantFired.current) {
        trackPriceVariant(resolved, PRICES[resolved].display)
        variantFired.current = true
      }
    }

    if (typeof posthog.getFeatureFlag === 'function') {
      posthog.onFeatureFlags(resolveFlag)
      // Also try immediately in case flags already loaded
      resolveFlag()
    }
  }, [])

  const pv = PRICES[priceVariant]
  const isBeta = priceVariant !== 'control'
  const spotsLeft = priceVariant === 'beta_99' ? 7 : 12

  // ── Abandonment email capture ──────────────────────────────────────────────
  const handleEmailChange = (val: string) => {
    setEmail(val)
    if (emailSaveTimer.current) clearTimeout(emailSaveTimer.current)
    if (!val.includes('@') || emailSaved) return
    emailSaveTimer.current = setTimeout(async () => {
      try {
        await fetch('/api/lead-capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: val,
            price_variant: priceVariant,
            posthog_distinct_id: getDistinctId(),
            status: 'email_captured',
          }),
        })
        setEmailSaved(true)
        trackEmailCaptured({ price_variant: priceVariant })
      } catch {}
    }, 1500)
  }

  // ── Open modal ─────────────────────────────────────────────────────────────
  const openModal = (source: string) => {
    trackHomeownerCtaClick({ source, price_variant: priceVariant, price: pv.display })
    setStep('intake')
    setShowModal(true)
  }

  // ── Step 1: intake form submit → create checkout session + show survey ─────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !address || !timeline || !projectType) return

    trackRequestIntentSubmit({
      price_variant: priceVariant,
      project_type: projectType,
      timeline,
      zip,
    })

    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, address, zip, timeline,
          project_type: projectType,
          role: 'homeowner',
          price_variant: priceVariant,
          posthog_distinct_id: getDistinctId(),
        }),
      })
      const data = await res.json()
      if (data.url) {
        setCheckoutUrl(data.url)
        setStep('survey')   // show micro-survey before redirect
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: survey submit → save + redirect to Stripe ────────────────────
  const handleSurveySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSurveyLoading(true)

    // Fire PostHog survey event
    posthog.capture('micro_survey_complete', {
      survey_submit_timeline: surveyTimeline,
      survey_has_plans: surveyHasPlans,
      price_variant: priceVariant,
      project_type: projectType,
    })

    // Save to Supabase (best-effort, don't block checkout)
    fetch('/api/survey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        survey_submit_timeline: surveyTimeline,
        survey_has_plans: surveyHasPlans,
      }),
    }).catch(() => {})

    setStep('redirecting')
    trackCheckoutView({ price_variant: priceVariant, project_type: projectType, email })
    window.location.href = checkoutUrl
  }

  // ── Skip survey ("Skip" link) ─────────────────────────────────────────────
  const skipSurvey = () => {
    posthog.capture('micro_survey_skipped', { price_variant: priceVariant })
    setStep('redirecting')
    trackCheckoutView({ price_variant: priceVariant, project_type: projectType, email })
    window.location.href = checkoutUrl
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="font-bold text-xl text-blue-700">ExpediteHub</div>
        <a
          href="/pro"
          onClick={() => trackProCtaClick({ source: 'nav' })}
          className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
        >
          Are you a permit pro? →
        </a>
      </nav>

      {/* Beta scarcity banner */}
      {isBeta && (
        <div className="bg-amber-400 text-amber-900 text-center py-2 text-sm font-medium px-4">
          ⚡ Limited beta pricing — only {spotsLeft} spots remaining at {pv.display}
        </div>
      )}

      {cancelled && (
        <div className="bg-yellow-50 border-b border-yellow-100 text-yellow-800 text-center py-2 text-sm px-4">
          No worries — your spot is still available whenever you&apos;re ready.
        </div>
      )}

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-4 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1 rounded-full mb-6">
          🏠 Austin, TX · ADU &amp; Residential Permits
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
          Your Austin ADU Permit Packet
          <br className="hidden sm:block" />
          <span className="text-blue-600"> in 5 Business Days</span>
        </h1>
        <p className="text-xl text-gray-500 mb-4 max-w-2xl mx-auto">
          Licensed permit expediters + AI auto-fill handle every City of Austin form, checklist, and
          submission requirement — so you don&apos;t have to.
        </p>
      </section>

      {/* ── Pricing card ── */}
      <section className="max-w-md mx-auto px-6 pb-10">
        <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-b from-blue-50 to-white p-8 text-center shadow-lg">
          {isBeta && (
            <div className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
              🏷️ {pv.label} Discount
            </div>
          )}
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-2xl text-gray-400 line-through font-medium">$199</span>
            <span className="text-5xl font-extrabold text-blue-700">{pv.display}</span>
          </div>
          <p className="text-gray-500 text-sm mb-1">one-time deposit · fully refundable in 48h if unmatched</p>
          {isBeta && (
            <p className="text-amber-700 text-xs font-medium mb-4">
              Beta price ends when {spotsLeft} spots fill
            </p>
          )}
          <ul className="text-sm text-gray-700 text-left space-y-2 my-5">
            {[
              '✅ AI pre-fills your City of Austin permit forms',
              '✅ Matched with a licensed Austin expediter in 24h',
              '✅ Site plan checklist + zoning compliance review',
              '✅ Cover letter & full permit packet',
              '✅ Escrow-protected — pay only when satisfied',
            ].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <button
            onClick={() => openModal('hero_card')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold py-4 rounded-xl shadow transition-all hover:scale-105 active:scale-95"
          >
            Get My Permit Packet — {pv.display}
          </button>
          <p className="text-xs text-gray-400 mt-3">
            Stripe-secured · Test mode · No charge until you confirm
          </p>
        </div>
      </section>

      {/* Dual CTA row */}
      <section className="max-w-2xl mx-auto px-6 pb-14 flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={() => openModal('dual_cta')}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow transition-all text-sm"
        >
          🏠 I&apos;m a Homeowner — Start My Packet
        </button>
        <a
          href="/pro"
          onClick={() => trackProCtaClick({ source: 'dual_cta' })}
          className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-semibold px-6 py-3 rounded-xl shadow transition-all text-sm text-center"
        >
          🔧 I&apos;m a Permit Pro — Join the Network
        </a>
      </section>

      {/* Trust signals */}
      <section className="bg-gray-50 py-10">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { icon: '✅', label: 'License-verified pros' },
            { icon: '🔒', label: 'Escrow-protected deposits' },
            { icon: '⚡', label: '5-day turnaround target' },
            { icon: '🤖', label: 'AI form auto-fill' },
          ].map(({ icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <span className="text-3xl">{icon}</span>
              <span className="text-sm font-medium text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Project types */}
      <section className="max-w-4xl mx-auto px-6 py-14">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">Projects We Expedite</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { icon: '🏡', label: 'Detached ADU', tag: 'Most popular' },
            { icon: '🏠', label: 'Attached ADU / Addition', tag: '' },
            { icon: '🚗', label: 'Garage Conversion', tag: '' },
            { icon: '🛖', label: 'Junior ADU (internal)', tag: '' },
            { icon: '🌿', label: 'Deck & Patio', tag: '' },
            { icon: '🏊', label: 'Pool', tag: 'Coming soon' },
          ].map(({ icon, label, tag }) => (
            <div
              key={label}
              className="border border-gray-100 rounded-xl p-4 text-center hover:border-blue-200 hover:bg-blue-50 transition-colors cursor-pointer"
              onClick={() => openModal('project_type_card')}
            >
              <div className="text-2xl mb-1">{icon}</div>
              <p className="text-sm font-medium text-gray-800">{label}</p>
              {tag && <span className="text-xs text-blue-600 font-medium">{tag}</span>}
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Post Your Project', desc: 'Tell us your Austin address and project type. Our AI pre-fills your City of Austin permit forms instantly.' },
              { step: '2', title: 'Get Matched',       desc: 'Licensed local expediters review your pre-filled packet and submit competitive quotes within 24 hours.' },
              { step: '3', title: 'Submit & Track',    desc: 'Your chosen pro finalizes, e-signs, and submits directly to the city. Track approval status in real time.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-lg mx-auto mb-4">{step}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mid-page CTA */}
      <section className="bg-blue-600 py-16">
        <div className="max-w-2xl mx-auto px-6 text-center text-white">
          <h2 className="text-3xl font-bold mb-2">Ready to Skip the Permit Maze?</h2>
          {isBeta && (
            <p className="text-amber-200 font-medium text-sm mb-2">
              ⚡ Beta pricing: {pv.display} (normally $199) — {spotsLeft} spots left
            </p>
          )}
          <p className="text-blue-100 mb-8">
            Fully refundable if we can&apos;t match you with a licensed pro within 48 hours.
          </p>
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="text-blue-200 line-through text-xl">$199</span>
            <span className="text-white text-4xl font-extrabold">{pv.display}</span>
          </div>
          <button
            onClick={() => openModal('mid_cta')}
            className="bg-white text-blue-700 hover:bg-blue-50 text-lg font-semibold px-10 py-4 rounded-xl shadow transition-all"
          >
            Get My Permit Packet — {pv.display}
          </button>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-10">Common Questions</h2>
        <div className="space-y-6">
          {[
            { q: "What does \"permit packet\" include?",  a: "A completed City of Austin ADU permit application, site plan checklist, zoning compliance summary, and a cover letter prepared by your matched expediter." },
            { q: "What if I'm not ready to submit yet?",  a: "No problem. The packet is prepared and ready when you are. Many homeowners get this done early to lock in expediter availability." },
            { q: "Is the deposit refundable?",             a: "Yes. If we cannot match you with a qualified Austin expediter within 48 hours, your deposit is fully refunded — no questions asked." },
            { q: "Do you work with any ADU type?",        a: "We currently support detached ADUs, garage conversions, and attached additions in Austin city limits. Decks and pools coming soon." },
            { q: "Why do I need to pay upfront?",         a: "The deposit covers your expediter's review time and the AI auto-fill work. It's held in escrow — you only lose it if you approve the match." },
          ].map(({ q, a }) => (
            <div key={q} className="border-b border-gray-100 pb-6">
              <h3 className="font-semibold text-gray-900 mb-2">{q}</h3>
              <p className="text-gray-500 text-sm">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pro CTA */}
      <section className="bg-gray-900 py-16">
        <div className="max-w-2xl mx-auto px-6 text-center text-white">
          <h2 className="text-2xl font-bold mb-3">Are You a Permit Expediter in Austin?</h2>
          <p className="text-gray-400 mb-6">
            Get matched with pre-qualified leads — pre-filled permit packets, no cold calls, no marketing spend.
          </p>
          <a
            href="/pro"
            onClick={() => trackProCtaClick({ source: 'footer_cta' })}
            className="inline-block bg-white text-gray-900 hover:bg-gray-100 font-semibold px-8 py-3 rounded-xl transition-all"
          >
            Apply as a Pro →
          </a>
        </div>
      </section>

      <footer className="text-center py-8 text-gray-400 text-sm border-t border-gray-100">
        © 2024 ExpediteHub · Austin, TX ·{' '}
        <a href="mailto:hello@expeditehub.com" className="hover:text-blue-600">hello@expeditehub.com</a>
        <span className="mx-2">·</span>
        <span className="text-xs text-gray-300">Stripe test mode active</span>
      </footer>

      {/* ── Modal (3 steps: intake → survey → redirecting) ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative max-h-[92vh] overflow-y-auto">

            {/* Close only on intake step */}
            {step === 'intake' && (
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            )}

            {/* ── STEP 1: Intake form ── */}
            {step === 'intake' && (
              <>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-gray-400 line-through text-sm">$199</span>
                  <span className="text-2xl font-extrabold text-blue-700">{pv.display}</span>
                  {isBeta && (
                    <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                      {pv.label}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Start Your Permit Packet</h2>
                <p className="text-gray-500 text-sm mb-5">
                  Pre-fill your Austin forms + get matched with a licensed expediter in 24h.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Email{' '}
                      <span className="text-gray-400 font-normal">(saved instantly)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email" required value={email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {emailSaved && (
                        <span className="absolute right-3 top-3 text-green-500 text-xs font-medium">✓ saved</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Type</label>
                    <select required value={projectType} onChange={(e) => setProjectType(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select project type...</option>
                      {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Property Address</label>
                    <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)}
                      placeholder="123 Main St, Austin, TX"
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                      <input type="text" required value={zip} onChange={(e) => setZip(e.target.value)}
                        placeholder="78701" maxLength={5} pattern="\d{5}"
                        className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Timeline</label>
                      <select required value={timeline} onChange={(e) => setTimeline(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Select...</option>
                        {TIMELINES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-4 rounded-xl text-base transition-all flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        One moment…
                      </>
                    ) : (
                      <>Continue → 2 quick questions, then checkout</>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-4 text-xs text-gray-400 pt-1">
                    <span>🔒 Stripe-secured</span>
                    <span>↩️ Refundable in 48h</span>
                    <span>🧪 Test mode</span>
                  </div>
                </form>
              </>
            )}

            {/* ── STEP 2: Micro-survey ── */}
            {step === 'survey' && (
              <>
                {/* Progress bar: step 2 of 3 */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex-1 h-1.5 bg-blue-500 rounded-full" />
                  <div className="flex-1 h-1.5 bg-blue-500 rounded-full" />
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full" />
                </div>

                <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">2 quick questions</div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Almost there!</h2>
                <p className="text-gray-500 text-sm mb-6">
                  Help us match you with the right expediter — takes 10 seconds.
                </p>

                <form onSubmit={handleSurveySubmit} className="space-y-6">
                  {/* Q1: Submit timeline */}
                  <div>
                    <p className="text-sm font-semibold text-gray-800 mb-3">
                      📅 When do you plan to submit your permit application?
                    </p>
                    <div className="space-y-2">
                      {[
                        'Within 30 days',
                        '1–3 months from now',
                        '3–6 months from now',
                        'Just researching options',
                      ].map((opt) => (
                        <label key={opt}
                          className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-all ${
                            surveyTimeline === opt
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-300'
                          }`}>
                          <input
                            type="radio" name="survey_timeline" value={opt}
                            checked={surveyTimeline === opt}
                            onChange={() => setSurveyTimeline(opt)}
                            className="accent-blue-600"
                          />
                          <span className="text-sm text-gray-700">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Q2: Plans ready */}
                  <div>
                    <p className="text-sm font-semibold text-gray-800 mb-3">
                      📐 Do you already have architectural plans or drawings?
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'yes_full',        label: '✅ Yes, full plans' },
                        { value: 'yes_partial',     label: '📝 Partial / sketches' },
                        { value: 'no_need_drafter', label: '🔍 No — need a drafter' },
                        { value: 'not_sure',        label: '🤷 Not sure yet' },
                      ].map(({ value, label }) => (
                        <label key={value}
                          className={`flex items-center gap-2 border rounded-xl px-3 py-3 cursor-pointer transition-all text-sm ${
                            surveyHasPlans === value
                              ? 'border-blue-500 bg-blue-50 font-medium'
                              : 'border-gray-200 hover:border-blue-300'
                          }`}>
                          <input
                            type="radio" name="survey_plans" value={value}
                            checked={surveyHasPlans === value}
                            onChange={() => setSurveyHasPlans(value)}
                            className="accent-blue-600"
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button type="submit"
                    disabled={surveyLoading || !surveyTimeline || !surveyHasPlans}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-4 rounded-xl text-base transition-all flex items-center justify-center gap-2">
                    {surveyLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Going to checkout…
                      </>
                    ) : (
                      <>🔒 Go to Secure Checkout — {pv.display}</>
                    )}
                  </button>

                  <div className="text-center">
                    <button type="button" onClick={skipSurvey}
                      className="text-xs text-gray-400 hover:text-gray-600 underline">
                      Skip and go straight to checkout
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* ── STEP 3: Redirecting ── */}
            {step === 'redirecting' && (
              <div className="text-center py-8">
                <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <p className="text-gray-600 font-medium">Taking you to secure checkout…</p>
                <p className="text-gray-400 text-sm mt-1">You&apos;ll be redirected in a moment.</p>
              </div>
            )}

          </div>
        </div>
      )}
    </main>
  )
}
