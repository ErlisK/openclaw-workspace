'use client'

import { useState, useEffect } from 'react'
import { getAnalyticsContext, trackPageView, persistUtms, trackWaitlistSubmit, trackPricingClick, trackConsentChecked } from '@/lib/analytics'

export default function Home() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('designer')
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [pricingClicked, setPricingClicked] = useState<string | null>(null)
  const [interviewInterested, setInterviewInterested] = useState(false)
  const [analyticsCtx, setAnalyticsCtx] = useState<Record<string, string | null>>({})

  useEffect(() => {
    persistUtms()
    setAnalyticsCtx(getAnalyticsContext())
    trackPageView()
  }, [])

  async function handlePricingClick(tier: string) {
    setPricingClicked(tier)
    trackPricingClick(tier)
    try {
      await fetch('/api/pricing-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, action: 'cta_click', ...getAnalyticsContext() }),
      })
    } catch { /* silent */ }
    // Scroll to waitlist after fake-door click
    document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!consent) { setMessage('Please agree to the consent statement.'); setStatus('error'); return }
    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, role, consent,
          interview_interested: interviewInterested,
          pricing_tier_interest: pricingClicked,
          ...analyticsCtx,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus('success')
        setMessage(data.message || "You're on the list!")
        trackWaitlistSubmit(email)
      } else {
        setStatus('error')
        setMessage(data.error || 'Something went wrong.')
      }
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  return (
    <main className="min-h-screen bg-[#0d1117] text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎲</span>
            <span className="font-bold text-xl text-orange-400">PlaytestFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#pricing" className="text-gray-400 hover:text-white text-sm transition-colors hidden sm:block">Pricing</a>
            <a href="/onboarding" className="text-gray-400 hover:text-white text-sm transition-colors hidden sm:block">For Designers</a>
            <a href="/auth/login" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Start Free →
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-block bg-orange-500/20 text-orange-400 text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-orange-500/30">
            Built for Indie Tabletop & RPG Designers
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            Run Better Playtests.
            <br />
            <span className="text-orange-400">Ship Better Games.</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            PlaytestFlow replaces messy Discord threads and scattered Google Forms with a structured, trackable remote playtest pipeline. Save 5+ hours per test cycle. Iterate faster.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#waitlist" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors">
              Join the Waitlist
            </a>
            <a href="#how-it-works" className="border border-white/20 hover:border-white/40 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors">
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="px-6 py-20 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Sound Familiar?</h2>
          <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">Every indie designer we talk to is fighting the same battles.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: '😩',
                title: 'Tester Wrangling',
                desc: 'You spend more time recruiting and scheduling playtests than analyzing the results. Discord DMs, no-shows, and timezone chaos eat your weekends.',
              },
              {
                icon: '📊',
                title: 'Garbage-In Data',
                desc: 'Freeform feedback forms produce "it was fun!" responses. You have no structured data to identify where players actually got stuck.',
              },
              {
                icon: '🔄',
                title: 'Version Confusion',
                desc: 'Half your testers played v1.2, half played v1.3. You can\'t compare feedback because nobody tracked which rules they tested against.',
              },
              {
                icon: '⏰',
                title: 'Lost Hours',
                desc: 'Setup, consent forms, rule distribution, post-session surveys — each test takes 5-10 hours of admin overhead that doesn\'t scale.',
              },
              {
                icon: '💸',
                title: 'Tester Burnout',
                desc: 'Your playtest community burns out when there\'s no incentive system. Good testers ghost after one session because the process is painful.',
              },
              {
                icon: '📉',
                title: 'No Iteration Signal',
                desc: 'Without structured metrics, you\'re guessing which changes actually improved the game. Each iteration starts from scratch.',
              },
            ].map((p) => (
              <div key={p.title} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="text-3xl mb-3">{p.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{p.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">How PlaytestFlow Works</h2>
          <p className="text-gray-400 text-center mb-16 max-w-xl mx-auto">Three steps from "I need feedback" to "I have actionable insights."</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Upload & Recruit',
                desc: 'Upload your versioned rule sheet. Set roles, timing, and scripted tasks. Drop a recruit widget on your blog or share an invite link. Testers sign up, consent, and get auto-scheduled.',
              },
              {
                step: '02',
                title: 'Run the Session',
                desc: 'Testers get a structured session guide with timed tasks. You observe via built-in notes. Consent and rule-diff surveys fire automatically. No more forgetting to send forms.',
              },
              {
                step: '03',
                title: 'Analyze & Iterate',
                desc: 'Get structured feedback, time-on-task data, failure points, and anonymized quotes — all version-tagged. See exactly what changed between v1.2 and v1.3. Ship confidently.',
              },
            ].map((s) => (
              <div key={s.step} className="relative">
                <div className="text-6xl font-bold text-white/5 absolute -top-4 -left-2">{s.step}</div>
                <div className="relative bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 rounded-2xl p-6">
                  <div className="text-orange-400 font-mono text-sm font-bold mb-3">STEP {s.step}</div>
                  <h3 className="font-semibold text-xl mb-3">{s.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hypotheses / What We're Testing */}
      <section className="px-6 py-20 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block bg-blue-500/20 text-blue-400 text-sm font-medium px-4 py-1.5 rounded-full mb-4 border border-blue-500/30">
              Building in Public
            </div>
            <h2 className="text-3xl font-bold mb-4">What We&apos;re Testing</h2>
            <p className="text-gray-400 max-w-xl mx-auto">We&apos;re running our own lean startup playtest. Here are the hypotheses we&apos;re actively validating with real designers.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                id: 'H1',
                color: 'orange',
                title: 'Structured Pipeline Saves Time',
                desc: 'Designers want a repeatable, trackable remote playtest pipeline that saves 5+ hours per test cycle.',
                status: 'Testing',
              },
              {
                id: 'H2',
                color: 'blue',
                title: 'Lightweight Incentives Work',
                desc: 'Sufficient quality testers can be recruited and retained with small incentives (gift cards, reward codes, recognition).',
                status: 'Testing',
              },
              {
                id: 'H3',
                color: 'purple',
                title: 'Standardized Feedback Quality',
                desc: 'Structured session templates improve feedback completion rates and data quality vs. freeform forms.',
                status: 'Testing',
              },
              {
                id: 'H4',
                color: 'green',
                title: 'WTP $19–$79/month',
                desc: 'Designers will pay $19–$79/month when time savings and iteration speed are clearly demonstrated.',
                status: 'Testing',
              },
              {
                id: 'H5',
                color: 'red',
                title: 'Widget over Discord',
                desc: 'Small teams prefer an embedded recruit widget over managing playtest logistics in Discord threads.',
                status: 'Testing',
              },
            ].map((h) => (
              <div key={h.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-gray-500">{h.id}</span>
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/30">{h.status}</span>
                </div>
                <h3 className="font-semibold mb-2">{h.title}</h3>
                <p className="text-gray-400 text-xs leading-relaxed">{h.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-500 text-sm mt-8">
            Want to help us validate these? <a href="#waitlist" className="text-orange-400 underline">Join the waitlist</a> and we&apos;ll reach out for a 20-min interview.
          </p>
        </div>
      </section>

      {/* Social Proof */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12">Built for Creators Like You</h2>
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              { stat: '5–10 hrs', label: 'Saved per playtest cycle' },
              { stat: '3×', label: 'More feedback per session' },
              { stat: '< 5 min', label: 'Tester onboarding time' },
            ].map((s) => (
              <div key={s.stat} className="text-center">
                <div className="text-4xl font-bold text-orange-400 mb-2">{s.stat}</div>
                <div className="text-gray-400 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-sm italic">* Projected based on designer interviews. We&apos;re building in the open — join us to validate.</p>
        </div>
      </section>

      {/* Fake-Door Pricing */}
      <section id="pricing" className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-4">
            <div className="inline-block bg-orange-500/20 text-orange-400 text-sm font-medium px-4 py-1.5 rounded-full mb-4 border border-orange-500/30">
              Simple, Transparent Pricing
            </div>
            <h2 className="text-3xl font-bold mb-4">Pay for Time Saved, Not for Features</h2>
            <p className="text-gray-400 max-w-xl mx-auto mb-2">Save 5+ hours per test cycle. At $25/hour designer rate, PlaytestFlow pays for itself in the first session.</p>
            <p className="text-orange-400 text-sm font-medium">🚧 Launching soon — join the waitlist to lock in founding member pricing</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {/* Starter */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col">
              <div className="mb-6">
                <div className="text-sm text-gray-400 font-medium mb-1">STARTER</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold">$19</span>
                  <span className="text-gray-400">/month</span>
                </div>
                <p className="text-gray-500 text-sm">For solo designers running occasional tests</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  '3 active playtest projects',
                  'Up to 10 testers per session',
                  'Session templates (roles, tasks, timing)',
                  'Structured feedback forms',
                  'Version-tagged rule uploads',
                  'Invite link + recruit page',
                  'Basic analytics dashboard',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-green-400 mt-0.5">✓</span>{f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handlePricingClick('starter')}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors border ${
                  pricingClicked === 'starter'
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'border-white/20 hover:border-orange-500 hover:text-orange-400 text-white'
                }`}
              >
                {pricingClicked === 'starter' ? 'Join waitlist ↓' : 'Get Early Access'}
              </button>
            </div>

            {/* Pro — highlighted */}
            <div className="bg-gradient-to-b from-orange-500/15 to-orange-500/5 border border-orange-500/40 rounded-2xl p-6 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full">MOST POPULAR</span>
              </div>
              <div className="mb-6">
                <div className="text-sm text-orange-400 font-medium mb-1">PRO</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold">$49</span>
                  <span className="text-gray-400">/month</span>
                </div>
                <p className="text-gray-400 text-sm">For active designers shipping games</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  'Unlimited playtest projects',
                  'Up to 50 testers per session',
                  'Everything in Starter',
                  'Reward code distribution',
                  'Rule diff viewer (v1.2 → v1.3)',
                  'Time-on-task & failure point metrics',
                  'Embeddable recruit widget',
                  'Consent & NDA automation',
                  'CSV/JSON export',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-orange-400 mt-0.5">✓</span>{f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handlePricingClick('pro')}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
                  pricingClicked === 'pro'
                    ? 'bg-orange-600 text-white'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
              >
                {pricingClicked === 'pro' ? 'Join waitlist ↓' : 'Get Early Access'}
              </button>
            </div>

            {/* Studio */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col">
              <div className="mb-6">
                <div className="text-sm text-gray-400 font-medium mb-1">STUDIO</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold">$79</span>
                  <span className="text-gray-400">/month</span>
                </div>
                <p className="text-gray-500 text-sm">For small studios and prolific publishers</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  'Everything in Pro',
                  'Up to 5 team seats',
                  'Unlimited testers per session',
                  'Custom branding on recruit pages',
                  'Tester reputation scoring',
                  'Zapier / webhook integrations',
                  'Priority support',
                  'Early access to new features',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-green-400 mt-0.5">✓</span>{f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handlePricingClick('studio')}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors border ${
                  pricingClicked === 'studio'
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'border-white/20 hover:border-orange-500 hover:text-orange-400 text-white'
                }`}
              >
                {pricingClicked === 'studio' ? 'Join waitlist ↓' : 'Get Early Access'}
              </button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">All plans include a 14-day free trial. No credit card required to join the waitlist.</p>
            <p className="text-gray-600 text-xs mt-2">Founding member pricing locked in for life — prices may increase at launch.</p>
          </div>
        </div>
      </section>

      {/* Interview Scheduling CTA */}
      <section id="interview" className="px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="text-5xl">🎤</div>
              <div className="flex-1">
                <div className="inline-block bg-blue-500/20 text-blue-400 text-xs font-medium px-3 py-1 rounded-full mb-3 border border-blue-500/30">
                  20-Min Research Interview
                </div>
                <h2 className="text-2xl font-bold mb-2">Help Shape This Product</h2>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">
                  We&apos;re doing 20 discovery interviews with indie tabletop and RPG designers. No pitch — just 20 minutes to talk through your current remote playtest workflow. In return, you get 3 months free when we launch.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="#waitlist"
                    onClick={() => setInterviewInterested(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
                  >
                    I&apos;d love to chat →
                  </a>
                  <a
                    href="mailto:scide-founder@agentmail.to?subject=PlaytestFlow%20Interview&body=Hi%2C%20I%27d%20like%20to%20do%20a%2020-min%20interview%20about%20my%20remote%20playtest%20workflow."
                    className="border border-white/20 hover:border-blue-500 text-white hover:text-blue-400 px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
                  >
                    Email us directly
                  </a>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-3 gap-4 text-center">
              {[
                { n: '20', l: 'Interviews planned' },
                { n: '0', l: 'Completed so far' },
                { n: '3 mo', l: 'Free for interviewees' },
              ].map(s => (
                <div key={s.l}>
                  <div className="text-xl font-bold text-blue-400">{s.n}</div>
                  <div className="text-xs text-gray-500">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Waitlist Form */}
      <section id="waitlist" className="px-6 py-20 bg-gradient-to-b from-orange-500/5 to-transparent">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4">Get Early Access</h2>
            <p className="text-gray-400">Join the waitlist. Early members get 3 months free + help shape the product through interviews.</p>
          </div>

          {status === 'success' ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold mb-2">You&apos;re on the list!</h3>
              <p className="text-gray-400">{message}</p>
              <p className="text-gray-500 text-sm mt-4">We&apos;ll reach out within 48 hours for an optional 20-min interview.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">I am a...</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
                >
                  <option value="designer">Tabletop/RPG Designer</option>
                  <option value="indie-studio">Indie Studio</option>
                  <option value="tester">Playtest Enthusiast</option>
                  <option value="publisher">Publisher/Producer</option>
                </select>
              </div>

              {/* IRB-lite Consent */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h4 className="font-medium text-sm mb-2 text-gray-300">Research Participation Consent</h4>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">
                  By joining this waitlist, you agree to participate in our product discovery research. This may include: a 20-minute
                  interview about your playtest workflow, optional surveys about feature priorities, and use of anonymized,
                  aggregated insights to guide product development. <strong className="text-gray-400">No personal data will be shared with
                  third parties.</strong> Participation is entirely voluntary. You may withdraw at any time by emailing
                  <a href="mailto:research@playtestflow.com" className="text-orange-400 ml-1">research@playtestflow.com</a>.
                  Your feedback will be anonymized before any publication or sharing.
                </p>
                <label className="flex items-start gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => { setConsent(e.target.checked); trackConsentChecked(e.target.checked) }}
                    className="mt-0.5 accent-orange-500"
                  />
                  <span className="text-sm text-gray-300">
                    I understand and agree to participate in product research. I can withdraw at any time.
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={interviewInterested}
                    onChange={(e) => setInterviewInterested(e.target.checked)}
                    className="mt-0.5 accent-orange-500"
                  />
                  <span className="text-sm text-gray-300">
                    <span className="text-orange-400 font-medium">Yes, I&apos;d love a 20-min interview</span> — I&apos;ll get 3 months free for my time.
                  </span>
                </label>
              </div>

              {status === 'error' && (
                <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading' || !consent}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold text-lg transition-colors"
              >
                {status === 'loading' ? 'Joining...' : 'Join the Waitlist — Free'}
              </button>
              <p className="text-center text-gray-500 text-xs">No spam. Unsubscribe anytime. Early members get 3 months free.</p>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎲</span>
            <span className="font-bold text-orange-400">PlaytestFlow</span>
          </div>
          <p className="text-gray-500 text-sm">Built by indie designers, for indie designers. © 2025 PlaytestFlow.</p>
          <div className="flex gap-4 text-sm text-gray-500">
            <a href="mailto:hello@playtestflow.com" className="hover:text-white transition-colors">Contact</a>
            <a href="mailto:research@playtestflow.com" className="hover:text-white transition-colors">Research</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
