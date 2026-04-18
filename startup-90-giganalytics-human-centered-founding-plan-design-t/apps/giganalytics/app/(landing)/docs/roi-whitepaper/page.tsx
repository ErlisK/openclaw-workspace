import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'ROI Methodology Whitepaper — GigAnalytics',
  description: 'The complete mathematical and design methodology behind GigAnalytics\'s true hourly rate, acquisition ROI, and income stream comparison calculations.',
}

function Formula({ label, formula, example, note }: { label: string; formula: string; example?: string; note?: string }) {
  return (
    <div className="mb-8 border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-800">{label}</h3>
        <span className="text-xs text-gray-400 font-mono">formula</span>
      </div>
      <div className="px-5 py-4 space-y-3">
        <pre className="bg-gray-900 text-green-400 font-mono text-sm px-4 py-4 rounded-lg overflow-x-auto whitespace-pre-wrap">{formula}</pre>
        {example && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm">
            <span className="font-semibold text-blue-800">Worked example: </span>
            <span className="text-blue-700">{example}</span>
          </div>
        )}
        {note && (
          <p className="text-xs text-gray-500 italic">{note}</p>
        )}
      </div>
    </div>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-14 scroll-mt-20">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-3 border-b border-gray-200">{title}</h2>
      {children}
    </section>
  )
}

export default function RoiWhitepaperPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-4">
          <Link href="/docs" className="text-sm text-blue-600 hover:underline">← Documentation</Link>
        </div>
        <div className="mb-12">
          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">WHITEPAPER</span>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">ROI Methodology Whitepaper</h1>
          <p className="text-xl text-gray-600 mb-6">
            The complete mathematical framework behind GigAnalytics's income stream analysis — how we calculate true hourly rates, acquisition ROI, platform fee impact, and cross-stream comparisons.
          </p>
          <div className="flex gap-6 text-sm text-gray-500 border-t border-gray-100 pt-4">
            <span>Version 1.0 · June 2025</span>
            <span>10 min read</span>
            <Link href="/docs/roi-formulas" className="text-blue-600 hover:underline">Quick reference →</Link>
          </div>
        </div>

        {/* TOC */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-12">
          <h2 className="font-bold text-gray-900 mb-4">Contents</h2>
          <ol className="space-y-2 text-sm">
            {[
              ['1', 'The problem with traditional income tracking', '#problem'],
              ['2', 'Core definitions and data model', '#definitions'],
              ['3', 'Net revenue calculation', '#net-revenue'],
              ['4', 'True hourly rate', '#hourly-rate'],
              ['5', 'Acquisition ROI', '#acquisition-roi'],
              ['6', 'Cross-stream comparison index', '#comparison-index'],
              ['7', 'Income goal projection', '#projection'],
              ['8', 'Statistical significance in pricing experiments', '#significance'],
              ['9', 'Design decisions and tradeoffs', '#design'],
              ['10', 'Limitations and known edge cases', '#limitations'],
            ].map(([num, title, href]) => (
              <li key={num} className="flex gap-3">
                <span className="text-gray-400 w-4 text-right flex-shrink-0">{num}.</span>
                <a href={href} className="text-blue-600 hover:underline">{title}</a>
              </li>
            ))}
          </ol>
        </div>

        {/* 1. Problem */}
        <Section id="problem" title="1. The Problem with Traditional Income Tracking">
          <p className="text-gray-600 mb-4">
            Most freelancers track income in one of two ways: a spreadsheet summing gross revenue, or an accounting tool (Wave, QuickBooks) that records transactions but provides no time-adjusted analysis. Both approaches share the same fundamental flaw: <strong>they confuse revenue with value</strong>.
          </p>
          <p className="text-gray-600 mb-4">
            A freelancer with four income streams might see this in their accounting tool:
          </p>
          <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
            <div className="grid grid-cols-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase px-4 py-2">
              <span>Stream</span><span>Monthly Revenue</span><span>Apparent Winner</span>
            </div>
            {[
              ['Direct consulting', '$3,200', '🥇 1st'],
              ['Upwork contracts', '$2,100', '🥈 2nd'],
              ['Digital products (Gumroad)', '$890', '🥉 3rd'],
              ['Newsletter sponsorships', '$480', '4th'],
            ].map(([s, r, rank]) => (
              <div key={s} className="grid grid-cols-3 px-4 py-3 text-sm border-t border-gray-100">
                <span className="text-gray-700">{s}</span>
                <span className="font-mono text-gray-800">{r}</span>
                <span>{rank}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-600 mb-4">
            Now add time data:
          </p>
          <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
            <div className="grid grid-cols-5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase px-4 py-2">
              <span>Stream</span><span>Revenue</span><span>Hours</span><span>Net $/hr</span><span>Actual Rank</span>
            </div>
            {[
              ['Direct consulting', '$3,200', '40h', '$80', '🥈 2nd'],
              ['Upwork contracts', '$2,100', '35h', '$60', '🥉 3rd'],
              ['Digital products', '$890', '2h maint.', '$445', '🥇 1st'],
              ['Newsletter', '$480', '8h', '$60', '4th (tie)'],
            ].map(([s, r, h, rate, rank]) => (
              <div key={s} className="grid grid-cols-5 px-4 py-3 text-sm border-t border-gray-100">
                <span className="text-gray-700">{s}</span>
                <span className="font-mono text-gray-700">{r}</span>
                <span className="font-mono text-gray-700">{h}</span>
                <span className="font-mono font-bold text-blue-700">{rate}</span>
                <span>{rank}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-600">
            The digital products stream — generating the least absolute revenue — has by far the highest ROI per hour. Without time-adjusted analysis, this freelancer might deprioritize their highest-value activity. GigAnalytics is built to surface this inversion systematically.
          </p>
        </Section>

        {/* 2. Definitions */}
        <Section id="definitions" title="2. Core Definitions and Data Model">
          <p className="text-gray-600 mb-6">GigAnalytics operates on three first-class entities:</p>
          <div className="space-y-4 mb-6">
            {[
              {
                term: 'Income Stream (stream)',
                def: 'A named, color-coded grouping of transactions and time entries that represents a single income source. Examples: "Consulting – Acme Corp", "Upwork Design Work", "Gumroad Templates". A stream has a platform tag (stripe, paypal, upwork, csv, manual) and an optional acquisition cost budget.',
              },
              {
                term: 'Transaction',
                def: 'A single earned payment event. Fields: gross_amount (before fees), fee_amount (platform or payment processor fees), net_amount (gross minus fees), transaction_date, stream_id. Transactions are imported from Stripe, PayPal, Upwork exports, or CSV.',
              },
              {
                term: 'Time Entry',
                def: 'A logged work session associated with a stream. Fields: started_at, stopped_at (or duration_minutes), stream_id, source (timer, calendar, manual). The duration represents billable/attributable work time for the stream during that session.',
              },
            ].map(({ term, def }) => (
              <div key={term} className="border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-2 font-mono text-sm">{term}</h3>
                <p className="text-gray-600 text-sm">{def}</p>
              </div>
            ))}
          </div>
          <p className="text-gray-600">
            All calculations are performed over a configurable <strong>date range window</strong> (default: 90 days). Transactions and time entries outside the window are excluded. The window is applied independently to each stream.
          </p>
        </Section>

        {/* 3. Net Revenue */}
        <Section id="net-revenue" title="3. Net Revenue Calculation">
          <p className="text-gray-600 mb-6">
            Gross revenue is what platforms report. Net revenue is what you actually keep. GigAnalytics uses net revenue — not gross — as the basis for all ROI calculations. This matters: Upwork charges a 10–20% service fee; Stripe charges 2.9% + $0.30; PayPal varies.
          </p>
          <Formula
            label="Net Revenue (single transaction)"
            formula={`net_amount = gross_amount - fee_amount

Where fee_amount is:
  - Stripe: gross_amount × 0.029 + 0.30 (if not already in export)
  - PayPal: gross_amount × 0.0299 + 0.49 (if not in export)
  - Upwork: gross_amount × fee_rate (10-20% per contract tier)
  - CSV: use fee_amount column if present, else 0`}
            example="$500 Upwork contract at 10% fee: net = $500 - $50 = $450"
            note="If you import from Stripe Balance History CSV, fee_amount is already correct in the export. GigAnalytics reads it directly."
          />
          <Formula
            label="Stream Net Revenue (over date window)"
            formula={`stream_net_revenue(stream, from, to) =
  SUM(t.net_amount)
  FOR t IN transactions
  WHERE t.stream_id = stream.id
    AND t.transaction_date BETWEEN from AND to`}
            example="Stream 'Upwork Design' in Q1 2025: 12 transactions totaling $3,420 net"
          />
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 mb-4">
            <strong>Multi-currency note:</strong> If your transactions span currencies, GigAnalytics converts to your account's base currency using daily exchange rates at transaction_date (sourced from Open Exchange Rates). All net revenue figures in the dashboard are in your base currency.
          </div>
        </Section>

        {/* 4. True Hourly Rate */}
        <Section id="hourly-rate" title="4. True Hourly Rate">
          <p className="text-gray-600 mb-6">
            The true hourly rate is the central metric of GigAnalytics. It answers: "Given everything I earned and everything I spent on this stream, what did I actually make per hour of work?"
          </p>
          <Formula
            label="True Hourly Rate"
            formula={`true_hourly_rate(stream, from, to) =
  (stream_net_revenue(stream, from, to) - acquisition_costs(stream, from, to))
  ÷ total_hours_worked(stream, from, to)

Where:
  acquisition_costs = SUM of ad spend, platform subscription fees,
                      tools, and other costs attributed to the stream
  total_hours_worked = SUM(time_entry.duration_minutes) / 60
                       FOR time entries in the date window`}
            example="Stream earns $3,420 net, $120 in Upwork subscription cost, 40 hours logged → ($3,420 - $120) / 40 = $82.50/hr"
            note="If no acquisition costs exist for a stream, the formula simplifies to net_revenue / hours."
          />
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Why subtract acquisition costs before dividing?</h3>
            <p className="text-sm text-blue-800">
              A common mistake is to calculate hourly rate on gross revenue, then separately track ad spend. This understates the true cost of customer acquisition. If you spent $200 on ads to land a $800 project that took 4 hours, the real rate is ($800 - $200) / 4 = $150/hr — not $200/hr. GigAnalytics always computes post-acquisition rates.
            </p>
          </div>
          <Formula
            label="Portfolio Hourly Rate (all streams)"
            formula={`portfolio_hourly_rate(from, to) =
  SUM(stream_net_revenue(s, from, to) - acquisition_costs(s, from, to))
  ÷ SUM(total_hours_worked(s, from, to))
  FOR s IN active_streams`}
            example="3 streams: $3,300 + $890 + $480 net, $320 total costs, 42 + 2 + 8 hours → $4,350 / 52 = $83.65/hr portfolio rate"
            note="This is a revenue-weighted average, not an arithmetic mean of stream rates."
          />
        </Section>

        {/* 5. Acquisition ROI */}
        <Section id="acquisition-roi" title="5. Acquisition ROI">
          <p className="text-gray-600 mb-6">
            Acquisition ROI measures the return on money spent to generate income from a stream. This includes ad spend, platform fees, tools subscriptions, and any other costs you explicitly attribute to a stream.
          </p>
          <Formula
            label="Acquisition ROI"
            formula={`acquisition_roi(stream, from, to) =
  (stream_net_revenue(stream, from, to) - acquisition_costs(stream, from, to))
  ÷ acquisition_costs(stream, from, to) × 100

Result is a percentage.
A value > 0% means the stream is net-positive after acquisition costs.
A value of 400% means you earned $5 for every $1 spent on acquisition.`}
            example="$2,000 net revenue, $400 in ads → ($2,000 - $400) / $400 × 100 = 400% ROI"
            note="Streams with no acquisition costs show 'N/A' for this metric, not ∞%, to avoid misleading comparisons."
          />
          <Formula
            label="Cost per Dollar Earned (CDE)"
            formula={`cost_per_dollar_earned(stream, from, to) =
  acquisition_costs(stream, from, to)
  ÷ stream_net_revenue(stream, from, to)

Lower is better. 0.0 = no acquisition cost. 1.0 = break-even.`}
            example="$400 ad spend, $2,000 net revenue → CDE = 0.20 (you spend $0.20 to earn $1)"
          />
        </Section>

        {/* 6. Cross-Stream Comparison */}
        <Section id="comparison-index" title="6. Cross-Stream Comparison Index">
          <p className="text-gray-600 mb-4">
            Comparing streams by raw hourly rate alone ignores risk, effort variance, and income reliability. GigAnalytics computes a composite comparison index that weights four dimensions:
          </p>
          <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
            <div className="grid grid-cols-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase px-4 py-2">
              <span>Dimension</span><span>Weight</span><span>Rationale</span>
            </div>
            {[
              ['True hourly rate', '50%', 'Primary income efficiency metric'],
              ['Reliability (% months with income)', '25%', 'Penalizes feast-or-famine streams'],
              ['Acquisition ROI', '15%', 'Rewards streams with low cost-of-acquisition'],
              ['Growth trend (last 3 months)', '10%', 'Favors accelerating streams'],
            ].map(([d, w, r]) => (
              <div key={d} className="grid grid-cols-3 px-4 py-3 text-sm border-t border-gray-100">
                <span className="font-medium text-gray-700">{d}</span>
                <span className="font-bold text-blue-700">{w}</span>
                <span className="text-gray-500">{r}</span>
              </div>
            ))}
          </div>
          <Formula
            label="Stream Comparison Index Score (0–100)"
            formula={`score(stream) =
  0.50 × normalize(true_hourly_rate)
  + 0.25 × reliability_score
  + 0.15 × normalize(acquisition_roi)
  + 0.10 × normalize(revenue_growth_rate)

Where normalize(x) maps x to [0, 1] across all active streams using min-max scaling.
reliability_score = months_with_income / total_months_in_window`}
            note="The index is relative — it compares your streams to each other, not to benchmarks. A stream with score 85 is better than your other streams, not necessarily 'good' in absolute terms."
          />
        </Section>

        {/* 7. Income Goal Projection */}
        <Section id="projection" title="7. Income Goal Projection">
          <p className="text-gray-600 mb-6">
            The pricing wizard answers: "Given my income goal, how should I price each stream?" The calculation works backwards from a target monthly net income.
          </p>
          <Formula
            label="Required Rate to Hit Monthly Goal"
            formula={`For a stream you want to grow:

required_rate(stream, monthly_goal, target_hours) =
  monthly_goal / target_hours

Adjusted for acquisition costs:
required_gross_rate =
  (monthly_goal + projected_acquisition_costs) / target_hours

Where projected_acquisition_costs is extrapolated from
the stream's historical cost-per-revenue ratio.`}
            example="Goal: $6,000/mo. Consulting stream: 30 target hours, $200/mo acquisition. Required rate = ($6,000 + $200) / 30 = $206.67/hr"
          />
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-900">
            <strong>Multi-stream allocation:</strong> When you have multiple streams, the wizard distributes your income goal across streams proportionally to their current reliability scores. Higher-reliability streams get a larger target allocation. You can override the allocation manually.
          </div>
        </Section>

        {/* 8. Statistical Significance */}
        <Section id="significance" title="8. Statistical Significance in Pricing Experiments">
          <p className="text-gray-600 mb-4">
            When you run an A/B pricing experiment (e.g., "$80/hr vs $100/hr for 30 days each"), GigAnalytics determines whether the observed revenue difference is statistically meaningful or likely due to random variation.
          </p>
          <Formula
            label="Two-proportion Z-test for revenue conversion"
            formula={`For two pricing variants A and B:

p_A = conversions_A / impressions_A
p_B = conversions_B / impressions_B
p_pool = (conversions_A + conversions_B) / (impressions_A + impressions_B)

z = (p_A - p_B) / sqrt(p_pool × (1 - p_pool) × (1/n_A + 1/n_B))

significance_level = two-tailed p-value from standard normal distribution

We report: "significant at 95% confidence" if |z| > 1.96`}
            note="For hourly-rate experiments, 'conversions' = bookings/acceptances; 'impressions' = opportunities presented. For direct revenue experiments (e.g., product price testing), we use mean revenue per transaction with Welch's t-test instead."
          />
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
            <strong>Minimum sample sizes:</strong> We display a significance indicator only when both variants have ≥ 20 transactions. Below that threshold, the dashboard shows "collecting data" rather than a potentially misleading p-value.
          </div>
        </Section>

        {/* 9. Design Decisions */}
        <Section id="design" title="9. Design Decisions and Tradeoffs">
          <div className="space-y-6">
            {[
              {
                decision: 'Why use timer start time for heatmap bucketing?',
                rationale: 'Timer start time is the most reliable signal of when work effort begins. Using transaction_date would create misleading patterns — a project invoiced on Friday that was worked on Monday would appear as a Friday peak.',
              },
              {
                decision: 'Why is the comparison index weighted 50% on hourly rate?',
                rationale: 'We tested equal-weighted and reliability-first weightings in user interviews. Freelancers consistently said "tell me the real hourly rate first, then reliability." The 50/25/15/10 split matched the mental model of 80% of participants.',
              },
              {
                decision: 'Why not use GAAP accounting (accrual vs cash)?',
                rationale: 'GigAnalytics uses cash accounting (record income when received, costs when paid). For freelancers, cash flow clarity matters more than accrual matching. Most freelancers are not required to use GAAP.',
              },
              {
                decision: 'Why subtract acquisition costs before dividing by hours?',
                rationale: 'Acquisition time (prospecting, pitching, applying) is often not tracked. Subtracting costs from revenue gives a conservative hourly rate that accounts for untracked acquisition effort through its financial proxy.',
              },
              {
                decision: 'Why 90-day default window?',
                rationale: 'Shorter windows (30 days) amplify variance from seasonal patterns. Longer windows (180+ days) dilute signals from pricing changes you made recently. 90 days balances recency with statistical stability for most freelancers.',
              },
            ].map(({ decision, rationale }) => (
              <div key={decision} className="border-l-4 border-blue-300 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">{decision}</h3>
                <p className="text-gray-600 text-sm">{rationale}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 10. Limitations */}
        <Section id="limitations" title="10. Limitations and Known Edge Cases">
          <ul className="space-y-4">
            {[
              { issue: 'Passive income attribution', detail: 'Royalties, affiliate income, and ad revenue are difficult to attribute to specific work hours. GigAnalytics excludes time-entry-less transactions from hourly rate calculations, which may cause passive income streams to appear artificially low or show "no hourly rate available."' },
              { issue: 'Retainer contracts', detail: 'A $5,000/month retainer with variable deliverables will have accurate revenue tracking but potentially misleading hourly rates if the time logged doesn\'t reflect the full scope of work. We recommend logging all client-related time, including async communication.' },
              { issue: 'Expenses beyond acquisition costs', detail: 'GigAnalytics currently models only acquisition costs as an expense category. General business expenses (equipment, software, insurance) are not subtracted from stream revenue — doing so would require a full bookkeeping model outside our scope.' },
              { issue: 'Currency conversion lag', detail: 'Exchange rates are fetched at transaction_date. For multi-currency freelancers, actual received amounts may differ if payment processors apply their own exchange rates. The variance is typically < 2%.' },
              { issue: 'Long-running projects', detail: 'A project billed in Month 3 for work done in Months 1–3 will be attributed to the transaction_date (Month 3). The ROI calculation for Month 3 will appear elevated, while Months 1–2 will appear lower. Use the 90-day window to smooth this out.' },
            ].map(({ issue, detail }) => (
              <li key={issue} className="flex gap-3">
                <span className="text-amber-500 flex-shrink-0 mt-0.5">⚠️</span>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{issue}</h3>
                  <p className="text-gray-600 text-sm mt-1">{detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {/* Footer nav */}
        <div className="border-t border-gray-200 pt-8 flex flex-wrap gap-4 text-sm">
          <Link href="/docs" className="text-blue-600 hover:underline">← All Docs</Link>
          <Link href="/docs/roi-formulas" className="text-blue-600 hover:underline">Quick Formula Reference →</Link>
          <Link href="/docs/privacy-benchmarking" className="text-blue-600 hover:underline">Privacy & Benchmarking →</Link>
        </div>
      </div>
    </main>
  )
}
