import type { Metadata } from 'next'
import Link from 'next/link'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agentqa.vercel.app'

export const metadata: Metadata = {
  title: 'Pricing — AgentQA Human QA Testing',
  description:
    'Simple, transparent pricing. Quick test $5 (10 min), Standard $10 (20 min), Deep $15 (30 min). No subscription. Pay per test.',
  alternates: { canonical: `${APP_URL}/pricing` },
  openGraph: {
    title: 'Pricing — AgentQA Human QA Testing',
    description: 'Simple, transparent pricing. Quick $5, Standard $10, Deep $15. No subscription.',
    url: `${APP_URL}/pricing`,
  },
}

const TIERS = [
  {
    id: 'quick',
    name: 'Quick',
    price: 5,
    credits: 5,
    duration: '10 minutes',
    description: 'Fast sanity check — testers verify core flows work.',
    features: [
      'Single user flow (signup, main feature, or checkout)',
      'Network request log (all HTTP requests)',
      'Browser console errors captured',
      'Screenshot at each major step',
      '1-paragraph summary + pass/fail verdict',
    ],
    cta: 'Get a quick test',
    accent: 'indigo',
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 10,
    credits: 10,
    duration: '20 minutes',
    description: 'Full feature walkthrough with structured bug reports.',
    features: [
      'Up to 3 user flows (e.g. signup, core feature, settings)',
      'Full network + console log capture',
      'Annotated screenshots with overlays',
      'Structured bug report (steps to reproduce, severity)',
      'Overall UX quality score (1-5)',
    ],
    popular: true,
    cta: 'Start standard test',
    accent: 'indigo',
  },
  {
    id: 'deep',
    name: 'Deep',
    price: 15,
    credits: 15,
    duration: '30 minutes',
    description: 'Comprehensive QA for complex apps or release candidates.',
    features: [
      'Unlimited flows covered in 30 minutes',
      'Full session replay (video-like log)',
      'Accessibility spot-check',
      'Mobile responsiveness notes',
      'Detailed markdown report with screenshots',
      'Priority queue (1-hour SLA)',
    ],
    cta: 'Book deep test',
    accent: 'purple',
  },
]

export default function PricingPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'PriceSpecification',
    name: 'AgentQA Testing Tiers',
    url: `${APP_URL}/pricing`,
    offers: TIERS.map(t => ({
      '@type': 'Offer',
      name: `${t.name} Test`,
      description: t.description,
      price: t.price.toString(),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    })),
  }

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-gray-900">AgentQA</Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/marketplace" className="text-gray-600 hover:text-gray-900">Find jobs</Link>
          <Link href="/login" className="text-gray-600 hover:text-gray-900">Sign in</Link>
          <Link href="/signup" className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700">
            Get started
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">
            Pay per test. No subscription, no minimum. Credits never expire.
            Top up from your billing dashboard at any time.
          </p>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {TIERS.map(tier => (
            <div
              key={tier.id}
              data-testid={`pricing-tier-${tier.id}`}
              className={`relative rounded-2xl border ${tier.popular ? 'border-indigo-500 shadow-lg' : 'border-gray-200'} p-8`}
            >
              {tier.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold bg-indigo-600 text-white px-3 py-1 rounded-full">
                  Most popular
                </span>
              )}
              <h2 className="text-xl font-bold text-gray-900 mb-1">{tier.name}</h2>
              <p className="text-sm text-gray-500 mb-4">{tier.duration} session</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-gray-900">${tier.price}</span>
                <span className="text-gray-500 ml-1">/ test</span>
              </div>
              <p className="text-gray-600 text-sm mb-6">{tier.description}</p>
              <ul className="space-y-2 mb-8">
                {tier.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/billing"
                className={`block w-full text-center py-3 px-6 rounded-lg font-semibold text-sm ${
                  tier.popular
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <section className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Frequently asked questions</h2>
          <div className="space-y-6">
            {[
              {
                q: 'What is a credit?',
                a: '1 credit = $1. A Quick test costs 5 credits, Standard costs 10, Deep costs 15. Credits are deducted when you publish a job and refunded if no tester claims it within 24 hours.',
              },
              {
                q: 'How long does it take?',
                a: 'Quick and Standard tests are typically claimed within 30 minutes during working hours. Deep tests have a 1-hour SLA. You receive the report as soon as the tester submits.',
              },
              {
                q: 'Do I need to install anything?',
                a: 'No. You just provide a public URL. Testers open your app in a real Chrome browser and all network requests + console logs are captured automatically by the platform.',
              },
              {
                q: 'Can I request specific flows to test?',
                a: 'Yes. When creating a job, you can add test instructions describing the exact flows you want covered. Testers follow your instructions step by step.',
              },
              {
                q: 'What if the tester doesn\'t follow instructions?',
                a: 'You can reject feedback submissions that don\'t meet your requirements. A new tester will be assigned automatically.',
              },
            ].map(({ q, a }) => (
              <div key={q}>
                <h3 className="font-semibold text-gray-900 mb-1">{q}</h3>
                <p className="text-gray-600 text-sm">{a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-16 py-8 text-center text-sm text-gray-400">
        <p>© {new Date().getFullYear()} AgentQA. Human QA for AI-built apps.</p>
        <div className="flex justify-center gap-6 mt-2">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <Link href="/marketplace" className="hover:text-gray-600">Jobs</Link>
          <Link href="/billing" className="hover:text-gray-600">Billing</Link>
          <Link href="/pricing" className="hover:text-gray-600">Pricing</Link>
        </div>
      </footer>
    </div>
  )
}
