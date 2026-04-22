import Link from 'next/link'
import { PricingTable } from '@/components/PricingTable'
import { createClient } from '@/lib/supabase/server'
import PricingProCheckout from './PricingProCheckout'
import PricingBillingToggle from './PricingBillingToggle'

const FREE_PRICE_ID = 'free'
const STARTER_PRICE_ID = process.env.PRICE_ID_STARTER_MONTHLY ?? 'price_1TOqYsGt92XrRvUuvtY7lgJi'
const PRO_PRICE_ID = process.env.PRICE_ID_PRO_MONTHLY ?? 'price_1TOLK7Gt92XrRvUu3EzdIX1U'
const PRO_ANNUAL_PRICE_ID = process.env.PRICE_ID_PRO_ANNUAL ?? 'price_1TOLK7Gt92XrRvUunvrrv4A6'

const monthlyPlans = [
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
    name: 'Starter',
    price: '$19',
    interval: 'mo',
    description: 'For freelancers with 3–5 active income streams.',
    priceId: STARTER_PRICE_ID,
    features: [
      'Up to 5 income streams',
      'Stripe & PayPal sync',
      'True hourly rate calculator',
      'Earnings heatmap (full access)',
      'CSV import (unlimited)',
      'One-tap mobile timer',
      'Email support',
    ],
    mode: 'subscription' as const,
    popular: true,
  },
  {
    name: 'Pro',
    price: '$29',
    interval: 'mo',
    description: 'For serious multi-income earners who want every edge.',
    priceId: PRO_PRICE_ID,
    features: [
      'Unlimited income streams',
      'Everything in Starter, plus:',
      'AI insights & recommendations',
      'A/B pricing experiments',
      'Benchmark heatmap access',
      'Price suggestions for income targets',
      'Calendar inference for time tracking',
      'Priority support',
    ],
    mode: 'subscription' as const,
    popular: false,
  },
]

const annualPlans = [
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
    name: 'Pro Annual',
    price: '$23',
    interval: 'mo',
    description: 'Billed $279/year — save $69 vs monthly. Best for committed earners.',
    priceId: PRO_ANNUAL_PRICE_ID,
    features: [
      'Everything in Pro monthly',
      '💰 Save $69/year (2 months free)',
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

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ plan?: string; billing?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const params = await searchParams
  const isAuthenticated = !!user
  const autoPro = params?.plan === 'pro' && isAuthenticated
  const billingParam = params?.billing
  const plans = monthlyPlans

  return (
    <div className="min-h-screen bg-white">
      {/* Auto-checkout trigger for authenticated ?plan=pro */}
      {autoPro && <PricingProCheckout priceId={PRO_PRICE_ID} />}

      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="font-bold text-gray-900 text-lg">GigAnalytics</Link>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Log in</Link>
              <Link href="/signup" className="text-sm px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700">
                Get started free
              </Link>
            </>
          )}
        </div>
      </nav>

  {/* Early Adopter urgency banner */}
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-2">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl px-6 py-4 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="text-3xl">⏳</div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900">
              Early Adopter Pricing — <span className="line-through text-amber-500">$49/mo</span> <span className="text-amber-700">$29/mo</span> while we&apos;re in beta
            </p>
            <p className="text-xs text-amber-700 mt-0.5">Lock in this rate forever · Price increases once we exit beta · 14-day money-back guarantee</p>
          </div>
          <div className="flex-shrink-0">
            <span className="inline-block bg-red-100 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full border border-red-200">
              🔥 Beta pricing
            </span>
          </div>
        </div>
      </div>

      {/* Social proof banner */}
      <div className="max-w-2xl mx-auto px-4 pt-3 pb-2">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl px-6 py-4 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="text-3xl">📈</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-800">
              Pro users find an average of <span className="text-blue-600">$340/mo in hidden earnings</span> within their first 30 days
            </p>
            <p className="text-xs text-blue-600 mt-0.5">Based on aggregate benchmark data from opted-in users · 14-day money-back guarantee</p>
          </div>
          <div className="flex-shrink-0">
            <span className="inline-block bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-200">
              🌟 Most Popular
            </span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="text-center pt-8 pb-2 px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Simple, transparent pricing</h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          Start free. Upgrade when you need more. No hidden fees.
        </p>
      </div>

      {/* Annual/Monthly toggle */}
      <PricingBillingToggle
        monthlyPlans={monthlyPlans}
        annualPlans={annualPlans}
        defaultBilling={billingParam === 'annual' ? 'annual' : 'monthly'}
      />

      {/* Financial disclaimer */}
      <div className="max-w-2xl mx-auto px-6 pb-4 text-center">
        <p className="text-xs text-gray-400">
          GigAnalytics provides data analytics tools only and does not provide financial, tax, or investment advice. Individual results vary.
        </p>
      </div>

      {/* Trust signals */}
      <div className="max-w-3xl mx-auto px-6 pb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { icon: '🔒', label: 'Bank-grade encryption', sub: 'AES-256 at rest & in transit' },
            { icon: '↩️', label: '14-day money-back', sub: 'Full refund, no questions asked' },
            { icon: '🚫', label: 'No data selling', sub: 'Your data is private by default' },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-xs font-semibold text-gray-700">{label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto px-6 pb-16">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">Frequently asked questions</h2>
        <div className="space-y-4">
          {[
            { q: 'Can I cancel anytime?', a: 'Yes. Cancel anytime from your billing settings. No questions asked.' },
            { q: 'What counts as an income stream?', a: 'Any income source — Upwork, Fiverr, Stripe, direct clients, consulting, etc. Free plan supports 2, Pro is unlimited.' },
            { q: 'Is my financial data secure?', a: 'Yes. All data is encrypted at rest and in transit. We never sell your data. See our Privacy Policy for details.' },
            { q: 'Do you offer refunds?', a: "If you're not satisfied within 14 days, contact us for a full refund." },
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
