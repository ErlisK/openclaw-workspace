import type { Metadata } from 'next'
import Link from 'next/link'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://betawindow.com'

export const metadata: Metadata = {
  title: 'Become a Tester — BetaWindow',
  description: 'Earn $5–$15 per test by testing AI-built apps. Flexible work, no experience required. Join BetaWindow as a human QA tester.',
  alternates: { canonical: `${APP_URL}/become-a-tester` },
}

const steps = [
  { number: '01', title: 'Sign up for free', description: 'Create your BetaWindow tester account. No experience or qualifications required — just a desktop computer running Chrome.' },
  { number: '02', title: 'Browse the marketplace', description: 'Pick a test job from the marketplace. Each listing shows the app URL, what to test, estimated time (10–30 min), and payout.' },
  { number: '03', title: 'Run the test', description: 'Open the app in our embedded Chrome session. Network requests and console logs are captured automatically. Follow the test instructions.' },
  { number: '04', title: 'Submit your report', description: 'Fill out the structured feedback form: what worked, what broke, and any UX issues. Screenshots and notes are welcome.' },
  { number: '05', title: 'Get paid', description: 'Payment is released to your balance once the developer reviews your report (typically within 24 hours). Withdraw anytime via Stripe.' },
]

const exampleTasks = [
  'Sign up with a test email and verify the confirmation email arrives',
  'Complete a checkout flow using test card 4242 4242 4242 4242',
  'Navigate to 3 core pages and check for broken links or UI glitches',
  'Test on both a wide (1440px) and narrow (1024px) window',
  'Verify that error messages appear for invalid form inputs',
  'Check that the app loads in under 5 seconds on a standard connection',
]

const faqs = [
  { q: 'What equipment do I need?', a: 'A desktop or laptop computer running Chrome. Mobile devices are not supported for test execution.' },
  { q: 'How much can I earn?', a: 'Quick tests pay $5 (~10 min), Standard tests pay $10 (~20 min), and Deep tests pay $15 (~30 min). Most testers complete 2–4 tests per hour.' },
  { q: 'How and when do I get paid?', a: 'Earnings are added to your BetaWindow balance once the developer approves your report (within 24 hours). You can withdraw anytime via Stripe — typically 1–2 business days to your bank.' },
  { q: 'Do I need QA or technical experience?', a: 'No. Most tests are designed to be completed by a non-technical user. The instructions will tell you exactly what to do. Curiosity and attention to detail matter more than experience.' },
  { q: "What if I find no bugs?", a: "That's a valid outcome! Confirm that the app works as described, note anything that felt confusing even if it technically worked, and submit your report. You still get paid." },
  { q: 'Are there any restrictions?', a: 'You must be 18+, have a valid payment account, and complete tests in good faith. Submitting low-effort or fake reports will result in account suspension.' },
]

export default function BecomeATesterPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-gray-900">BetaWindow</Link>
        <div className="flex items-center gap-3">
          <Link href="/marketplace" className="text-sm text-gray-600 hover:text-gray-900">Browse Jobs</Link>
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Sign in</Link>
          <Link href="/signup" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">Start earning</Link>
        </div>
      </header>

      <main>
        <section className="bg-indigo-600 text-white py-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-5xl mb-4">💰</div>
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 text-sm font-semibold bg-amber-400 text-amber-900 rounded-full">
              <span>🎁</span>
              <span>Early tester bonus: complete your first test and earn an extra <strong>$5 bonus</strong></span>
            </div>
            <h1 className="text-4xl font-bold mb-4">Earn money testing AI-built apps</h1>
            <p className="text-xl text-indigo-100 mb-8">Get paid $5–$15 per test. Each session is 10–30 minutes. Flexible schedule, no experience required.</p>
            <Link href="/signup" className="inline-block px-8 py-3 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 text-lg">Sign up free → Start earning</Link>
            <p className="text-sm text-indigo-200 mt-3">No commitments. No minimum hours. Pick up jobs when you want.</p>
            <p className="text-xs text-indigo-300 mt-2">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="underline hover:text-white">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="underline hover:text-white">Privacy Policy</Link>.
            </p>
          </div>
        </section>

        <section className="bg-white py-10 border-b border-gray-100">
          <div className="max-w-3xl mx-auto px-6">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div><div className="text-3xl font-bold text-indigo-600">$5–$15</div><div className="text-sm text-gray-500 mt-1">per completed test</div></div>
              <div><div className="text-3xl font-bold text-indigo-600">10–30 min</div><div className="text-sm text-gray-500 mt-1">per test session</div></div>
              <div><div className="text-3xl font-bold text-indigo-600">24h</div><div className="text-sm text-gray-500 mt-1">payout after approval</div></div>
            </div>
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">How it works</h2>
          <div className="space-y-6">
            {steps.map(step => (
              <div key={step.number} className="flex gap-5 items-start">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm shrink-0">{step.number}</div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                  <p className="text-gray-600 text-sm">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-gray-100 py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">What you&apos;ll be asked to do</h2>
            <p className="text-center text-gray-500 text-sm mb-8">Real examples of test instructions from our marketplace</p>
            <div className="bg-white rounded-2xl p-6 space-y-3">
              {exampleTasks.map((task, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <p className="text-sm text-gray-700">{task}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Payout timeline</h2>
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 space-y-4">
            {[
              { n: '1', title: 'You complete the test', sub: 'Submit your report through the platform' },
              { n: '2', title: 'Developer reviews (~24h)', sub: 'Payment is released to your BetaWindow balance' },
              { n: '3', title: 'Withdraw anytime (1–2 business days)', sub: 'Funds transfer to your bank via Stripe Payouts' },
            ].map(item => (
              <div key={item.n} className="flex gap-4 items-center">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">{item.n}</div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{item.title}</div>
                  <div className="text-xs text-gray-500">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-gray-50 py-16 px-6 border-t border-gray-100">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Eligibility</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ['✅', 'Must be 18 years or older'],
                ['✅', 'Desktop computer with Chrome browser'],
                ['✅', 'Reliable internet connection'],
                ['✅', 'Valid email address'],
                ['✅', 'Stripe-supported country for payouts'],
                ['✅', 'Good faith effort on all tests'],
              ].map(([icon, text], i) => (
                <div key={i} className="flex gap-2 items-center text-sm text-gray-700"><span>{icon}</span><span>{text}</span></div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <strong>Tax Note:</strong> Earnings on BetaWindow are paid to independent contractors. You are responsible for reporting your earnings and paying all applicable taxes. BetaWindow will issue IRS Form 1099-NEC for US-based testers who earn $600 or more in a calendar year, and will comply with all applicable tax reporting requirements.
            </div>
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Frequently asked questions</h2>
          <div className="space-y-5">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-5 bg-white">
                <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-sm text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-indigo-600 text-white py-16 px-6 text-center">
          <h2 className="text-3xl font-bold mb-3">Ready to start earning?</h2>
          <p className="text-indigo-100 mb-8 text-lg">It takes 2 minutes to sign up. Your first job could be waiting.</p>
          <Link href="/signup" className="inline-block px-8 py-3 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 text-lg">Create your free account</Link>
          <div className="mt-4">
            <Link href="/marketplace" className="text-indigo-200 text-sm hover:text-white underline">Browse the marketplace first</Link>
          </div>
          <p className="text-xs text-indigo-300 mt-4">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-white">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="underline hover:text-white">Privacy Policy</Link>.
          </p>
        </section>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-8 px-6 text-center text-sm">
        <div className="flex flex-wrap justify-center gap-6 mb-4">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/marketplace" className="hover:text-white">Marketplace</Link>
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
          <Link href="/faq" className="hover:text-white">FAQ</Link>
          <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-white">Terms of Service</Link>
        </div>
        <p>© {new Date().getFullYear()} BetaWindow · 2298 Johanna Court, Pinole, CA 94564 · <a href="mailto:hello@betawindow.com" className="hover:text-white">hello@betawindow.com</a></p>
      </footer>
    </div>
  )
}
