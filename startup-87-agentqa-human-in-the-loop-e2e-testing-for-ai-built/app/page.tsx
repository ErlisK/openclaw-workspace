import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 py-16 text-center">
      <div className="max-w-3xl">
        <div className="inline-block mb-6 px-3 py-1 text-xs font-semibold tracking-wide uppercase bg-indigo-100 text-indigo-700 rounded-full">
          Built for vibe coders & AI agent operators
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-6">
          Human QA for your<br />
          <span className="text-indigo-600">AI-built app</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-xl mx-auto">
          Submit your public URL. A real human tests your app in Chrome, with network logs and console errors captured automatically. Report delivered in under 4 hours.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link
            href="/submit"
            className="px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors text-lg"
          >
            Start a test — from $5
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 bg-white text-gray-700 font-semibold rounded-lg border border-gray-200 hover:border-gray-300 transition-colors text-lg"
          >
            Sign in
          </Link>
        </div>

        {/* Tiers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          {[
            { name: 'Quick', duration: '10 min', price: '$5', flows: '1 flow', highlight: false },
            { name: 'Standard', duration: '20 min', price: '$10', flows: '3 flows', highlight: true },
            { name: 'Deep', duration: '30 min', price: '$15', flows: '5+ flows', highlight: false },
          ].map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl p-6 border ${tier.highlight ? 'border-indigo-500 ring-2 ring-indigo-200 bg-white' : 'border-gray-200 bg-white'}`}
            >
              {tier.highlight && (
                <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">Most popular</div>
              )}
              <div className="text-2xl font-bold text-gray-900">{tier.price}</div>
              <div className="font-semibold text-lg text-gray-800 mt-1">{tier.name}</div>
              <div className="text-gray-500 text-sm mt-2">{tier.duration} · {tier.flows}</div>
              <ul className="mt-4 space-y-1 text-sm text-gray-600">
                <li>✓ Screen recording</li>
                <li>✓ Network request log</li>
                <li>✓ Console error capture</li>
                <li>✓ Plain-English bug report</li>
                {tier.highlight || tier.name === 'Deep' ? <li>✓ AI summary (paste into agent)</li> : null}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-12 text-sm text-gray-400">
          No SDK install required on your app · Chrome desktop · Public URLs only
        </p>
      </div>
    </main>
  )
}
