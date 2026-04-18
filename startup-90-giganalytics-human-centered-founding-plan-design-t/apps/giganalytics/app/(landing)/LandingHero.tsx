'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { type LandingVariant } from '@/lib/landing/variants'
import { trackLandingVariant, trackCtaClick } from '@/lib/posthog/provider'

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

export default function LandingHero({ variant }: { variant: LandingVariant }) {
  const accent = ACCENT_MAP[variant.accentColor] ?? ACCENT_MAP.blue

  useEffect(() => {
    trackLandingVariant(variant.name)
  }, [variant.name])

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="font-bold text-gray-900 text-lg">GigAnalytics</div>
        <div className="flex items-center gap-3">
          <Link href="/demo" className="text-sm text-gray-600 hover:text-gray-900">Demo</Link>
          <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900">Pricing</Link>
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Log in</Link>
          <Link href="/signup"
            onClick={() => trackCtaClick(variant.name, 'nav_signup')}
            className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${accent.cta}`}>
            Get started free
          </Link>
        </div>
      </nav>

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
            href="/signup"
            onClick={() => trackCtaClick(variant.name, 'hero_primary')}
            className={`px-8 py-4 rounded-xl text-base font-semibold transition-colors shadow-sm ${accent.cta}`}
          >
            {variant.cta_primary}
          </Link>
          <Link
            href="/login"
            onClick={() => trackCtaClick(variant.name, 'hero_secondary')}
            className="px-8 py-4 rounded-xl text-base font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/demo"
            onClick={() => trackCtaClick(variant.name, 'hero_demo')}
            className="px-8 py-4 rounded-xl text-base font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            See a live demo
          </Link>
        </div>

        {/* Social proof */}
        <p className="text-sm text-gray-400 mb-12">{variant.social_proof}</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-16">
          {[variant.stat1, variant.stat2, variant.stat3].map((stat, i) => (
            <div key={i} className={`rounded-xl border p-4 ${accent.border} bg-gray-50`}>
              <div className={`text-2xl font-bold ${accent.stat} mb-1`}>{stat.value}</div>
              <div className="text-xs text-gray-500 leading-tight">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-5 text-left max-w-4xl mx-auto mb-16">
          {variant.features.map((f, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-800 mb-2 text-sm">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>

        {/* Sample data CTA */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 mb-16">
          <div className="text-2xl mb-3">🎲</div>
          <h2 className="font-bold text-gray-800 text-lg mb-2">See it in action — no account needed</h2>
          <p className="text-sm text-gray-500 mb-4">
            Load sample data from our demo account and explore the full dashboard right now.
          </p>
          <Link href="/demo"
            onClick={() => trackCtaClick(variant.name, 'demo_cta')}
            className={`inline-block px-6 py-3 rounded-xl text-sm font-semibold transition-colors ${accent.cta}`}>
            Try with sample data →
          </Link>
        </div>


      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 px-6 text-center text-xs text-gray-400">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-4">
          <span>© {new Date().getFullYear()} GigAnalytics</span>
          <Link href="/pricing" className="hover:text-gray-600">Pricing</Link>
          <Link href="/demo" className="hover:text-gray-600">Demo</Link>
          <Link href="/login" className="hover:text-gray-600">Log in</Link>
          <Link href="/signup" className="hover:text-gray-600">Sign up free</Link>
          <Link href="/terms" className="hover:text-gray-600">Terms</Link>
          <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
        </div>
      </footer>
    </div>
  )
}
