'use client'

import { useEffect, useCallback, useState } from 'react'
import Link from 'next/link'
import { type LandingVariant } from '@/lib/landing/variants'
import UrgencyBanner from '@/components/UrgencyBanner'
import Testimonials from '@/components/Testimonials'
import StickyCtaBar from '@/components/StickyCtaBar'
import { trackLandingVariant, trackCtaClick } from '@/lib/posthog/provider'
import { getSessionId } from '@/lib/utm'

function MiniCalculator({ accentCta, variantId }: { accentCta: string; variantId: string }) {
  const [revenue, setRevenue] = useState('')
  const [hours, setHours] = useState('')
  const [fees, setFees] = useState('20')
  const [result, setResult] = useState<{ gross: number; net: number; lost: number } | null>(null)

  function calculate() {
    const rev = parseFloat(revenue)
    const hrs = parseFloat(hours)
    const feesPct = parseFloat(fees) / 100
    if (!rev || !hrs || hrs <= 0) return
    const gross = rev / hrs
    const net = (rev * (1 - feesPct)) / hrs
    const lost = gross - net
    setResult({ gross, net, lost })
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ph = (window as any).posthog
      if (ph?.capture) ph.capture('mini_calculator_used', { variant: variantId })
    } catch { /* best-effort */ }
  }

  return (
    <div className="max-w-2xl mx-auto mb-16 text-left">
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-200 rounded-2xl p-6">
        <div className="text-center mb-5">
          <span className="text-2xl">⚡</span>
          <h2 className="text-lg font-bold text-gray-900 mt-1">Quick ROI check — 30 seconds</h2>
          <p className="text-sm text-gray-500 mt-1">See your true hourly rate right now, no account needed.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Monthly revenue ($)</label>
            <input
              type="number"
              placeholder="e.g. 3200"
              value={revenue}
              onChange={e => setRevenue(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Hours worked</label>
            <input
              type="number"
              placeholder="e.g. 60"
              value={hours}
              onChange={e => setHours(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Platform fee %</label>
            <input
              type="number"
              placeholder="e.g. 20"
              value={fees}
              onChange={e => setFees(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        </div>
        <button
          onClick={calculate}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${accentCta}`}
        >
          Calculate my true rate
        </button>
        {result && (
          <div className="mt-4 grid sm:grid-cols-3 gap-3 text-center">
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="text-xs text-gray-500 mb-0.5">Gross rate</div>
              <div className="text-xl font-bold text-gray-900">${result.gross.toFixed(2)}<span className="text-xs font-normal">/hr</span></div>
            </div>
            <div className="bg-white rounded-xl border border-blue-200 p-3">
              <div className="text-xs text-blue-600 mb-0.5 font-medium">True net rate</div>
              <div className="text-xl font-bold text-blue-700">${result.net.toFixed(2)}<span className="text-xs font-normal">/hr</span></div>
            </div>
            <div className="bg-white rounded-xl border border-red-200 p-3">
              <div className="text-xs text-red-500 mb-0.5">Lost to fees/hr</div>
              <div className="text-xl font-bold text-red-600">${result.lost.toFixed(2)}<span className="text-xs font-normal">/hr</span></div>
            </div>
            <div className="sm:col-span-3 text-center pt-2">
              <p className="text-sm text-gray-600 mb-3">Track <strong>all</strong> your streams, ad spend, and time in one place →</p>
              <Link
                href={`/signup?utm_source=mini_calc&utm_medium=landing&utm_campaign=calculator&v=${variantId}`}
                className={`inline-block px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors ${accentCta}`}
              >
                Get my full dashboard free
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const ACCENT_MAP: Record<string, { badge: string; cta: string; stat: string; border: string }> = {
  blue: {
    badge: 'bg-blue-100 text-blue-700',
    cta: 'bg-blue-600 hover:bg-blue-700 text-white',
    stat: 'text-blue-600',
    border: 'border-blue-200',
  },
  green: {
    badge: 'bg-green-100 text-green-700',
    cta: 'bg-green-600 hover:bg-green-700 text-white',
    stat: 'text-green-600',
    border: 'border-green-200',
  },
  purple: {
    badge: 'bg-purple-100 text-purple-700',
    cta: 'bg-purple-600 hover:bg-purple-700 text-white',
    stat: 'text-purple-600',
    border: 'border-purple-200',
  },
}

/** Record a funnel step server-side (best-effort, never throws) */
function recordFunnelStep(
  step: string,
  variant: string,
  extra: Record<string, unknown> = {}
): void {
  const sessionId = getSessionId()
  fetch('/api/funnel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step, variant, session_id: sessionId, properties: extra }),
  }).catch(() => {})
}

export default function LandingHero({ variant }: { variant: LandingVariant }) {
  const accent = ACCENT_MAP[variant.accentColor] ?? ACCENT_MAP.blue

  // ─── Experiment exposure tracking ──────────────────────────────────────────
  useEffect(() => {
    // 1. PostHog client-side tracking
    trackLandingVariant(variant.name)

    // 2. Server-side funnel step: landing_viewed
    recordFunnelStep('landing_viewed', variant.id, { variant_name: variant.name })

    // 3. Register with /api/experiments (persists assignment server-side)
    const sessionId = getSessionId()
    fetch(`/api/experiments?v=${variant.id}&session_id=${sessionId}`)
      .catch(() => {})

    // 4. Persist variant in sessionStorage for signup attribution
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('ga_experiment_variant', variant.id)
        sessionStorage.setItem('ga_experiment_name', variant.name)
      }
    } catch {}
  }, [variant.id, variant.name])

  const handleCtaClick = useCallback((label: string, funnelStep?: string) => {
    trackCtaClick(variant.name, label)
    if (funnelStep) {
      recordFunnelStep(funnelStep, variant.id, { cta_label: label })
    }
  }, [variant.id, variant.name])

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Urgency Banner */}
      <UrgencyBanner />
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="font-bold text-gray-900 text-lg" data-testid="nav-logo">GigAnalytics</div>
        <div className="flex items-center gap-3">
          <Link href="/calculator" className="text-sm text-gray-600 hover:text-gray-900">Calculator</Link>
          <Link href="/demo" className="text-sm text-gray-600 hover:text-gray-900">Demo</Link>
          <Link href="/docs" className="text-sm text-gray-600 hover:text-gray-900">Docs</Link>
          <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900" data-testid="nav-pricing-link">Pricing</Link>
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Log in</Link>
          <Link
            href="/signup"
            onClick={() => handleCtaClick('nav_signup', 'landing_cta_clicked')}
            className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${accent.cta}`}
          >
            Get started free
          </Link>
        </div>
      </nav>

      {/* Experiment badge — dev only */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="bg-gray-50 border-b border-gray-100 py-1 px-6 text-center">
          <span className="text-xs text-gray-500 font-mono">
            variant={variant.id} · {variant.name}
            {' '}·{' '}
            <span className="text-gray-300">try ?v=1 ?v=2 ?v=3</span>
          </span>
        </div>
      )}

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 mb-6">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${accent.badge}`}>
            {variant.badge}
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight max-w-3xl mx-auto">
          {variant.headline}
        </h1>

        {/* Subheadline */}
        <p className="text-xl text-gray-500 mb-8 max-w-2xl mx-auto leading-relaxed">
          {variant.subheadline}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <Link
            href={`/signup?utm_source=landing&utm_medium=hero&utm_campaign=organic&v=${variant.id}`}
            onClick={() => handleCtaClick('hero_primary', 'landing_cta_clicked')}
            className={`px-8 py-4 rounded-xl text-base font-semibold transition-colors shadow-sm ${accent.cta}`}
            data-testid="hero-cta-primary"
          >
            {variant.cta_primary}
          </Link>
          <Link
            href="/login"
            onClick={() => handleCtaClick('hero_secondary')}
            className="px-8 py-4 rounded-xl text-base font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/demo"
            onClick={() => handleCtaClick('hero_demo')}
            className="px-8 py-4 rounded-xl text-base font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            See a live demo
          </Link>
        </div>

        {/* Social proof */}
        <p className="text-sm text-gray-500 mb-4">{variant.social_proof}</p>

        {/* Trust signals */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-12 text-xs text-gray-500">
          <span className="flex items-center gap-1">✅ No credit card required</span>
          <span className="text-gray-200">|</span>
          <span className="flex items-center gap-1">⚡ First ROI dashboard in ~11 min</span>
          <span className="text-gray-200">|</span>
          <span className="flex items-center gap-1">🔒 Privacy-first · your data stays yours</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-16">
          {[variant.stat1, variant.stat2, variant.stat3].map((stat, i) => (
            <div key={i} className={`rounded-xl border p-4 ${accent.border} bg-gray-50`}>
              <div className={`text-2xl font-bold ${accent.stat} mb-1`}>{stat.value}</div>
              <div className="text-xs text-gray-500 leading-tight">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Product Dashboard Preview */}
        <div className="max-w-4xl mx-auto mb-16">
          <p className="text-xs text-gray-500 uppercase tracking-widest text-center mb-4">What your dashboard looks like</p>
          <div className="rounded-2xl border border-gray-200 shadow-xl overflow-hidden bg-white">
            {/* Browser chrome */}
            <div className="bg-gray-100 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-500 text-center border border-gray-200">
                app.hourlyroi.com/dashboard
              </div>
            </div>
            {/* Dashboard content */}
            <div className="p-5 bg-gray-50">
              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Total Revenue', value: '$8,420', color: 'blue' },
                  { label: 'True Hourly Rate', value: '$53.97/hr', color: 'green' },
                  { label: 'Hours Tracked', value: '156h', color: 'purple' },
                  { label: 'Best Stream', value: '$87.50/hr', color: 'orange' },
                ].map(s => (
                  <div key={s.label} className={`bg-${s.color}-50 border border-${s.color}-100 rounded-xl p-3`}>
                    <div className="text-xs text-gray-500 mb-0.5">{s.label}</div>
                    <div className="text-base font-bold text-gray-900">{s.value}</div>
                  </div>
                ))}
              </div>
              {/* Mini ROI table */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 overflow-x-auto">
                <div className="text-xs font-semibold text-gray-700 mb-3">Stream ROI Breakdown</div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-100">
                      <th className="text-left pb-2">Stream</th>
                      <th className="text-right pb-2">Revenue</th>
                      <th className="text-right pb-2">Net Rate</th>
                      <th className="text-right pb-2">ROI Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'Direct Clients', rev: '$3,400', rate: '$73.91/hr', roi: 97, color: 'green' },
                      { name: 'Upwork Development', rev: '$3,200', rate: '$37.78/hr', roi: 88, color: 'blue' },
                      { name: 'Fiverr Design', rev: '$1,820', rate: '$38.32/hr', roi: 82, color: 'blue' },
                    ].map(r => (
                      <tr key={r.name} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 font-medium text-gray-700">{r.name}</td>
                        <td className="py-2 text-right text-gray-600">{r.rev}</td>
                        <td className="py-2 text-right font-semibold text-blue-700">{r.rate}</td>
                        <td className="py-2 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${r.color}-100 text-${r.color}-700`}>{r.roi}/100</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-gray-500 mt-3">Your real data — not a spreadsheet. Connect Stripe, PayPal, or import CSV in minutes.</p>
        </div>

        {/* Inline Mini-Calculator */}
        <MiniCalculator accentCta={accent.cta} variantId={variant.id} />

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-5 text-left max-w-4xl mx-auto mb-16">
          {variant.features.map((f, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors"
              data-feature={i}
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-800 mb-2 text-sm">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <Testimonials />

        {/* Financial disclaimer */}
        <p className="text-xs text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
          GigAnalytics provides data analytics tools only and does not provide financial, tax, or
          investment advice. Individual results vary.
        </p>

        {/* Free Audit CTA */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-8 mb-6">
          <div className="text-2xl mb-3">🎯</div>
          <h2 className="font-bold text-gray-800 text-lg mb-2">
            Not ready to sign up? Get a free manual audit
          </h2>
          <p className="text-sm text-gray-500 mb-4 leading-relaxed">
            Tell us your income streams and we&apos;ll personally calculate your true hourly rate across each one — free, no account needed. Most people are surprised by which stream actually wins.
          </p>
          <Link
            href="/free-audit"
            onClick={() => handleCtaClick('free_audit_cta')}
            className="inline-block px-6 py-3 rounded-xl text-sm font-semibold transition-colors bg-blue-600 hover:bg-blue-700 text-white"
          >
            Request my free ROI audit →
          </Link>
          <p className="text-xs text-gray-500 mt-3">🔒 Private · No spam · We delete your data after analysis</p>
        </div>

        {/* Sample data CTA */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 mb-16">
          <div className="text-2xl mb-3">🎲</div>
          <h2 className="font-bold text-gray-800 text-lg mb-2">
            See it in action — no account needed
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Load sample data from our demo account and explore the full dashboard right now.
          </p>
          <Link
            href="/demo"
            onClick={() => handleCtaClick('demo_cta')}
            className={`inline-block px-6 py-3 rounded-xl text-sm font-semibold transition-colors ${accent.cta}`}
          >
            Try with sample data →
          </Link>
        </div>
      </main>

      {/* Sticky CTA bar */}
      <StickyCtaBar />

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 px-6 text-center text-xs text-gray-500">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-4">
          <span>© {new Date().getFullYear()} GigAnalytics</span>
          <Link href="/pricing" className="hover:text-gray-600">Pricing</Link>
          <Link href="/free-audit" className="hover:text-gray-600">Free Audit</Link>
          <Link href="/integrations" className="hover:text-gray-600">Integrations</Link>
          <Link href="/demo" className="hover:text-gray-600">Demo</Link>
          <Link href="/blog" className="hover:text-gray-600">Blog</Link>
          <Link href="/calculator" className="hover:text-gray-600">Calculator</Link>
          <Link href="/for-creators" className="hover:text-gray-600">For Creators</Link>
          <Link href="/launch" className="hover:text-gray-600">Launch</Link>
          <Link href="/login" className="hover:text-gray-600">Log in</Link>
          <Link
            href="/signup?utm_source=landing&utm_medium=footer&utm_campaign=organic"
            className="hover:text-gray-600"
          >
            Sign up free
          </Link>
          <Link href="/terms" className="hover:text-gray-600">Terms</Link>
          <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
          <Link href="/contact" className="hover:text-gray-600">Contact</Link>
          <a href="mailto:hello@hourlyroi.com" className="hover:text-gray-600">hello@hourlyroi.com</a>
          <a href="mailto:support@hourlyroi.com" className="hover:text-gray-600">support@hourlyroi.com</a>
        </div>
      </footer>
    </div>
  )
}
