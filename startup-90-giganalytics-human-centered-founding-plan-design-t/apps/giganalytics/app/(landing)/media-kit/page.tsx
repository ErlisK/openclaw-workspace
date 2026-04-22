import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Media Kit — GigAnalytics',
  description: 'Brand assets, product screenshots, key stats, and copy for journalists, newsletter writers, and partnership mentions.',
}

const stats = [
  { value: '< 2 min', label: 'Time to first ROI insight' },
  { value: '4 platforms', label: 'Stripe · PayPal · Upwork · CSV' },
  { value: '7 formulas', label: 'Pre-built ROI calculations' },
  { value: '$0', label: 'Free tier (up to 2 streams)' },
]

const features = [
  'True hourly rate calculator — shows net income per hour after all fees',
  'Multi-stream ROI dashboard — compare 2–5 income sources side by side',
  'One-tap mobile timer + Google Calendar import',
  'Earnings heatmap — day/hour grid showing peak earning times',
  'A/B pricing experiments with statistical significance',
  'AI income insights (plain-language analysis of your data)',
  'Anonymous freelancer benchmark rates (Pro, opt-in)',
  'Price-to-target wizard — "charge X to hit $Y/month"',
]

const useCases = [
  'Freelance designer with Upwork, direct clients, and a Gumroad shop',
  'Developer with consulting, a SaaS, and course sales',
  'Writer with newsletter, Substack, and ghostwriting clients',
  'Creator with YouTube ad revenue, sponsorships, and digital products',
]

export default function MediaKitPage() {
  const appUrl = 'https://startup-90-giganalytics-human-cente.vercel.app'

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full mb-4">MEDIA KIT</span>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">GigAnalytics Media Kit</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need to write about, mention, or feature GigAnalytics. Grab assets, copy, and stats below.
          </p>
        </div>

        {/* One-liner + descriptions */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Product descriptions</h2>
          <div className="space-y-4">
            {[
              { length: 'One-liner (10 words)', text: 'GigAnalytics turns side-income chaos into clear hourly-rate ROI.' },
              { length: 'Short (25 words)', text: 'GigAnalytics is the ROI dashboard for people running 2–5 income streams. Import Stripe, PayPal, or CSV — and know your true hourly rate in 2 minutes.' },
              { length: 'Medium (60 words)', text: 'GigAnalytics turns raw payment data into actionable ROI decisions for multi-income freelancers. Connect Stripe, PayPal, or drop a CSV to instantly see your true hourly rate per stream, an earnings heatmap showing your best times to work, A/B pricing experiments, and AI-powered income recommendations. Built for side-income earners, not accountants.' },
            ].map(({ length, text }) => (
              <div key={length} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase">{length}</div>
                <div className="px-4 py-4 text-gray-800 text-sm leading-relaxed">{text}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Key stats */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Key stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map(({ value, label }) => (
              <div key={label} className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-center">
                <div className="text-2xl font-bold text-blue-700 mb-1">{value}</div>
                <div className="text-xs text-gray-600">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features list */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Key features</h2>
          <ul className="grid md:grid-cols-2 gap-3">
            {features.map((f, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <span className="text-blue-500 flex-shrink-0">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Use cases */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Who it's for</h2>
          <ul className="space-y-3">
            {useCases.map((u, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3">
                <span className="text-2xl">{'🎨📱✍️🎬'.split('')[i]}</span>
                <span>{u}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Pricing */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Pricing</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-2xl p-6">
              <div className="text-2xl font-bold mb-1">Free</div>
              <div className="text-gray-500 text-sm mb-3">Forever · No credit card</div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✓ Up to 2 income streams</li>
                <li>✓ CSV import</li>
                <li>✓ One-tap timer</li>
                <li>✓ ROI dashboard</li>
                <li>✓ Earnings heatmap</li>
              </ul>
            </div>
            <div className="border-2 border-blue-300 bg-blue-50 rounded-2xl p-6">
              <div className="text-2xl font-bold text-blue-700 mb-1">Pro — $29/mo</div>
              <div className="text-gray-500 text-sm mb-3">Everything in Free, plus:</div>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>✓ Unlimited income streams</li>
                <li>✓ AI income insights</li>
                <li>✓ A/B pricing experiments</li>
                <li>✓ Benchmark rate comparisons</li>
                <li>✓ Priority support</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Links */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Links</h2>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            {[
              { label: 'Live app', href: appUrl },
              { label: 'Sign up (free)', href: `${appUrl}/signup` },
              { label: 'Pricing page', href: `${appUrl}/pricing` },
              { label: 'Demo', href: `${appUrl}/demo` },
              { label: 'Changelog', href: `${appUrl}/changelog` },
              { label: 'RSS feed', href: `${appUrl}/api/rss` },
              { label: 'Docs', href: `${appUrl}/docs` },
              { label: 'Compare page', href: `${appUrl}/compare` },
            ].map(({ label, href }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer"
                className="flex justify-between items-center border border-gray-200 rounded-xl px-4 py-3 hover:border-blue-300 hover:bg-blue-50 transition-all group">
                <span className="text-gray-700 font-medium">{label}</span>
                <span className="text-gray-400 group-hover:text-blue-500 font-mono text-xs truncate max-w-[200px]">{href.replace('https://', '')}</span>
              </a>
            ))}
          </div>
        </section>

        {/* Contact */}
        <div className="bg-gray-900 text-white rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-2">Contact</h2>
          <p className="text-gray-400 mb-4">For partnership inquiries, features, reviews, or podcast appearances:</p>
          <div className="text-blue-400 font-mono">hello@hourlyroi.com</div>
          <p className="text-gray-500 text-sm mt-4">We respond to all genuine partnership and press inquiries within 48 hours.</p>
        </div>
      </div>
    </main>
  )
}
