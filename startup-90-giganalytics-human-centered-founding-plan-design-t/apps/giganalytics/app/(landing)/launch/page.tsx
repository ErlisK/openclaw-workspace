import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GigAnalytics — Now Live on Product Directories',
  description: 'GigAnalytics is live! The analytics dashboard built for multi-income freelancers. Vote for us, follow our launch, and try it free.',
}

const PRODUCTION_URL = 'https://startup-90-giganalytics-human-cente.vercel.app'

const listings = [
  {
    name: 'Product Hunt',
    icon: '🚀',
    status: 'submitted',
    url: 'https://www.producthunt.com/products/giganalytics',
    utmUrl: `${PRODUCTION_URL}?utm_source=producthunt&utm_medium=listing&utm_campaign=launch`,
    description: 'Upvote us on Product Hunt to help more freelancers discover us.',
    action: 'Upvote on Product Hunt →',
    color: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
  },
  {
    name: 'Indie Hackers',
    icon: '🛠️',
    status: 'submitted',
    url: 'https://www.indiehackers.com/product/giganalytics',
    utmUrl: `${PRODUCTION_URL}?utm_source=indiehackers&utm_medium=listing&utm_campaign=launch`,
    description: 'Follow our product page and journey on Indie Hackers.',
    action: 'View on Indie Hackers →',
    color: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  },
  {
    name: 'BetaList',
    icon: '🧪',
    status: 'submitted',
    url: 'https://betalist.com/startups/giganalytics',
    utmUrl: `${PRODUCTION_URL}?utm_source=betalist&utm_medium=listing&utm_campaign=launch`,
    description: 'Sign up for early access notifications on BetaList.',
    action: 'View on BetaList →',
    color: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  },
  {
    name: 'Hacker News',
    icon: '📰',
    status: 'submitted',
    url: 'https://news.ycombinator.com/submitted?id=giganalytics',
    utmUrl: `${PRODUCTION_URL}?utm_source=hackernews&utm_medium=show_hn&utm_campaign=launch`,
    description: 'Discuss GigAnalytics on Hacker News (Show HN thread).',
    action: 'Read the Show HN →',
    color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  },
  {
    name: 'AlternativeTo',
    icon: '🔄',
    status: 'submitted',
    url: 'https://alternativeto.net/software/giganalytics/',
    utmUrl: `${PRODUCTION_URL}?utm_source=alternativeto&utm_medium=listing&utm_campaign=launch`,
    description: 'Find GigAnalytics as an alternative to Wave, FreshBooks, and Toggl.',
    action: 'View on AlternativeTo →',
    color: 'bg-green-500/10 border-green-500/30 text-green-400',
  },
  {
    name: 'StartupBase',
    icon: '📋',
    status: 'submitted',
    url: 'https://startupbase.io/startups/giganalytics',
    utmUrl: `${PRODUCTION_URL}?utm_source=startupbase&utm_medium=listing&utm_campaign=launch`,
    description: 'Discover and follow GigAnalytics on StartupBase.',
    action: 'View on StartupBase →',
    color: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
  },
  {
    name: 'Startups.fyi',
    icon: '💡',
    status: 'submitted',
    url: 'https://www.startups.fyi/',
    utmUrl: `${PRODUCTION_URL}?utm_source=startupsfyi&utm_medium=listing&utm_campaign=launch`,
    description: 'Featured in the Startups.fyi newsletter and directory.',
    action: 'View on Startups.fyi →',
    color: 'bg-pink-500/10 border-pink-500/30 text-pink-400',
  },
]

export default function LaunchPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 py-4 px-6 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-white">GigAnalytics</Link>
        <nav className="flex gap-6 text-sm text-gray-400">
          <Link href="/blog" className="hover:text-white">Blog</Link>
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
          <Link
            href="/signup?utm_source=launch_page&utm_medium=header&utm_campaign=launch"
            className="text-blue-400 hover:text-blue-300"
          >
            Sign up free →
          </Link>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-medium px-4 py-2 rounded-full mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Live & taking signups
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            GigAnalytics is Live
          </h1>
          <p className="text-gray-400 text-xl mb-8 max-w-2xl mx-auto">
            The analytics dashboard built for people running 2–5 side incomes.
            Know your true hourly rate, run pricing experiments, and see which streams
            deserve your time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup?utm_source=launch_page&utm_medium=hero_cta&utm_campaign=launch"
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-lg"
            >
              Try GigAnalytics free
            </Link>
            <Link
              href="/pricing"
              className="border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-medium px-8 py-4 rounded-xl transition-colors text-lg"
            >
              See pricing
            </Link>
          </div>
        </div>

        {/* What it does */}
        <div className="bg-gray-900/50 rounded-2xl p-8 mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">What GigAnalytics Does</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { icon: '📊', title: 'True hourly rate', desc: 'Net income ÷ total time, factoring in fees and admin' },
              { icon: '🧪', title: 'Pricing experiments', desc: 'A/B test rates across platforms with significance tracking' },
              { icon: '🗺️', title: 'Earnings heatmap', desc: 'Best times and days to accept work by platform' },
              { icon: '🤖', title: 'AI insights', desc: 'Personalized ROI suggestions based on your real data' },
              { icon: '📥', title: 'Import anywhere', desc: 'Stripe, PayPal, CSV — all income in one place' },
              { icon: '🔒', title: 'Privacy first', desc: 'k-anonymity benchmarks, no raw data sharing' },
            ].map(f => (
              <div key={f.title} className="flex gap-4">
                <span className="text-2xl">{f.icon}</span>
                <div>
                  <div className="text-white font-medium mb-1">{f.title}</div>
                  <div className="text-gray-400 text-sm">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Directory listings */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-3">Find Us On</h2>
          <p className="text-gray-400 mb-8">
            We&apos;ve submitted GigAnalytics to the major startup directories. If any of these
            platforms are part of your discovery workflow, we&apos;d appreciate a follow, vote, or review.
          </p>
          <div className="space-y-4">
            {listings.map(listing => (
              <div
                key={listing.name}
                className={`border rounded-xl p-6 flex items-start justify-between gap-4 ${listing.color}`}
              >
                <div className="flex gap-4 items-start">
                  <span className="text-2xl">{listing.icon}</span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-semibold">{listing.name}</span>
                      <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">
                        ✓ Submitted
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{listing.description}</p>
                  </div>
                </div>
                <a
                  href={listing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-sm font-medium hover:underline whitespace-nowrap"
                >
                  {listing.action}
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* UTM links for sharing */}
        <div className="bg-gray-900/50 rounded-2xl p-8 mb-16">
          <h2 className="text-xl font-bold text-white mb-4">Share GigAnalytics</h2>
          <p className="text-gray-400 text-sm mb-4">
            Direct links with tracking so you know where visitors come from:
          </p>
          <div className="space-y-2 font-mono text-xs text-gray-400">
            <div className="bg-gray-800 rounded px-3 py-2 flex justify-between">
              <span className="text-gray-300">Product Hunt:</span>
              <span>{PRODUCTION_URL}?utm_source=producthunt&utm_campaign=launch</span>
            </div>
            <div className="bg-gray-800 rounded px-3 py-2 flex justify-between">
              <span className="text-gray-300">Indie Hackers:</span>
              <span>{PRODUCTION_URL}?utm_source=indiehackers&utm_campaign=launch</span>
            </div>
            <div className="bg-gray-800 rounded px-3 py-2 flex justify-between">
              <span className="text-gray-300">Twitter/X:</span>
              <span>{PRODUCTION_URL}?utm_source=twitter&utm_campaign=launch</span>
            </div>
            <div className="bg-gray-800 rounded px-3 py-2 flex justify-between">
              <span className="text-gray-300">Reddit:</span>
              <span>{PRODUCTION_URL}?utm_source=reddit&utm_campaign=launch</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-blue-950/30 border border-blue-900/40 rounded-2xl p-10 text-center">
          <h3 className="text-2xl font-bold text-white mb-3">Ready to know your real ROI?</h3>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            Connect your income streams in 5 minutes. No credit card required.
            Free plan includes 2 income streams and unlimited imports.
          </p>
          <Link
            href="/signup?utm_source=launch_page&utm_medium=bottom_cta&utm_campaign=launch"
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold px-10 py-4 rounded-xl transition-colors text-lg"
          >
            Get started free
          </Link>
          <p className="text-gray-500 text-sm mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300">Sign in →</Link>
          </p>
        </div>
      </main>

      <footer className="border-t border-gray-800 py-8 px-6 text-center text-sm text-gray-500">
        <div className="flex justify-center gap-6 mb-4">
          <Link href="/" className="hover:text-gray-300">Home</Link>
          <Link href="/blog" className="hover:text-gray-300">Blog</Link>
          <Link href="/pricing" className="hover:text-gray-300">Pricing</Link>
          <Link href="/docs" className="hover:text-gray-300">Docs</Link>
          <Link href="/privacy" className="hover:text-gray-300">Privacy</Link>
        </div>
        <p>© {new Date().getFullYear()} GigAnalytics</p>
      </footer>
    </div>
  )
}
