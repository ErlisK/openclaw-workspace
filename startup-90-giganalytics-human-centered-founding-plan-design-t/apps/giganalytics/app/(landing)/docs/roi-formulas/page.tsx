import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'ROI Formulas',
  description: 'Exact formulas GigAnalytics uses to compute true hourly rate, net revenue, acquisition ROI, and platform fee impact.',
}

function Formula({ label, formula, desc, example }: { label: string; formula: string; desc: string; example?: string }) {
  return (
    <div className="mb-8 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800">
        <h3 className="font-semibold text-sm">{label}</h3>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div className="bg-gray-900 dark:bg-black text-green-400 font-mono text-sm px-4 py-3 rounded-lg overflow-x-auto">
          {formula}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{desc}</p>
        {example && (
          <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg">
            <span className="font-medium">Example: </span>{example}
          </div>
        )}
      </div>
    </div>
  )
}

export default function RoiFormulasPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 text-sm">
      <nav className="text-xs text-gray-500 mb-6">
        <Link href="/docs" className="hover:underline">← Docs</Link>
        {' / ROI Formulas'}
      </nav>

      <h1 className="text-2xl font-bold mb-2">📐 ROI Formulas</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Every metric in GigAnalytics is computed from these formulas. All calculations are done
        client-side from your imported data — no estimation, no rounding before display.
      </p>

      
        {/* How-to animated demo */}
        <div className="mb-8">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Multi-stream comparison demo</div>
          <div className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
            <img src="/demos/hourly-rate.svg" alt="True hourly rate per income stream — consulting $112/hr vs Upwork $60/hr vs digital products $70/hr" className="w-full" loading="lazy" />
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">Animated demo — true hourly rate per stream after platform fees. Wider bar = higher ROI.</p>
        </div>

<section className="mb-10">
        <h2 className="text-base font-semibold mb-4">Core Revenue Metrics</h2>

        <Formula
          label="Gross Revenue"
          formula="gross_revenue = SUM(transaction.amount) WHERE amount > 0"
          desc="Total of all positive payment amounts for the selected period. Refunds (negative amounts) are excluded here and counted separately."
          example="3 payments of $500, $750, $200 → Gross = $1,450"
        />

        <Formula
          label="Net Revenue"
          formula="net_revenue = SUM(transaction.net_amount) = gross_revenue - total_fees - total_refunds"
          desc="What you actually keep after platform fees and refunds. This is the primary revenue figure shown on your dashboard."
          example="Gross $1,450 − Stripe fees $42.05 − refund $200 = Net $1,207.95"
        />

        <Formula
          label="Platform Fee Rate"
          formula="fee_rate = (SUM(transaction.fee) / gross_revenue) × 100"
          desc="Effective fee percentage charged by the platform (Stripe, PayPal, Upwork, etc.). Helps compare platforms on equal footing."
          example="$42.05 fees / $1,450 gross = 2.9% effective fee rate"
        />
      </section>

      <section className="mb-10">
        <h2 className="text-base font-semibold mb-4">True Hourly Rate</h2>

        <Formula
          label="Billable Hours"
          formula="billable_hours = SUM(time_entry.duration_minutes WHERE entry_type = 'billable') / 60"
          desc="Total hours logged as billable for the period. Timer entries, manual entries, and calendar-inferred entries are all included."
          example="480 minutes billable = 8.0 billable hours"
        />

        <Formula
          label="True Hourly Rate"
          formula="true_hourly_rate = net_revenue / billable_hours"
          desc={`The core metric of GigAnalytics. Unlike gross hourly rate, this accounts for platform fees and refunds. If billable_hours = 0, shown as "—" (not $0).`}
          example="$1,207.95 net / 8.0 hours = $151.00/hr true rate"
        />

        <Formula
          label="Effective Hourly Rate (with acquisition costs)"
          formula="effective_hourly_rate = (net_revenue - total_acquisition_costs) / billable_hours"
          desc="Factors in money spent on ads, platform subscriptions, and other costs to acquire clients. Available when acquisition costs are logged."
          example="($1,207.95 − $150 ads) / 8.0 hrs = $132.24/hr effective rate"
        />
      </section>

      <section className="mb-10">
        <h2 className="text-base font-semibold mb-4">Acquisition ROI</h2>

        <Formula
          label="Acquisition ROI"
          formula="acquisition_roi = ((net_revenue - acquisition_cost) / acquisition_cost) × 100"
          desc="Return on money spent acquiring clients (ads, platform fees, referrals). A result of 100% means you earned double what you spent."
          example="($1,207.95 − $150) / $150 = 705% ROI on ad spend"
        />

        <Formula
          label="Cost per Dollar Earned"
          formula="cost_per_dollar = acquisition_cost / net_revenue"
          desc="How much you spend to earn $1. Lower is better. Useful for comparing acquisition channels."
          example="$150 / $1,207.95 = $0.12 per dollar earned"
        />
      </section>

      <section className="mb-10">
        <h2 className="text-base font-semibold mb-4">Income Heatmap</h2>

        <Formula
          label="Revenue Per Hour (heatmap cell)"
          formula="revenue_per_hour[day][hour] = SUM(transactions in cell) / COUNT(weeks in date range)"
          desc="Each heatmap cell shows the average revenue earned during that day-of-week × hour-of-day combination. Transactions are binned by their timestamp's local hour."
          example="Tuesday 2–3 PM: $2,400 over 12 weeks = $200 avg revenue/Tuesday-2PM"
        />

        <Formula
          label="Sweet Spot Threshold"
          formula="is_sweet_spot = revenue_per_hour[cell] ≥ 90th percentile of all cells WITH sample_size ≥ 3"
          desc="A cell is highlighted as a 'sweet spot' only when it has enough data (≥3 observations) and consistently outperforms 90% of other cells."
        />
      </section>

      <section className="mb-10">
        <h2 className="text-base font-semibold mb-4">What-If / Target Income</h2>

        <Formula
          label="Rate Required to Hit Target"
          formula="required_rate = monthly_target / projected_billable_hours"
          desc="Given your income target and your historical average billable hours per month, what hourly rate do you need to charge?"
          example="$5,000 target / 35 projected hours = $142.86/hr required"
        />

        <Formula
          label="Hours Required at Current Rate"
          formula="required_hours = monthly_target / true_hourly_rate"
          desc="At your current true hourly rate, how many billable hours do you need per month to hit your target?"
          example="$5,000 target / $151.00/hr = 33.1 hours/month"
        />
      </section>

      <section className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs">
        <h2 className="font-semibold mb-2">Data Quality Flags</h2>
        <ul className="space-y-1 list-disc list-inside text-gray-600 dark:text-gray-400">
          <li><strong>No time data:</strong> True hourly rate shows "—" and AI insights use deterministic fallback.</li>
          <li><strong>{"<"} 30 days of data:</strong> Heatmap is hidden; "not enough data" is shown instead.</li>
          <li><strong>Mixed currencies:</strong> All amounts converted to USD using the rate at time of import. Multi-currency support is a Pro feature.</li>
          <li><strong>Negative net revenue:</strong> Possible when refunds exceed payments in a period. Dashboard flags this explicitly.</li>
        </ul>
      </section>

      <footer className="mt-12 pt-6 border-t text-xs text-gray-400 flex gap-4">
        <Link href="/docs/csv-templates" className="underline">← CSV Templates</Link>
        <Link href="/docs/pricing-experiments" className="underline">Pricing Experiments →</Link>
      </footer>
    </main>
  )
}
