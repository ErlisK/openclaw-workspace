import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How to Import Your Stripe & PayPal Payments into GigAnalytics (CSV Guide)',
  description:
    'Step-by-step guide to exporting CSV data from Stripe, PayPal, Upwork, and Fiverr — and importing it into GigAnalytics to see your true income ROI.',
  openGraph: {
    title: 'CSV Import Guide: Stripe, PayPal, Upwork & Fiverr',
    description: 'Get your payment data into GigAnalytics in under 5 minutes.',
    url: 'https://startup-90-giganalytics-human-cente.vercel.app/blog/csv-import-guide',
    type: 'article',
  },
}

const SIGNUP_URL = '/signup?utm_source=blog&utm_medium=cta&utm_campaign=csv_import_post'

export default function CsvImportGuidePost() {
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
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
            <time dateTime="2025-04-18">April 18, 2025</time>
            <span>·</span><span>7 min read</span>
            <span>·</span>
            {['CSV', 'Stripe', 'PayPal', 'Import'].map(t => (
              <span key={t} className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-xs">{t}</span>
            ))}
          </div>
          <h1 className="text-3xl font-bold text-white mb-4 leading-tight">
            How to Import Your Stripe & PayPal Payments into GigAnalytics (Step-by-Step)
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Most freelancers have income scattered across 3–5 platforms. This guide shows you exactly
            how to pull a CSV from Stripe, PayPal, Upwork, and Fiverr — and drop it into GigAnalytics
            so your ROI dashboard populates in minutes.
          </p>
        </div>

        <article className="prose prose-invert prose-gray max-w-none">
          <h2>Why Import Instead of Connect?</h2>
          <p>
            GigAnalytics supports both direct API connections (for Stripe) and manual CSV imports. CSV
            import works for any platform — even ones without an API — and keeps your data local. Here&apos;s
            when each approach makes sense:
          </p>
          <ul>
            <li><strong>Direct connection:</strong> Stripe (webhook-based, syncs automatically)</li>
            <li><strong>CSV import:</strong> PayPal, Upwork, Fiverr, Toptal, Etsy, Gumroad, anywhere else</li>
          </ul>
          <p>
            Both end up in the same ROI dashboard. The import path takes about 5 minutes per platform
            and only needs to be done once per time period.
          </p>

          <hr />

          <h2>Platform-by-Platform Export Instructions</h2>

          <h3>📦 Stripe</h3>
          <p>Stripe has the cleanest export of any payment platform.</p>
          <ol>
            <li>Log into your <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Stripe Dashboard</a></li>
            <li>Navigate to <strong>Payments → All transactions</strong></li>
            <li>Set your date range (we recommend 90-day chunks for first import)</li>
            <li>Click <strong>Export</strong> (top right) → choose <strong>CSV</strong></li>
            <li>Select columns: Date, Amount, Fee, Net, Description, Status</li>
            <li>Download and save as <code>stripe-payments.csv</code></li>
          </ol>
          <p>
            <strong>GigAnalytics auto-detects Stripe CSVs</strong> by the column headers. No field mapping needed.
          </p>

          <h3>💙 PayPal</h3>
          <p>PayPal&apos;s export is slightly buried but works well once you find it.</p>
          <ol>
            <li>Log into <a href="https://paypal.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">PayPal</a> and go to <strong>Activity</strong></li>
            <li>Click <strong>Statements</strong> → <strong>Activity Download</strong></li>
            <li>Set date range → select <strong>All Transactions</strong></li>
            <li>Choose <strong>CSV (Comma Delimited)</strong> format</li>
            <li>Click <strong>Create Report</strong> → Download when ready</li>
          </ol>
          <p>
            PayPal CSVs include fees inline. GigAnalytics parses the <em>Net</em> column automatically,
            so your ROI calculations account for PayPal&apos;s 2.9% + $0.30 per transaction.
          </p>

          <h3>🔵 Upwork</h3>
          <ol>
            <li>Open <a href="https://upwork.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Upwork</a> → <strong>Reports → Billings & Earnings</strong></li>
            <li>Set your date range</li>
            <li>Click <strong>Download CSV</strong></li>
          </ol>
          <p>
            Upwork exports include contract names, hourly vs. fixed breakdowns, and platform service
            fees (sliding scale from 5–20%). Import this into GigAnalytics as the &quot;Upwork&quot; income stream.
          </p>

          <h3>🟠 Fiverr</h3>
          <ol>
            <li>Go to <strong>Analytics → Earnings</strong></li>
            <li>Click <strong>Download</strong> (the icon next to the date range picker)</li>
            <li>Choose CSV format</li>
          </ol>
          <p>
            Fiverr shows gross earnings. The 20% platform fee is deducted before payout, so GigAnalytics
            uses the &quot;Cleared Earnings&quot; column as your net income.
          </p>

          <h3>🟡 Gumroad / Lemon Squeezy / Paddle</h3>
          <p>
            All three use similar export flows: Dashboard → Payouts or Sales → Export as CSV. Column
            names vary, but GigAnalytics accepts a custom field map during import — you can drag-assign
            columns to Date, Amount, Fee, and Description in 30 seconds.
          </p>

          <hr />

          <h2>GigAnalytics CSV Format</h2>
          <p>
            If you&apos;re building your own CSV (e.g., from a bank export or custom invoicing system),
            use this structure:
          </p>
          <div className="bg-gray-900 rounded-lg p-4 my-4 font-mono text-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="pr-4 pb-2">date</th>
                  <th className="pr-4 pb-2">amount</th>
                  <th className="pr-4 pb-2">currency</th>
                  <th className="pr-4 pb-2">fee</th>
                  <th className="pr-4 pb-2">description</th>
                  <th className="pb-2">source</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr>
                  <td className="pr-4 py-1">2025-03-01</td>
                  <td className="pr-4">500.00</td>
                  <td className="pr-4">USD</td>
                  <td className="pr-4">14.50</td>
                  <td className="pr-4">Logo project</td>
                  <td>Stripe</td>
                </tr>
                <tr>
                  <td className="pr-4 py-1">2025-03-05</td>
                  <td className="pr-4">120.00</td>
                  <td className="pr-4">USD</td>
                  <td className="pr-4">3.78</td>
                  <td className="pr-4">Consulting call</td>
                  <td>PayPal</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Required: <code>date</code>, <code>amount</code>. Optional but recommended: <code>fee</code>,
            <code>description</code>, <code>source</code>. The <code>fee</code> column is used to
            calculate your net income and true ROI — skip it and GigAnalytics estimates based on
            platform defaults.
          </p>
          <p>
            Download our pre-formatted templates: <a href="/templates/stripe-template.csv" className="text-blue-400 hover:text-blue-300">Stripe</a>,{' '}
            <a href="/templates/paypal-template.csv" className="text-blue-400 hover:text-blue-300">PayPal</a>,{' '}
            <a href="/templates/generic-template.csv" className="text-blue-400 hover:text-blue-300">Generic</a>
          </p>

          <hr />

          <h2>Importing into GigAnalytics: Step by Step</h2>
          <ol>
            <li>Go to <strong>Dashboard → Import</strong> (or hit the Import button on the sidebar)</li>
            <li>Click <strong>Upload CSV</strong> and select your file</li>
            <li>GigAnalytics will auto-detect the platform if it recognizes the headers</li>
            <li>If auto-detect fails, use the field mapper: drag <em>Date</em>, <em>Amount</em>, <em>Fee</em>, <em>Description</em> to the right columns</li>
            <li>Choose or create an <strong>Income Stream</strong> to assign transactions to (e.g., &quot;Upwork Design&quot; or &quot;PayPal Consulting&quot;)</li>
            <li>Click <strong>Import</strong> — GigAnalytics deduplicates automatically using transaction IDs</li>
          </ol>
          <p>
            After import, your ROI dashboard updates instantly: true hourly rate, gross vs. net breakdown,
            platform fee analysis, and the heatmap of your best earning days.
          </p>

          <hr />

          <h2>Pro Tips for Clean Imports</h2>
          <ul>
            <li>
              <strong>Import in 90-day chunks</strong> for large accounts. Stripe and PayPal exports over
              12 months can hit 10,000+ rows — processing time stays fast with smaller batches.
            </li>
            <li>
              <strong>Use consistent source names.</strong> If you label one import &quot;Stripe&quot; and another
              &quot;stripe&quot;, GigAnalytics treats them as different streams. Pick one casing and stick to it.
            </li>
            <li>
              <strong>Include the fee column when possible.</strong> Without it, GigAnalytics estimates fees
              using platform defaults (Upwork 10%, PayPal 3.2%, Stripe 2.9%). Your actual fees may differ.
            </li>
            <li>
              <strong>Run imports monthly.</strong> Set a calendar reminder for the first of each month to
              export last month&apos;s data and re-import. The ROI dashboard stays current.
            </li>
          </ul>

          <hr />

          <h2>What Happens After Import</h2>
          <p>Once your data is in, GigAnalytics calculates:</p>
          <ul>
            <li><strong>True hourly rate</strong> — if you log time, revenue ÷ hours ÷ (1 − fee rate)</li>
            <li><strong>Platform ROI</strong> — which platforms earn you the most per hour</li>
            <li><strong>Monthly trends</strong> — seasonality, best months, income stability score</li>
            <li><strong>Earnings heatmap</strong> — best days/times to accept work based on your data</li>
          </ul>
          <p>
            The more data you import, the more accurate the AI suggestions become. With 6+ months of
            data, the benchmark layer activates — comparing your rates anonymously against other
            freelancers in your category.
          </p>
        </article>

        {/* CTA */}
        <div className="mt-16 bg-blue-950/30 border border-blue-900/40 rounded-2xl p-10 text-center">
          <h3 className="text-2xl font-bold text-white mb-3">Ready to see your real ROI?</h3>
          <p className="text-gray-400 mb-8">
            Import your first CSV in 5 minutes. No credit card required.
          </p>
          <Link
            href={SIGNUP_URL}
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold px-10 py-4 rounded-xl transition-colors"
          >
            Start free → import your data
          </Link>
          <p className="text-gray-500 text-xs mt-4">
            Free plan: 2 income streams · unlimited CSV imports · full ROI dashboard
          </p>
        </div>

        {/* Related posts */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">Related posts</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { href: '/blog/true-hourly-rate', title: 'Why Your Real Hourly Rate Is Probably 40% Lower Than You Think', time: '6 min' },
              { href: '/blog/ab-pricing-gig-work', title: 'How to Run Pricing Experiments on Your Freelance Rates', time: '8 min' },
            ].map(post => (
              <Link
                key={post.href}
                href={post.href}
                className="block bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-gray-600 transition-colors"
              >
                <div className="text-xs text-gray-500 mb-2">{post.time} read</div>
                <div className="text-white font-medium text-sm leading-snug">{post.title}</div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-800 py-8 px-6 text-center text-sm text-gray-500">
        <div className="flex justify-center gap-6 mb-4">
          <Link href="/" className="hover:text-gray-300">Home</Link>
          <Link href="/blog" className="hover:text-gray-300">Blog</Link>
          <Link href="/docs/csv-templates" className="hover:text-gray-300">CSV Templates</Link>
          <Link href="/pricing" className="hover:text-gray-300">Pricing</Link>
        </div>
        <p>© {new Date().getFullYear()} GigAnalytics</p>
      </footer>
    </div>
  )
}
