import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'GigAnalytics vs. Spreadsheets — Should you still use Excel for freelance income tracking?',
  description: 'Spreadsheets are flexible but they require constant maintenance. GigAnalytics ships the freelancer ROI model pre-built. Compare setup time, accuracy, and features.',
}

const painPoints = [
  { spreadsheet: 'Build your own ROI formulas (hours)', giganalytics: 'Formulas pre-built. Import data, see ROI immediately.' },
  { spreadsheet: 'Manually copy/paste from Stripe, PayPal, Upwork', giganalytics: 'Native import connectors. Auto-mapped column detection.' },
  { spreadsheet: 'No time tracking — estimate or log manually', giganalytics: 'One-tap mobile timer + Google Calendar import.' },
  { spreadsheet: 'No heatmap — build your own pivot table', giganalytics: 'Earnings heatmap auto-generated from your data.' },
  { spreadsheet: 'A/B pricing: track in separate sheets manually', giganalytics: 'Built-in experiment runner with statistical significance.' },
  { spreadsheet: 'No benchmarks — you guess what "good" looks like', giganalytics: 'Opt-in anonymous rate benchmarks from similar freelancers.' },
  { spreadsheet: 'Breaks if you change a formula', giganalytics: 'Versioned, tested, always accurate.' },
  { spreadsheet: 'No mobile access without complexity', giganalytics: 'Mobile-optimized, one-tap timer, responsive dashboard.' },
]

export default function VsSpreadsheetPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <Link href="/compare" className="text-sm text-blue-600 hover:underline mb-4 inline-block">← All Comparisons</Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">GigAnalytics vs. Spreadsheets</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Spreadsheets can do anything — but someone has to build and maintain them. GigAnalytics ships the freelancer ROI model pre-built, pre-tested, and always updated.
          </p>
        </div>

        {/* Time to insight */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-2">📋</div>
            <div className="text-3xl font-bold text-gray-500 mb-1">~8 hrs</div>
            <div className="font-semibold text-gray-700">Spreadsheet setup</div>
            <div className="text-xs text-gray-400 mt-1">Build formulas, import data, fix errors, maintain forever</div>
          </div>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-2">⚡</div>
            <div className="text-3xl font-bold text-blue-600 mb-1">&lt; 2 min</div>
            <div className="font-semibold text-gray-900">GigAnalytics setup</div>
            <div className="text-xs text-gray-500 mt-1">Import CSV or connect Stripe. ROI dashboard instant.</div>
          </div>
        </div>

        {/* Pain point table */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">Spreadsheet problems GigAnalytics solves</h2>
        <div className="border border-gray-200 rounded-2xl overflow-hidden mb-10">
          <div className="grid grid-cols-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
            <span>Spreadsheet pain point</span>
            <span className="text-blue-600">GigAnalytics solution</span>
          </div>
          {painPoints.map((row, i) => (
            <div key={i} className="grid grid-cols-2 px-4 py-3 text-sm border-t border-gray-100">
              <span className="text-gray-600">❌ {row.spreadsheet}</span>
              <span className="text-blue-700 font-medium">✅ {row.giganalytics}</span>
            </div>
          ))}
        </div>

        {/* When to keep spreadsheets */}
        <div className="border border-amber-200 bg-amber-50 rounded-2xl p-6 mb-10">
          <h3 className="font-bold text-lg text-amber-900 mb-3">When spreadsheets still make sense</h3>
          <ul className="space-y-2 text-sm text-amber-800">
            <li>✅ You have highly custom income structures (royalties, equity, barter)</li>
            <li>✅ You need full data portability and own every cell</li>
            <li>✅ You're combining income tracking with project management or CRM in one tool</li>
            <li>✅ You enjoy building systems (genuinely — no judgment)</li>
          </ul>
          <p className="text-xs text-amber-700 mt-3">GigAnalytics exports your data as CSV any time. You can always keep a spreadsheet backup.</p>
        </div>

        {/* The honest pitch */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-2">Stop maintaining the tool. Start using the insights.</h3>
          <p className="text-gray-300 mb-6">
            GigAnalytics is the spreadsheet you would have built — if you had 6 months and a data engineering background. Pre-built. Always works. Free to try.
          </p>
          <Link href="/signup" className="inline-block bg-blue-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-400 transition-colors">
            Try GigAnalytics free — takes 2 min →
          </Link>
        </div>
      </div>
    </main>
  )
}
