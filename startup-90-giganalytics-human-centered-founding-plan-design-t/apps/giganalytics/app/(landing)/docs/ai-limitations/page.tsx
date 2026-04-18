import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'AI Insights & Limitations',
  description: 'What GigAnalytics AI can and cannot do — confidence levels, data quality thresholds, deterministic fallbacks, and when to trust AI suggestions.',
}

function LimitCard({ emoji, title, detail }: { emoji: string; title: string; detail: string }) {
  return (
    <div className="flex gap-3 p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
      <span className="text-lg mt-0.5">{emoji}</span>
      <div>
        <p className="font-medium text-red-900 dark:text-red-200">{title}</p>
        <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">{detail}</p>
      </div>
    </div>
  )
}

function CanCard({ emoji, title, detail }: { emoji: string; title: string; detail: string }) {
  return (
    <div className="flex gap-3 p-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
      <span className="text-lg mt-0.5">{emoji}</span>
      <div>
        <p className="font-medium text-green-900 dark:text-green-200">{title}</p>
        <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">{detail}</p>
      </div>
    </div>
  )
}

export default function AiLimitationsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 text-sm">
      <nav className="text-xs text-gray-500 mb-6">
        <Link href="/docs" className="hover:underline">← Docs</Link>
        {' / AI Limitations'}
      </nav>

      <h1 className="text-2xl font-bold mb-2">🤖 AI Insights & Limitations</h1>
      <div className="mb-6 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-xs text-amber-900 dark:text-amber-200">
        <strong>Important:</strong> GigAnalytics AI insights are suggestions, not financial advice.
        Always apply your own judgment before changing your rates, accepting work, or making financial decisions.
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        GigAnalytics uses <strong>Anthropic Claude</strong> (via Vercel AI Gateway) to generate income
        insights. This page explains exactly what the AI does, what it doesn't do, and how to interpret
        its output responsibly.
      </p>

      {/* Model */}
      <section className="mb-10">
        <h2 className="text-base font-semibold mb-4">Which AI Model?</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="text-left px-3 py-2 border border-gray-200 dark:border-gray-700">Use case</th>
                <th className="text-left px-3 py-2 border border-gray-200 dark:border-gray-700">Model</th>
                <th className="text-left px-3 py-2 border border-gray-200 dark:border-gray-700">Notes</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Weekly summaries', 'claude-haiku-4-5', 'Fast, cost-effective narrative summaries'],
                ['Price suggestions', 'claude-haiku-4-5', 'Structured output (price + rationale)'],
                ['Schedule suggestions', 'claude-haiku-4-5', 'Best hours/days recommendation'],
                ['Fallback (no AI)', 'Deterministic rules', 'Used when AI is unavailable or data quality is low'],
              ].map(([u, m, n]) => (
                <tr key={u} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-900 dark:even:bg-gray-800/40">
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">{u}</td>
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 font-mono">{m}</td>
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-500">{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* What it can do */}
      <section className="mb-10">
        <h2 className="text-base font-semibold mb-4">What the AI Can Do ✅</h2>
        <div className="space-y-3">
          <CanCard
            emoji="📊"
            title="Summarize your income trends in plain language"
            detail="Given your last 30 days of net revenue, transaction counts, and hourly rates, it writes a 2–3 sentence summary of what happened."
          />
          <CanCard
            emoji="💰"
            title="Suggest a rate adjustment based on your data"
            detail="It analyzes your current true hourly rate, your income target gap, and your historical volume to recommend a rate change with a specific rationale."
          />
          <CanCard
            emoji="📅"
            title="Recommend your best hours and days to work"
            detail="Based on your revenue heatmap data, it identifies your top-performing time slots and explains the pattern in plain language."
          />
          <CanCard
            emoji="⚠️"
            title="Flag anomalies and data gaps"
            detail="If your data shows unusual spikes, a long gap with no income, or a sudden rate drop, the AI will call it out explicitly."
          />
        </div>
      </section>

      {/* What it cannot do */}
      <section className="mb-10">
        <h2 className="text-base font-semibold mb-4">What the AI Cannot Do ❌</h2>
        <div className="space-y-3">
          <LimitCard
            emoji="🔮"
            title="Predict future income"
            detail="All insights are backward-looking. The AI does not forecast what you will earn next month."
          />
          <LimitCard
            emoji="📈"
            title="Account for market conditions outside your data"
            detail="The AI only sees your transactions and time logs. It has no knowledge of platform algorithm changes, seasonal demand, or economic conditions."
          />
          <LimitCard
            emoji="🧮"
            title="Give financial or tax advice"
            detail="GigAnalytics AI is not a financial advisor. Do not use its output for tax planning, investment decisions, or loan applications."
          />
          <LimitCard
            emoji="🔁"
            title="Learn from your feedback"
            detail="The model is stateless. Dismissing or acting on an insight does not change future suggestions. Each generation is independent."
          />
          <LimitCard
            emoji="🌍"
            title="Benchmark against other users"
            detail="AI insights are generated from your data only. Benchmark comparisons (percentile rankings) come from the separate, opt-in benchmark layer — not the AI."
          />
        </div>
      </section>

      {/* Data quality thresholds */}
      <section className="mb-10">
        <h2 className="text-base font-semibold mb-4">Data Quality & Fallback Behavior</h2>
        <p className="mb-4 text-gray-600 dark:text-gray-400">
          When your data is below these thresholds, GigAnalytics falls back to deterministic rule-based
          insights instead of calling the AI model. The insight card will show a "Based on rules (not AI)"
          label.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="text-left px-3 py-2 border border-gray-200 dark:border-gray-700">Condition</th>
                <th className="text-left px-3 py-2 border border-gray-200 dark:border-gray-700">Threshold</th>
                <th className="text-left px-3 py-2 border border-gray-200 dark:border-gray-700">Fallback</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Transaction count', '< 5 transactions', 'Rule-based summary only'],
                ['Time data', '0 billable hours', 'No hourly rate, no schedule suggestion'],
                ['Date range', '< 7 days of data', 'No weekly summary'],
                ['Net revenue', '$0 or negative', 'Alert insight only (no rate suggestion)'],
                ['AI gateway error', 'Timeout / unavailable', 'Deterministic fallback for all insight types'],
              ].map(([c, t, f]) => (
                <tr key={c} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-900 dark:even:bg-gray-800/40">
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">{c}</td>
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 font-mono">{t}</td>
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-500">{f}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Confidence */}
      <section className="mb-10">
        <h2 className="text-base font-semibold mb-4">Confidence Levels</h2>
        <p className="mb-4 text-gray-600 dark:text-gray-400">
          Each insight includes a <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">confidence</code> field
          (low / medium / high) based on sample size and data completeness:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="text-left px-3 py-2 border border-gray-200 dark:border-gray-700 w-16">Level</th>
                <th className="text-left px-3 py-2 border border-gray-200 dark:border-gray-700">Criteria</th>
                <th className="text-left px-3 py-2 border border-gray-200 dark:border-gray-700">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['🟢 high', '≥ 20 transactions AND billable hours logged', 'Strong data foundation; insight is reliable'],
                ['🟡 medium', '5–19 transactions OR some hours missing', 'Reasonable estimate; treat as directional'],
                ['🔴 low', '< 5 transactions OR no time data', 'Sparse data; insight may be misleading'],
              ].map(([l, c, m]) => (
                <tr key={l} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-900 dark:even:bg-gray-800/40">
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 font-medium">{l}</td>
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">{c}</td>
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-500">{m}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Privacy */}
      <section className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs">
        <h2 className="font-semibold mb-2">Privacy: What the AI Sees</h2>
        <p className="text-blue-900 dark:text-blue-200">
          The AI receives only <strong>aggregated statistics</strong> from your data — totals, averages,
          transaction counts, percentile ranks, and date ranges. It does not receive raw transaction
          descriptions, client names, or individual line items. See the{' '}
          <Link href="/privacy" className="underline">Privacy Policy</Link> for full details.
        </p>
      </section>

      <footer className="mt-12 pt-6 border-t text-xs text-gray-400 flex gap-4">
        <Link href="/docs/pricing-experiments" className="underline">← Pricing Experiments</Link>
        <Link href="/docs" className="underline">All Docs</Link>
      </footer>
    </main>
  )
}
