import Link from 'next/link'
import { PricingTable } from '@/components/PricingTable'

const FREE_PRICE_ID = 'free'
const PRO_PRICE_ID = process.env.PRICE_ID_PRO_MONTHLY ?? 'price_pro_monthly'

const plans = [
  {
    name: 'Free',
    price: '$0',
    interval: 'mo',
    description: 'Perfect for getting started with 1–2 income streams.',
    priceId: FREE_PRICE_ID,
    features: [
      'Up to 2 income streams',
      'CSV import',
      'One-tap mobile timer',
      'Basic ROI dashboard',
      'Hourly rate calculator',
      'Earnings heatmap',
    ],
    mode: 'payment' as const,
    popular: false,
    isFree: true,
  },
  {
    name: 'Pro',
    price: '$29',
    interval: 'mo',
    description: 'For serious multi-income earners who want every edge.',
    priceId: PRO_PRICE_ID,
    features: [
      'Unlimited income streams',
      'Stripe & PayPal sync',
      'AI insights & recommendations',
      'A/B pricing experiments',
      'Benchmark heatmap access',
      'Price suggestions for income targets',
      'Calendar inference for time tracking',
      'Priority support',
    ],
    mode: 'subscription' as const,
    popular: true,
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="font-bold text-gray-900 text-lg">GigAnalytics</Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Log in</Link>
          <Link href="/signup" className="text-sm px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700">
            Get started free
          </Link>
        </div>
      </nav>

      {/* Header */}
      <div className="text-center pt-16 pb-4 px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Simple, transparent pricing</h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          Start free. Upgrade when you need more. No hidden fees.
        </p>
      </div>

      {/* Pricing table - always renders with static fallback */}
      <PricingTable
        plans={plans}
        title=""
        subtitle=""
      />

      {/* FAQ */}
      <div className="max-w-2xl mx-auto px-6 pb-16">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">Frequently asked questions</h2>
        <div className="space-y-4">
          {[
            { q: 'Can I cancel anytime?', a: 'Yes. Cancel anytime from your billing settings. No questions asked.' },
            { q: 'What counts as an income stream?', a: 'Any income source — Upwork, Fiverr, Stripe, direct clients, consulting, etc. Free plan supports 2, Pro is unlimited.' },
            { q: 'Is my financial data secure?', a: 'Yes. All data is encrypted at rest and in transit. We never sell your data. See our Privacy Policy for details.' },
            { q: 'Do you offer refunds?', a: 'If you\'re not satisfied within 14 days, contact us for a full refund.' },
          ].map(({ q, a }, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4">
              <div className="font-semibold text-gray-800 mb-1 text-sm">{q}</div>
              <div className="text-gray-500 text-sm">{a}</div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <p className="text-sm text-gray-400">
            Questions?{' '}
            <a href="mailto:hello@giganalytics.app" className="text-blue-600 hover:underline">Contact us</a>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 px-6 text-center text-xs text-gray-400">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-4">
          <span>© {new Date().getFullYear()} GigAnalytics</span>
          <Link href="/terms" className="hover:text-gray-600">Terms</Link>
          <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
        </div>
      </footer>
    </div>
  )
}
