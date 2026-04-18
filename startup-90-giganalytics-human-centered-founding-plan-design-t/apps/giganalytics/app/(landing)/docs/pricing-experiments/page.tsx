import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Pricing Experiments',
  description: 'How A/B pricing experiments work in GigAnalytics — what is measured, how to interpret results, and statistical significance.',
}

export default function PricingExperimentsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 text-sm">
      <nav className="text-xs text-gray-500 mb-6">
        <Link href="/docs" className="hover:underline">← Docs</Link>
        {' / Pricing Experiments'}
      </nav>

      <h1 className="text-2xl font-bold mb-2">🧪 Pricing Experiments</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        The Pricing Lab lets you test different rates and track whether raising (or lowering) your price
        actually improves your income — not just your revenue per job.
      </p>

      {/* What is a pricing experiment */}
      <section className="mb-10">
        <h2 className="text-base font-semibold mb-4">What is a Pricing Experiment?</h2>
        <p className="mb-4">
          A pricing experiment records a period during which you charged a specific rate (Variant A) and
          compares it against another period or rate (Variant B). GigAnalytics tracks:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
          <li><strong>Revenue per hour</strong> — the primary metric</li>
          <li><strong>Transaction count</strong> — volume / conversion proxy</li>
          <li><strong>Total net revenue</strong> — absolute income</li>
          <li><strong>Average transaction value</strong> — per-job revenue</li>
        </ul>
      </section>

      {/* How to run one */}
      <section className="mb-10">
        <h2 className="text-base font-semibold mb-4">How to Run a Pricing Experiment</h2>
        <ol className="list-decimal list-inside space-y-3 text-gray-700 dark:text-gray-300">
          <li>
            Go to <strong>Pricing Lab</strong> in the sidebar.
          </li>
          <li>
            Click <strong>New Experiment</strong>. Give it a name (e.g., "Raise Upwork rate from $85 → $110").
          </li>
          <li>
            Select the income stream you're testing, a start date for Variant A, and optionally a switch
            date to Variant B.
          </li>
          <li>
            Import your transactions as usual. GigAnalytics will automatically bin transactions into
            Variant A or B based on their date.
          </li>
          <li>
            After at least <strong>2 weeks of data per variant</strong>, open the experiment to see results.
          </li>
        </ol>
      </section>

      {/* What is measured */}
      <section className="mb-10">
        <h2 className="text-base font-semibold mb-4">What Is Measured</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="text-left px-3 py-2 border border-gray-200 dark:border-gray-700 w-1/4">Metric</th>
                <th className="text-left px-3 py-2 border border-gray-200 dark:border-gray-700">Formula</th>
                <th className="text-left px-3 py-2 border border-gray-200 dark:border-gray-700">Why it matters</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Revenue/hour', 'net_revenue / billable_hours', 'Primary. Accounts for volume changes.'],
                ['Tx count', 'COUNT(transactions)', 'Did volume drop when you raised prices?'],
                ['Avg tx value', 'net_revenue / tx_count', 'Higher rate but fewer jobs — is each job worth more?'],
                ['Total net revenue', 'SUM(net_amount)', 'Did total income go up or down?'],
                ['Conversion proxy', 'tx_count / days_in_period', 'Jobs per day — crude but useful for active platforms.'],
              ].map(([m, f, w]) => (
                <tr key={m} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-900 dark:even:bg-gray-800/40">
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 font-medium">{m}</td>
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 font-mono">{f}</td>
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">{w}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Statistical significance */}
      <section className="mb-10">
        <h2 className="text-base font-semibold mb-4">Statistical Significance — What We Show</h2>
        <p className="mb-4 text-gray-700 dark:text-gray-300">
          GigAnalytics does <strong>not</strong> run formal significance tests (t-tests, p-values) on your
          pricing data. Here's why:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
          <li>Freelance income is highly variable and non-normal (a few large jobs dominate)</li>
          <li>Most users have {"<"} 50 transactions per variant, making p-values misleading</li>
          <li>External factors (seasonality, platform algorithm changes) confound results</li>
        </ul>
        <p className="mb-4 text-gray-700 dark:text-gray-300">
          Instead, we show a <strong>practical significance estimate</strong>:
        </p>
        <div className="bg-gray-900 text-green-400 font-mono text-xs px-4 py-3 rounded-lg mb-4">
          {`practical_significance = |variant_b_metric - variant_a_metric| / variant_a_metric * 100`}
          <br />
          {`-- "meaningful" threshold: ≥ 15% change with ≥ 5 transactions per variant`}
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          A result flagged as "meaningful" means the difference is large enough to likely matter in practice,
          not just noise. Always combine this with your own judgment about market conditions.
        </p>
      </section>

      {/* Bucket bars */}
      <section className="mb-10">
        <h2 className="text-base font-semibold mb-4">Pricing Lab Bucket Bars</h2>
        <p className="mb-4 text-gray-700 dark:text-gray-300">
          The Pricing Lab also shows a revenue-per-hour histogram across your transaction history, bucketed
          by price range. This answers: "At what price point do I earn the most per hour?"
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
          <li>Buckets are auto-sized to your rate range (e.g., $0–$50, $50–$100, $100+)</li>
          <li>Bar height = revenue per hour for all transactions in that price bucket</li>
          <li><strong>Sweet spot bucket</strong> = highest revenue/hour with ≥ 3 transactions</li>
          <li>Bars are highlighted when bucket is the sweet spot</li>
        </ul>
      </section>

      {/* Tips */}
      <section className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-xs">
        <h2 className="font-semibold mb-2 text-green-900 dark:text-green-200">Tips for better experiments</h2>
        <ul className="space-y-1 list-disc list-inside text-green-800 dark:text-green-300">
          <li>Run each variant for at least 2–4 weeks before drawing conclusions</li>
          <li>Test one variable at a time (rate only — don't also change your service scope)</li>
          <li>Compare the same platform against itself (don't mix Upwork vs. direct clients)</li>
          <li>Log your time during the experiment period — without time data, revenue/hour can't be computed</li>
          <li>Use the "Notes" field to capture why you ran the experiment</li>
        </ul>
      </section>

      <footer className="mt-12 pt-6 border-t text-xs text-gray-400 flex gap-4">
        <Link href="/docs/roi-formulas" className="underline">← ROI Formulas</Link>
        <Link href="/docs/ai-limitations" className="underline">AI Limitations →</Link>
      </footer>
    </main>
  )
}
