import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'GigAnalytics vs. Other Tools — Comparison Hub',
  description: 'Compare GigAnalytics to Toggl Track, Wave Accounting, QuickBooks Self-Employed, Harvest, and spreadsheets. Find the best ROI tracker for freelancers with multiple income streams.',
}

const comparisons = [
  {
    slug: 'giganalytics-vs-toggl',
    tool: 'Toggl Track',
    tagline: 'Time tracker vs. true ROI calculator',
    summary: 'Toggl tells you where time went. GigAnalytics tells you what that time was worth — and which clients you should drop.',
    emoji: '⏱️',
    verdict: 'Use GigAnalytics for ROI, Toggl for team time sheets',
  },
  {
    slug: 'giganalytics-vs-quickbooks',
    tool: 'QuickBooks Self-Employed',
    tagline: 'Tax compliance vs. income-stream ROI',
    summary: 'QuickBooks handles mileage, Schedule C, and estimated taxes. GigAnalytics answers the question accountants can\'t: "Which income stream is worth my time?"',
    emoji: '🧾',
    verdict: 'Many freelancers use both — QB for taxes, GA for decisions',
  },
  {
    slug: 'giganalytics-vs-harvest',
    tool: 'Harvest',
    tagline: 'Client billing vs. income-stream ROI',
    summary: 'Harvest is built for agencies billing clients by the hour. GigAnalytics is for solo freelancers comparing diverse income streams — platforms, products, and clients side by side.',
    emoji: '🌾',
    verdict: 'Use Harvest for invoicing, GigAnalytics for cross-stream ROI',
  },
  {
    slug: 'giganalytics-vs-wave',
    tool: 'Wave Accounting',
    tagline: 'Bookkeeping vs. income-stream ROI',
    summary: 'Wave keeps your books clean. GigAnalytics answers the question bookkeepers can\'t: "Which of my 4 income streams is actually worth my time?"',
    emoji: '📊',
    verdict: 'Wave for bookkeeping, GigAnalytics for hourly rate clarity',
  },
  {
    slug: 'giganalytics-vs-spreadsheet',
    tool: 'Manual Spreadsheets',
    tagline: 'DIY tracking vs. automated ROI',
    summary: 'Spreadsheets do whatever you build. GigAnalytics ships the freelancer ROI model pre-built — no formulas to write, no data to manually enter.',
    emoji: '📋',
    verdict: 'GigAnalytics is the spreadsheet you would have built',
  },
]

export default function CompareIndexPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">COMPARISONS</span>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">GigAnalytics vs. Other Tools</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Most tools track time or money. GigAnalytics shows you the ROI of every hour across every income stream — so you can cut what drags and scale what works.
          </p>
        </div>

        <div className="grid gap-5">
          {comparisons.map((c) => (
            <Link key={c.slug} href={`/compare/${c.slug}`} className="group block border border-gray-200 rounded-2xl p-6 hover:border-blue-300 hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <span className="text-4xl flex-shrink-0">{c.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">GigAnalytics vs. {c.tool}</h2>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{c.tagline}</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{c.summary}</p>
                  <p className="text-xs text-blue-600 font-medium">→ {c.verdict}</p>
                </div>
                <span className="text-gray-400 group-hover:text-blue-500 transition-colors text-xl flex-shrink-0">→</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to stop guessing?</h3>
          <p className="text-gray-600 mb-4">Import your first income stream in under 2 minutes. Free forever for up to 2 streams.</p>
          <Link href="/signup" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            Try GigAnalytics free →
          </Link>
        </div>
      </div>
    </main>
  )
}
