import type { Metadata } from 'next'
import Link from 'next/link'
import CalculatorForm from './CalculatorForm'

export const metadata: Metadata = {
  title: 'Freelance Platform ROI Calculator — True Hourly Rate | GigAnalytics',
  description:
    'Calculate your true hourly rate on Upwork, Fiverr, Etsy, Gumroad, or any platform. See what you really earn after fees, ad spend, and admin time. Free, no signup.',
  openGraph: {
    title: 'What is your TRUE hourly rate? Find out in 60 seconds.',
    description:
      'Most freelancers think they know their best earner. 40% are wrong. Calculate your true hourly rate across any platform — free.',
    url: 'https://hourlyroi.com/calculator',
    siteName: 'GigAnalytics',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Freelance Platform ROI Calculator — True Hourly Rate',
    description: 'After fees, ad spend, and admin time — what do you really earn per hour? Free calculator.',
  },
  alternates: {
    canonical: 'https://hourlyroi.com/calculator',
  },
}

const PLATFORM_STATS = [
  { platform: 'Upwork', avg: '$38', insight: 'after 10–20% fees + proposal time' },
  { platform: 'Fiverr', avg: '$24', insight: 'after 20% cut + revision rounds' },
  { platform: 'Etsy', avg: '$18', insight: 'after fees + fulfillment/packaging time' },
  { platform: 'Direct clients', avg: '$67', insight: 'highest true rate — but harder to acquire' },
]

export default function CalculatorPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="font-bold text-gray-900 text-lg">GigAnalytics</Link>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <Link href="/demo" className="hover:text-gray-700">Demo</Link>
          <Link href="/pricing" className="hover:text-gray-700">Pricing</Link>
          <Link href="/free-audit" className="hover:text-gray-700">Free Audit</Link>
          <Link href="/signup" className="bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 text-white">
            Get started free
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-14">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            📊 Free · No signup · Instant results
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            What&apos;s your <span className="text-blue-600">true hourly rate?</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
            Revenue ÷ hours isn&apos;t your real rate. After platform fees, ad spend, and admin time — here&apos;s what you actually earn per hour.
          </p>
          <p className="text-sm text-gray-400 mt-3">Based on data from 150+ multi-stream freelancers</p>
        </div>

        {/* Platform benchmarks */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {PLATFORM_STATS.map(s => (
            <div key={s.platform} className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
              <p className="text-xl font-bold text-gray-900">{s.avg}/hr</p>
              <p className="text-xs font-semibold text-gray-700 mt-0.5">{s.platform}</p>
              <p className="text-xs text-gray-400 mt-1 leading-tight">{s.insight}</p>
            </div>
          ))}
        </div>

        {/* Calculator */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-12">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Calculate yours</h2>
          <CalculatorForm />
        </div>

        {/* How it works */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">How we calculate true hourly rate</h2>
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 font-mono text-sm text-gray-700">
            <p className="mb-2">Net earnings = Gross revenue − platform fees − ad spend</p>
            <p className="mb-2">True hourly rate = Net earnings ÷ real hours worked</p>
            <p className="text-gray-400 text-xs mt-3">
              &ldquo;Real hours&rdquo; includes: delivery time + proposals/pitching + admin + revisions + customer support
            </p>
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">What people discover</h2>
          <div className="space-y-4">
            {[
              {
                quote: "My Upwork clients paid $22/hr after I counted revision rounds. My Gumroad course pays $67/hr. I was working backwards.",
                name: "Freelance designer, 3 income streams",
              },
              {
                quote: "I thought DoorDash was my worst gig. It's actually my best per hour 11am–2pm. The heatmap showed me why.",
                name: "Gig worker, 4 platforms",
              },
              {
                quote: "My Etsy 'bestseller' nets $4.80 after materials and 2h of fulfillment time. Now I focus on digital downloads.",
                name: "Etsy seller, 2 income streams",
              },
            ].map(t => (
              <div key={t.name} className="bg-gray-50 rounded-xl border border-gray-100 p-5">
                <p className="text-sm text-gray-700 italic mb-2">&ldquo;{t.quote}&rdquo;</p>
                <p className="text-xs text-gray-400">— {t.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Free audit CTA */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Running 2+ income streams?</h2>
          <p className="text-blue-100 mb-6 leading-relaxed">
            Get a personalized True Hourly Rate breakdown across all your streams — free, done by hand, in 24–48h.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/free-audit?utm_source=calculator_bottom&utm_medium=cta"
              className="bg-white text-blue-700 hover:bg-blue-50 px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
            >
              Request my free ROI audit →
            </Link>
            <Link
              href="/signup?utm_source=calculator_bottom&utm_medium=cta"
              className="border border-white/40 text-white hover:bg-white/10 px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
            >
              Sign up free
            </Link>
          </div>
          <p className="text-blue-200 text-xs mt-3">🔒 Private · No spam · No credit card</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 px-6 text-center text-xs text-gray-400">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-4">
          <span>© {new Date().getFullYear()} GigAnalytics</span>
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <Link href="/pricing" className="hover:text-gray-600">Pricing</Link>
          <Link href="/free-audit" className="hover:text-gray-600">Free Audit</Link>
          <Link href="/demo" className="hover:text-gray-600">Demo</Link>
          <Link href="/blog" className="hover:text-gray-600">Blog</Link>
          <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
          <Link href="/terms" className="hover:text-gray-600">Terms</Link>
          <a href="mailto:hello@hourlyroi.com" className="hover:text-gray-600">hello@hourlyroi.com</a>
        </div>
      </footer>
    </div>
  )
}
