import type { Metadata } from 'next'
import Link from 'next/link'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://betawindow.com'

export const metadata: Metadata = {
  title: 'FAQ — BetaWindow',
  description: 'Frequently asked questions about BetaWindow human QA testing. Credits, refunds, SLA, testers, and more.',
  alternates: { canonical: `${APP_URL}/faq` },
}

const faqs = [
  {
    section: 'Submitting Tests',
    items: [
      { q: 'What counts as a "public URL only"?', a: 'Your app must be accessible via a public HTTPS URL — no localhost, VPN-gated URLs, or password-protected staging environments. The app should be accessible from any internet connection without authentication. If you need to test a login flow, provide test credentials in the job instructions.' },
      { q: 'Can I test a private or staging URL?', a: 'Not currently. All test URLs must be publicly accessible. If your staging environment requires a VPN or IP allowlist, deploy a public preview first (e.g., a Vercel preview URL).' },
      { q: 'How do I write good test instructions?', a: 'Be specific. Tell the tester exactly what flows to test, what success looks like, and what to look for. Example: "Sign up with a test email, complete the 3-step onboarding wizard, and verify the dashboard shows your name. Report any errors or confusing copy."' },
    ],
  },
  {
    section: 'Pricing & Credits',
    items: [
      { q: 'How does credit-based pricing work?', a: '1 credit = $1. A Quick test costs 5 credits ($5), Standard costs 10 credits ($10), and Deep costs 15 credits ($15). Credits are deducted when you publish a job. If no tester claims your job within 24 hours, your credits are fully refunded.' },
      { q: 'Can I get a refund?', a: 'Yes. Credits are refunded automatically if no tester claims your job within 24 hours. If a tester submits an incomplete or low-quality report, open a dispute within 48 hours of report delivery and our team will review and issue a full or partial refund.' },
      { q: 'Do credits expire?', a: 'Credits are valid for 12 months from purchase. We will notify you before any credits are set to expire.' },
    ],
  },
  {
    section: 'Delivery & SLA',
    items: [
      { q: 'How long does it really take to get results?', a: 'Quick and Standard tests are typically claimed within 30–60 minutes during working hours. Deep tests have a longer window. Note: SLA guarantees apply when testers are available. During early access, test completion may take up to 24 hours. If you need guaranteed capacity, contact hello@betawindow.com for a concierge option.' },
      { q: 'What happens if no tester claims my job?', a: 'If no tester claims your job within 24 hours, it is automatically cancelled and your credits are fully refunded. You can repost it at any time.' },
      { q: 'What is the current tester pool size?', a: 'We are in early access and actively onboarding testers. Job availability may vary. If you need guaranteed capacity, contact us at hello@betawindow.com and we can arrange a manual/concierge test.' },
    ],
  },
  {
    section: 'Test Quality & Disputes',
    items: [
      { q: "What if the tester's report is low quality?", a: 'You can open a dispute within 48 hours of receiving the report. Our team reviews all disputes and will issue a full credit refund for reports that do not meet quality standards.' },
      { q: 'What is captured during the test session?', a: 'Every test session captures: all network requests (URL, method, status, response time), browser console logs and errors, and a timestamped screen recording. You get full visibility into what the tester experienced.' },
    ],
  },
  {
    section: 'Technical',
    items: [
      { q: 'What browsers do testers use?', a: 'All tests are run on desktop Chrome. Mobile testing is not currently supported. If cross-browser testing is required, note it in your job instructions.' },
      { q: 'Can I test apps that require a login?', a: 'Yes. Include test credentials (email/password for a demo account) in the job instructions. Never provide real user credentials — create a dedicated test account.' },
    ],
  },
]

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-gray-900">BetaWindow</Link>
        <div className="flex items-center gap-3">
          <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900">Pricing</Link>
          <Link href="/marketplace" className="text-sm text-gray-600 hover:text-gray-900">Marketplace</Link>
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Sign in</Link>
          <Link href="/signup" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">Get started</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Frequently Asked Questions</h1>
          <p className="text-gray-500">Everything you need to know about BetaWindow.</p>
          <p className="text-sm text-gray-400 mt-2">
            Still have questions?{' '}
            <a href="mailto:hello@betawindow.com" className="text-indigo-600 hover:underline">hello@betawindow.com</a>
          </p>
        </div>

        <div className="space-y-10">
          {faqs.map(section => (
            <div key={section.section}>
              <h2 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-4">{section.section}</h2>
              <div className="space-y-4">
                {section.items.map((item, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
                    <h3 className="font-semibold text-gray-900 mb-2">{item.q}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center p-6 bg-indigo-50 border border-indigo-200 rounded-2xl">
          <p className="font-semibold text-indigo-900 mb-1">Didn&apos;t find what you&apos;re looking for?</p>
          <p className="text-sm text-indigo-700 mb-4">Email us and we&apos;ll get back to you within a few hours.</p>
          <a href="mailto:hello@betawindow.com" className="inline-block px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700">
            Contact support
          </a>
        </div>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-8 px-6 text-center text-sm mt-16">
        <div className="flex justify-center gap-6 mb-4">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
          <Link href="/become-a-tester" className="hover:text-white">Become a Tester</Link>
          <Link href="/marketplace" className="hover:text-white">Marketplace</Link>
        </div>
        <p>© {new Date().getFullYear()} BetaWindow. All rights reserved.</p>
      </footer>
    </div>
  )
}
