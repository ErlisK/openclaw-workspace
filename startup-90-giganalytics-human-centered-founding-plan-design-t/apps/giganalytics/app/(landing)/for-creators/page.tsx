import type { Metadata } from 'next'
import Link from 'next/link'
import CreatorInquiryForm from './CreatorInquiryForm'

export const metadata: Metadata = {
  title: 'Partner with GigAnalytics — For Creators & Influencers',
  description:
    'Help your freelance/solopreneur audience discover their true hourly rate. Earn 30% recurring commissions, offer free audits, and get full product access. Apply to partner.',
  openGraph: {
    title: 'Partner with GigAnalytics',
    description:
      'Help your audience discover which income stream actually pays best. Earn recurring commissions and give your followers a free tool they actually need.',
    url: 'https://hourlyroi.com/for-creators',
    siteName: 'GigAnalytics',
    type: 'website',
  },
  alternates: { canonical: 'https://hourlyroi.com/for-creators' },
}

const CONTENT_IDEAS = [
  {
    angle: '"My Upwork clients weren\'t my best earner" story',
    hook: 'Share a real reveal: which stream you thought was #1 vs which one actually is after fees.',
  },
  {
    angle: 'True hourly rate across 5 platforms',
    hook: 'Compare Upwork vs Fiverr vs direct clients — use GigAnalytics to show the real numbers.',
  },
  {
    angle: 'Hidden costs of gig work (fees, proposals, revisions)',
    hook: 'Walk your audience through all the "invisible" hours that erode hourly rate.',
  },
  {
    angle: 'How I figured out which side income to double down on',
    hook: 'Decision-making framework using ROI data — your audience can replicate it.',
  },
  {
    angle: 'Free tool I use to track income streams (not a spreadsheet)',
    hook: 'Tutorial or walkthrough of GigAnalytics — very natural for YouTube or newsletter.',
  },
]

const PERKS = [
  {
    icon: '💰',
    title: '30% recurring commissions',
    body: 'Earn 30% of every paid subscription — monthly, for as long as they stay. Paid via Stripe, monthly.',
  },
  {
    icon: '🎯',
    title: 'Free audits for your followers',
    body: "We'll personally run free ROI audits for up to 50 of your followers — perfect for giveaways, newsletters, or YouTube CTAs.",
  },
  {
    icon: '📊',
    title: 'Full product access, free',
    body: 'Unlimited GigAnalytics account for your own income streams. Use it, review it honestly.',
  },
  {
    icon: '📣',
    title: 'Co-promotion opportunities',
    body: "If the fit is right, we'll feature you in our newsletter and social posts — shared exposure to our audience.",
  },
]

export default function ForCreatorsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="font-bold text-gray-900 text-lg">GigAnalytics</Link>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <Link href="/demo" className="hover:text-gray-700">Demo</Link>
          <Link href="/pricing" className="hover:text-gray-700">Pricing</Link>
          <Link href="/free-audit" className="hover:text-gray-700">Free Audit</Link>
          <Link href="/signup" className="bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700">
            Get started free
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-14">
        {/* Hero */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            🤝 Creator & Influencer Partnerships
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            Partner with <span className="text-blue-600">GigAnalytics</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-xl mx-auto leading-relaxed">
            Help your audience discover their true hourly rate — and earn while you do it.
          </p>
        </div>

        {/* Why it fits */}
        <div className="mb-14">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Why your audience needs this</h2>
          <div className="space-y-4">
            {[
              {
                icon: '🤔',
                text: 'Most freelancers and side-hustlers intuitively know they\'re losing money somewhere — they just can\'t prove it. GigAnalytics gives them proof in minutes.',
              },
              {
                icon: '💡',
                text: "In 40% of cases, the platform freelancers think is their best earner isn't — once you account for fees, proposals, revisions, and admin time.",
              },
              {
                icon: '📈',
                text: 'GigAnalytics is built for people running 2–5 income streams: the exact audience following productivity, income, and solopreneur creators.',
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 bg-gray-50 rounded-xl border border-gray-100 p-5">
                <span className="text-2xl mt-0.5">{item.icon}</span>
                <p className="text-gray-700 text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Perks */}
        <div className="mb-14">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">What you get</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {PERKS.map(perk => (
              <div key={perk.title} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-200 transition-colors">
                <div className="text-2xl mb-3">{perk.icon}</div>
                <h3 className="font-semibold text-gray-800 mb-1.5 text-sm">{perk.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{perk.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Content ideas */}
        <div className="mb-14">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Content angles that work</h2>
          <p className="text-gray-500 text-sm mb-6">Pre-built hooks — grab any of these or use them as inspiration.</p>
          <div className="space-y-3">
            {CONTENT_IDEAS.map((idea, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                <p className="font-semibold text-gray-800 text-sm mb-1">💡 {idea.angle}</p>
                <p className="text-gray-500 text-xs leading-relaxed">{idea.hook}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Who we look for */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-14">
          <h2 className="text-lg font-bold text-gray-800 mb-3">Who we partner with</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">✓</span> <span>Creators whose audience includes freelancers, side hustlers, solopreneurs, or multi-income earners</span></li>
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">✓</span> <span>Any platform: YouTube, Twitter/X, newsletters, podcasts, TikTok, LinkedIn, Reddit, Slack communities</span></li>
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">✓</span> <span>No minimum audience size — we care about audience quality, not just numbers</span></li>
            <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">✓</span> <span>We prioritize authentic creators who will genuinely use and review the product</span></li>
          </ul>
        </div>

        {/* Form */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm" id="apply">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Apply to partner</h2>
          <p className="text-gray-500 text-sm mb-6">We review every inquiry personally and reply within 1–2 business days.</p>
          <CreatorInquiryForm />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 px-6 text-center text-xs text-gray-400 mt-8">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-4">
          <span>© {new Date().getFullYear()} GigAnalytics</span>
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <Link href="/pricing" className="hover:text-gray-600">Pricing</Link>
          <Link href="/free-audit" className="hover:text-gray-600">Free Audit</Link>
          <Link href="/calculator" className="hover:text-gray-600">Calculator</Link>
          <Link href="/demo" className="hover:text-gray-600">Demo</Link>
          <Link href="/media-kit" className="hover:text-gray-600">Media Kit</Link>
          <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
          <a href="mailto:hello@hourlyroi.com" className="hover:text-gray-600">hello@hourlyroi.com</a>
        </div>
      </footer>
    </div>
  )
}
