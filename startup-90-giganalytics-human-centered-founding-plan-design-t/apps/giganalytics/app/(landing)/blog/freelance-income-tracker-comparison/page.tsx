import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Freelance Income Tracker: 5 Methods Compared (Spreadsheet to SaaS) — GigAnalytics',
  description: "From Google Sheets to purpose-built SaaS — we compare 5 ways to track income across multiple freelance streams and find which actually helps you optimize ROI.",
  openGraph: {
    title: 'Freelance Income Tracker: 5 Methods Compared (Spreadsheet to SaaS)',
    description: 'We compare 5 freelance income tracking methods on true hourly rate support, automation, and multi-stream ROI.',
    url: 'https://hourlyroi.com/blog/freelance-income-tracker-comparison',
    type: 'article',
  },
}

const methods = [
  {
    name: 'Google Sheets / Excel',
    pros: ['Free', 'Completely flexible', 'No vendor lock-in'],
    cons: ['All manual entry', 'No payment integrations', 'Formula errors creep in', 'No true hourly rate calculation out of the box'],
    bestFor: 'Getting started with 1–2 streams and low volume',
    score: '⭐⭐ (2/5)',
  },
  {
    name: 'Notion Templates',
    pros: ['Highly customizable', 'Links to tasks and projects', 'Good for visual thinkers'],
    cons: ['Manual entry only', 'No payment imports', 'No automated calculations', 'Becomes unwieldy at scale'],
    bestFor: 'Organized freelancers who enjoy system-building',
    score: '⭐⭐ (2/5)',
  },
  {
    name: 'Wave Accounting',
    pros: ['Free', 'Handles invoicing and basic bookkeeping', 'Connects bank accounts'],
    cons: ['Built for accounting, not ROI comparison', 'No true hourly rate', 'Time tracking is basic', 'Can\'t compare streams side by side'],
    bestFor: 'Freelancers who primarily need bookkeeping and invoicing',
    score: '⭐⭐⭐ (3/5)',
  },
  {
    name: 'Toggl Track + Manual Spreadsheet',
    pros: ['Excellent time tracking UX', 'Good reporting', 'Integrates with project management tools'],
    cons: ['Separate income tracker still needed', 'No platform fee handling', 'Two tools to maintain', 'Still manual for income side'],
    bestFor: 'Time-conscious freelancers who also do their own income math',
    score: '⭐⭐⭐ (3/5)',
  },
  {
    name: 'GigAnalytics',
    pros: ['Purpose-built for true hourly rate across multiple streams', 'Stripe/PayPal/CSV import', 'One-tap timer', 'Acquisition ROI', 'A/B pricing experiments', 'Earnings heatmap'],
    cons: ['Newer product with fewer integrations than accounting tools', 'Overkill for single-stream freelancers'],
    bestFor: 'Anyone with 2+ income streams who wants automated ROI tracking',
    score: '⭐⭐⭐⭐⭐ (5/5)',
  },
]

export default function FreelanceIncomeTrackerComparisonPost() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 py-4 px-6 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-white">GigAnalytics</Link>
        <nav className="flex gap-6 text-sm text-gray-400">
          <Link href="/blog" className="hover:text-white">← Blog</Link>
          <Link href="/signup" className="text-blue-400 hover:text-blue-300">Sign up free →</Link>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-16">
        <div className="mb-10">
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
            <time dateTime="2025-04-25">April 25, 2025</time>
            <span>·</span><span>7 min read</span>
            <span>·</span>
            {['Tools', 'Tracking', 'Freelance'].map(t => (
              <span key={t} className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-xs">{t}</span>
            ))}
          </div>
          <h1 className="text-3xl font-bold text-white mb-4 leading-tight">
            Freelance Income Tracker: 5 Methods Compared (Spreadsheet to SaaS)
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            The tool you use for tracking income directly impacts the quality of decisions you can make.
            Here&apos;s an honest comparison of 5 methods — from free spreadsheets to purpose-built SaaS —
            evaluated on what actually matters for multi-stream freelancers.
          </p>
        </div>

        <article className="prose prose-invert prose-gray max-w-none">
          <h2>What You Actually Need from an Income Tracker</h2>
          <p>Before picking a tool, be clear on your requirements. For multi-income freelancers, the key needs are:</p>
          <ul>
            <li><strong>Multi-stream comparison</strong> — side-by-side view of all income sources</li>
            <li><strong>True hourly rate</strong> — not just revenue totals, but net income ÷ all hours</li>
            <li><strong>Fee deduction</strong> — automatic handling of platform cuts (Upwork, Fiverr, Stripe)</li>
            <li><strong>Time tracking</strong> — both billable and non-billable hours per stream</li>
            <li><strong>Low friction</strong> — a system you&apos;ll actually use every month</li>
          </ul>
          <p>With those criteria in mind, here&apos;s how 5 common approaches stack up.</p>

          {methods.map((method, i) => (
            <div key={method.name}>
              <h2>Method {i + 1}: {method.name}</h2>
              <p className="text-sm text-gray-400 font-medium">{method.score}</p>
              <h3 className="text-green-400 mt-4">Pros</h3>
              <ul>
                {method.pros.map(p => <li key={p}>{p}</li>)}
              </ul>
              <h3 className="text-red-400">Cons</h3>
              <ul>
                {method.cons.map(c => <li key={c}>{c}</li>)}
              </ul>
              <p><strong>Best for:</strong> {method.bestFor}</p>
            </div>
          ))}

          <h2>Which Should You Use?</h2>
          <p>The honest decision framework:</p>
          <ul>
            <li><strong>1 income stream, just starting out:</strong> Google Sheets is fine. Keep it simple.</li>
            <li><strong>1–2 streams, mainly need invoicing:</strong> Wave handles this well at no cost.</li>
            <li><strong>2+ streams, care about time ROI:</strong> You need something that tracks both time and net income per stream. Toggl + spreadsheet is workable but fragmented. GigAnalytics was built specifically for this case.</li>
            <li><strong>3+ streams with Stripe/PayPal:</strong> Automated import becomes essential — manual entry doesn&apos;t scale. GigAnalytics or a custom data pipeline.</li>
          </ul>
          <p>
            The single most important metric for multi-stream freelancers isn&apos;t revenue — it&apos;s true
            hourly rate per stream. Pick the tool that makes that number visible.
          </p>

          <div className="mt-10 p-6 bg-gray-900 rounded-lg border border-gray-700">
            <p className="text-gray-300 font-medium mb-2">See your true hourly rate across all streams</p>
            <p className="text-gray-400 text-sm mb-4">
              GigAnalytics imports from Stripe, PayPal, Upwork, Fiverr, or any CSV. See your real ROI in 11 minutes.
            </p>
            <Link
              href="https://hourlyroi.com"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Try GigAnalytics free →
            </Link>
          </div>
        </article>
      </main>
    </div>
  )
}
