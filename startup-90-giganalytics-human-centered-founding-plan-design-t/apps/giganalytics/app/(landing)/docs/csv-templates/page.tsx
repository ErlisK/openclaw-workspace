import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'CSV Import Templates',
  description: 'Download CSV templates for importing income from Stripe, PayPal, Upwork, Fiverr, and custom platforms into GigAnalytics.',
}

const TEMPLATES = [
  {
    name: 'Generic / Universal',
    filename: 'giganalytics-universal.csv',
    desc: 'Works with any platform. Required columns only.',
    columns: ['date', 'amount', 'currency', 'description', 'platform'],
    notes: 'Minimum required format. All other columns are optional.',
  },
  {
    name: 'Stripe Exports',
    filename: 'giganalytics-stripe.csv',
    desc: 'Matches Stripe Payments CSV export format.',
    columns: ['id', 'created (UTC)', 'amount', 'amount_refunded', 'currency', 'description', 'fee', 'net', 'status'],
    notes: 'Export from Stripe Dashboard → Payments → Export. GigAnalytics reads "net" as revenue and "fee" as acquisition cost.',
  },
  {
    name: 'PayPal Exports',
    filename: 'giganalytics-paypal.csv',
    desc: 'Matches PayPal Activity CSV format.',
    columns: ['Date', 'Time', 'TimeZone', 'Name', 'Type', 'Status', 'Currency', 'Gross', 'Fee', 'Net'],
    notes: 'Export from PayPal → Activity → Statements → Download. Filter to "Completed" transactions.',
  },
  {
    name: 'Upwork',
    filename: 'giganalytics-upwork.csv',
    desc: 'Matches Upwork Transaction History CSV.',
    columns: ['Date', 'Ref ID', 'Type', 'Description', 'Amount', 'Agency Amount', 'Bonus', 'Other'],
    notes: 'Export from Upwork → Reports → Transaction History. "Amount" is used as net revenue.',
  },
  {
    name: 'Fiverr',
    filename: 'giganalytics-fiverr.csv',
    desc: 'Matches Fiverr Revenue CSV.',
    columns: ['Date', 'Order Number', 'Buyer', 'Description', 'Total', 'Revenue', 'Service Fee'],
    notes: '"Revenue" (after Fiverr 20% fee) is used as net revenue.',
  },
]

function CsvPreview({ columns }: { columns: string[] }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800">
            {columns.map(c => (
              <th key={c} className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 font-mono font-normal text-left whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="text-gray-400 italic">
            {columns.map(c => (
              <td key={c} className="px-3 py-1 border border-gray-200 dark:border-gray-700 whitespace-nowrap">
                …
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function CsvTemplatesPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 text-sm">
      <nav className="text-xs text-gray-500 mb-6">
        <Link href="/docs" className="hover:underline">← Docs</Link>
        {' / CSV Templates'}
      </nav>

      <h1 className="text-2xl font-bold mb-2">📄 CSV Import Templates</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        GigAnalytics auto-detects column names from these formats. Download a template,
        fill in your data, and import via <strong>Import → Upload CSV</strong>.
      </p>

      {/* Quick rules */}
      
        {/* How-to animated demo */}
        <div className="mb-8">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">How it works</div>
          <div className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
            <img src="/demos/csv-import.svg" alt="CSV import walkthrough: upload → auto-detect columns → import → dashboard" className="w-full" loading="lazy" />
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">Animated demo — upload any CSV and GigAnalytics maps your columns automatically</p>
        </div>

<section className="mb-10 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
        <h2 className="font-semibold mb-2">Import Rules</h2>
        <ul className="space-y-1 text-xs list-disc list-inside text-blue-900 dark:text-blue-200">
          <li>File must be UTF-8 CSV (comma-separated, optional quotes)</li>
          <li>First row must be headers — case-insensitive column matching</li>
          <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">date</code> must be parseable (YYYY-MM-DD or MM/DD/YYYY)</li>
          <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">amount</code> or <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">net</code> is required (numeric, no currency symbols)</li>
          <li>Negative amounts are treated as refunds/chargebacks</li>
          <li>Maximum file size: 5 MB (~50,000 rows)</li>
          <li>Duplicate rows (same source_id or date+amount+description) are silently skipped</li>
        </ul>
      </section>

      {/* Templates */}
      <div className="space-y-8">
        {TEMPLATES.map(t => (
          <div key={t.name} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 bg-gray-50 dark:bg-gray-800 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold">{t.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
              </div>
              <a
                href={`/templates/${t.filename}`}
                download
                className="shrink-0 px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                ⬇ Download
              </a>
            </div>
            <div className="px-5 py-4">
              <CsvPreview columns={t.columns} />
              <p className="mt-3 text-xs text-gray-500">
                <strong>Tip:</strong> {t.notes}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Custom format */}
      <section className="mt-10 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs">
        <h2 className="font-semibold mb-2 text-amber-900 dark:text-amber-200">Using a custom format?</h2>
        <p className="text-amber-800 dark:text-amber-300">
          GigAnalytics will do its best to auto-detect columns. If detection fails, you'll see a column
          mapping screen before import. Required: at least one date column and one numeric amount column.
          Any unrecognized columns are stored as metadata and shown in transaction detail.
        </p>
      </section>

      <footer className="mt-12 pt-6 border-t text-xs text-gray-400 flex gap-4">
        <Link href="/docs" className="underline">← All Docs</Link>
        <Link href="/docs/roi-formulas" className="underline">ROI Formulas →</Link>
      </footer>
    </main>
  )
}
