import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Understanding the Benchmark Dataset — GigAnalytics Docs',
  description: 'How GigAnalytics collects, anonymizes, and surfaces the freelancer benchmark data that powers rate comparisons and pricing recommendations.',
}

export default function BenchmarkDataPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="mb-4">
          <Link href="/docs" className="text-sm text-blue-600 hover:underline">← Documentation</Link>
        </div>

        <div className="mb-10">
          <span className="inline-block bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">ADVANCED</span>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Understanding the Benchmark Dataset</h1>
          <p className="text-xl text-gray-600">How GigAnalytics collects, anonymizes, and uses aggregate earnings data to power rate comparisons — and how your privacy is protected.</p>
        </div>

        {/* Opt-in model */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How benchmark data is collected</h2>
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-4">
            <h3 className="font-semibold text-green-900 mb-2">✅ Strictly opt-in</h3>
            <p className="text-green-800 text-sm">
              Benchmark data is <strong>only collected from Pro users who explicitly enable "Contribute to benchmarks"</strong> in Settings → Privacy. Free users never contribute data. Disabling the toggle at any time removes your contribution from future aggregations within 24 hours.
            </p>
          </div>
          <p className="text-gray-600 mb-4">
            When you opt in, GigAnalytics periodically sends aggregated (not raw) metrics from your income streams to our benchmark pipeline. We never send individual transactions, client names, or payment details.
          </p>
          <h3 className="font-semibold text-gray-900 mb-2">What gets sent when you opt in</h3>
          <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
            <div className="grid grid-cols-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase px-4 py-2">
              <span>Field</span><span>Sent?</span><span>Notes</span>
            </div>
            {[
              ['Platform category (e.g. "design")', 'Yes', 'Bucketed — never exact platform name unless you confirm'],
              ['Hourly rate range (bucketed)', 'Yes', 'e.g. "$40–$50/hr" — never exact'],
              ['Country / region (broad)', 'Yes', 'Country-level only, never city or address'],
              ['Years of experience range', 'Yes', 'e.g. "3–5 years" — derived from account history'],
              ['Individual transaction amounts', 'No', 'Never sent'],
              ['Client names or descriptions', 'No', 'Never sent'],
              ['Exact income amounts', 'No', 'Only ranges and averages'],
              ['Timer descriptions / notes', 'No', 'Never sent'],
            ].map(([field, sent, notes], i) => (
              <div key={i} className="grid grid-cols-3 px-4 py-3 text-sm border-t border-gray-100">
                <span className="text-gray-700">{field}</span>
                <span className={sent === 'Yes' ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>{sent}</span>
                <span className="text-gray-500">{notes}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Anonymization */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Anonymization methodology</h2>
          <p className="text-gray-600 mb-4">
            Before your data enters the benchmark pool, it goes through a four-step anonymization pipeline:
          </p>
          <ol className="space-y-4">
            {[
              { step: '1', title: 'K-anonymity bucketing', desc: 'No bucket in the benchmark dataset contains fewer than 25 users. If your specific combination of platform + rate + region has fewer than 25 contributors, your data is suppressed from that segment until the pool grows.' },
              { step: '2', title: 'Differential privacy noise', desc: 'We add calibrated statistical noise to aggregate values (Laplace mechanism, ε = 0.5) so that no individual\'s presence or absence can be inferred from the published percentiles.' },
              { step: '3', title: 'Delayed publishing', desc: 'Contributions from the last 72 hours are held before entering the aggregate. This prevents near-real-time inference attacks.' },
              { step: '4', title: 'User ID removal', desc: 'Contributions are decoupled from user IDs before entering the benchmark store. The pipeline is append-only and logs are rotated after 30 days.' },
            ].map(({ step, title, desc }) => (
              <li key={step} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">{step}</div>
                <div>
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                  <p className="text-gray-600 text-sm mt-1">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* How benchmarks are surfaced */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How benchmarks surface in GigAnalytics</h2>
          <p className="text-gray-600 mb-4">Benchmark data is surfaced in three places in the Pro dashboard:</p>
          <div className="space-y-4">
            {[
              { loc: 'ROI dashboard → Rate comparison widget', what: 'Shows p25/median/p75 hourly rates for your platform category and region. Your rate is shown as a dot on the distribution.' },
              { loc: 'Pricing experiment recommendations', what: 'When you run an A/B pricing test, the AI insight layer uses benchmark data to suggest whether your tested price is above or below market median.' },
              { loc: 'Onboarding income goal wizard', what: 'The "How much should I charge?" guide uses benchmark hourly rates to give you a realistic starting point for your target income calculation.' },
            ].map(({ loc, what }, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{loc}</h3>
                <p className="text-gray-600 text-sm">{what}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Opting out */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Opting out</h2>
          <p className="text-gray-600 mb-4">
            Go to <strong>Settings → Privacy → Benchmark contribution</strong> and toggle it off. Your data stops contributing within 24 hours. You can still <em>view</em> benchmark data in the dashboard — contributions and viewing are independent controls.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
            <strong>Account deletion:</strong> If you delete your GigAnalytics account, your contributed data is permanently removed from all future benchmark aggregations. Previously published aggregate values may have included your data, but future pulls will not.
          </div>
        </section>

        <div className="border-t border-gray-200 pt-8 flex gap-4 text-sm">
          <Link href="/docs" className="text-blue-600 hover:underline">← All Docs</Link>
          <Link href="/docs/ai-limitations" className="text-blue-600 hover:underline">AI Limitations →</Link>
        </div>
      </div>
    </main>
  )
}
