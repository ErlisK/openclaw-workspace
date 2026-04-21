import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'BetaWindow — Human QA Testing for AI-Built Apps',
  description: 'Submit your AI-built app URL. A real human tests it in a live Chrome session with network logs and console capture. Results typically in under 4 hours (subject to tester availability).',
  alternates: { canonical: '/' },
}


export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <span className="text-lg font-bold text-gray-900">BetaWindow</span>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/marketplace" className="text-gray-600 hover:text-gray-900">Find jobs</Link>
          <Link href="/login" className="text-gray-600 hover:text-gray-900">Sign in</Link>
          <Link href="/signup" className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700">Get started</Link>
        </div>
      </nav>

      <main className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="max-w-3xl">
          {/* Launch promo banner */}
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 text-sm font-semibold bg-amber-50 border border-amber-200 text-amber-800 rounded-full">
            <span>🎉</span>
            <span>Launch offer: <strong>first Quick test FREE</strong> — auto-applied at signup (no code needed) · <strong>Expires Apr 30</strong></span>
          </div>
          <div className="inline-block mb-6 px-3 py-1 text-xs font-semibold tracking-wide uppercase bg-indigo-100 text-indigo-700 rounded-full">
            Built for vibe coders &amp; AI agent operators
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-6">
            Human QA for your<br />
            <span className="text-indigo-600">AI-built app</span>
          </h1>
          <p className="text-xl text-gray-500 mb-10 max-w-xl mx-auto">
            Submit your public URL. A real human tests your app in Chrome, with network logs and console errors captured automatically. Report typically delivered in under 4 hours (subject to tester availability).
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
            <Link
              href="/signup"
              className="px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors text-lg"
            >
              Get your first test free →
            </Link>
            <Link
              href="/report/demo"
              className="px-8 py-4 bg-white text-indigo-600 font-semibold rounded-lg border border-indigo-200 hover:border-indigo-400 transition-colors text-lg"
            >
              See a sample report →
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-white text-gray-700 font-semibold rounded-lg border border-gray-200 hover:border-gray-300 transition-colors text-lg"
            >
              Sign in
            </Link>
          </div>

          {/* Features */}
          <div className="mb-20 text-left">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Everything you need in one report</h2>
              <p className="text-gray-500 text-base">No setup required on your end — just a URL.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                {
                  icon: '🎥',
                  title: 'Full session recording',
                  desc: 'Every click, scroll, and interaction captured. Watch exactly what your tester did and where they got confused.',
                },
                {
                  icon: '🌐',
                  title: 'Network request log',
                  desc: 'All HTTP requests and responses logged automatically. Catch broken API calls, 4xx/5xx errors, and slow fetches.',
                },
                {
                  icon: '🐛',
                  title: 'Console error capture',
                  desc: 'JavaScript exceptions, warnings, and console output captured in real time — no browser devtools required.',
                },
                {
                  icon: '✍️',
                  title: 'Plain-English bug report',
                  desc: 'Your tester writes up every issue they found with reproduction steps, severity, and screenshots.',
                },
                {
                  icon: '🤖',
                  title: 'AI-ready summary',
                  desc: 'Structured output you can paste straight into your AI coding agent. AI summaries are generated automatically and should be reviewed for accuracy.',
                },
                {
                  icon: '⚡',
                  title: 'Fast turnaround',
                  desc: "Results typically within 4 hours. Real humans, not bots — matched to your app's complexity tier.",
                },
              ].map((f) => (
                <div key={f.title} className="rounded-xl p-5 border border-gray-100 bg-gray-50">
                  <div className="text-2xl mb-3">{f.icon}</div>
                  <div className="font-semibold text-gray-900 mb-1">{f.title}</div>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="mb-20 max-w-2xl mx-auto text-left">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">How it works</h2>
              <p className="text-gray-500 text-base">Three steps. No SDK, no config.</p>
            </div>
            <ol className="space-y-6">
              {[
                { step: '1', title: 'Submit your app URL', desc: 'Paste a public URL, pick a test tier, and describe what you want tested. Takes 60 seconds.' },
                { step: '2', title: 'A real human tests it', desc: 'A registered tester opens your app in a live Chrome session. Network logs and console output are captured automatically.' },
                { step: '3', title: 'Get your report', desc: 'You receive a structured report with bugs, a session recording, and an AI-ready summary to feed back into your agent.' },
              ].map((item) => (
                <li key={item.step} className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center">{item.step}</div>
                  <div>
                    <div className="font-semibold text-gray-900">{item.title}</div>
                    <div className="text-sm text-gray-500 mt-0.5">{item.desc}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Tiers */}
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Simple pricing</h2>
            <p className="text-gray-500 text-base">Pick the tier that fits your test. No subscription required.</p>
          </div>
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
                  <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">Most popular tier</div>
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
                  {tier.name === 'Deep' ? <li>✓ Mobile responsiveness notes</li> : null}
                  {tier.name === 'Deep' ? <li className="font-medium text-indigo-600">✓ Priority queue (1-hour SLA)</li> : null}
                </ul>
              </div>
            ))}
          </div>

          {/* AI Agent Integration Snippet */}
          <div className="mt-16 mb-8 text-left bg-gray-950 rounded-2xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">For AI Agents &amp; Developers — REST API</span>
              <span className="text-xs text-gray-500">curl · Node · Python</span>
            </div>
            <pre className="text-sm text-green-300 overflow-x-auto whitespace-pre-wrap">{`# Submit a test job in one API call
curl -X POST https://betawindow.com/api/v1/jobs \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Test the signup and core feature flow",
    "url": "https://your-app.vercel.app",
    "tier": "quick",
    "instructions": "Sign up, complete onboarding, trigger main feature"
  }'

# Returns: { job_id, status: "published", estimated_completion: "<4h" }`}</pre>
            <div className="mt-4 flex gap-3">
              <Link href="/docs" className="text-xs text-indigo-400 hover:text-indigo-300 underline">View full API docs →</Link>
              <Link href="/signup" className="text-xs text-indigo-400 hover:text-indigo-300 underline">Get your API key →</Link>
            </div>
          </div>

          {/* Testimonials */}
          <div className="mt-16 py-12 border-t border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">What AI builders are saying</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                {
                  quote: "Shipped my Cursor app and found 3 critical bugs in the first test — saved me hours of user complaints. Worth every penny.",
                  name: "@vibecoder_dev",
                  role: "Built with Cursor",
                },
                {
                  quote: "I had Claude build a SaaS and couldn't tell if the auth flow was broken. BetaWindow caught a session persistence bug I never would have found.",
                  name: "@ai_founder_42",
                  role: "Claude + Replit builder",
                },
                {
                  quote: "The AI summary output is perfect — I paste it straight back into my agent and it fixes everything. This is the missing piece of the vibe coding stack.",
                  name: "@agentic_ops",
                  role: "Agent operator",
                },
              ].map((t) => (
                <div key={t.name} className="bg-gray-50 rounded-xl p-6 border border-gray-100 text-left">
                  <p className="text-gray-700 text-sm leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Social proof stats */}
          <div className="mt-8 py-8 border-t border-gray-100">
            <p className="text-center text-sm text-gray-400 mb-6">Built for the agentic era — ship AI apps with confidence</p>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-gray-900">$5</div>
                <div className="text-sm text-gray-500 mt-1">First Quick test free — <span className="font-semibold text-amber-600">auto-applied at signup</span> · expires Apr 30</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">&lt;4 hrs</div>
                <div className="text-sm text-gray-500 mt-1">Avg. report turnaround*</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-indigo-600">Free</div>
                <div className="text-sm text-gray-500 mt-1">to sign up · pay per test</div>
              </div>
            </div>
          </div>

          {/* AI tool compatibility */}
          <div className="mt-12 mb-8 py-10 border-t border-gray-100">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 mb-8">Works with every AI coding tool</p>
            <div className="flex flex-wrap justify-center items-center gap-6 opacity-60">
              {[
                { name: 'Cursor', emoji: '🟣' },
                { name: 'Replit', emoji: '🟡' },
                { name: 'Claude', emoji: '🟠' },
                { name: 'GPT-4o', emoji: '🟢' },
                { name: 'Gemini', emoji: '🔵' },
                { name: 'Bolt', emoji: '⚡' },
                { name: 'Lovable', emoji: '❤️' },
                { name: 'v0', emoji: '💫' },
              ].map((tool) => (
                <div key={tool.name} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-sm font-medium text-gray-600">
                  <span>{tool.emoji}</span>
                  <span>{tool.name}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-gray-400 mt-6">If it outputs a URL, we can test it. No SDK, no config, no agent changes required.</p>
          </div>

          <p className="mt-6 text-sm text-gray-400">
            No SDK install required on your app · Chrome desktop · Public URLs only
          </p>
          <p className="mt-2 text-xs text-gray-400">* Subject to tester availability. During early access, completion may take up to 24 hours.</p>
        </div>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-8 px-6 text-center text-sm">
        <div className="flex flex-wrap justify-center gap-6 mb-4">
          <Link href="/report/demo" className="hover:text-white">Sample Report</Link>
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
          <Link href="/marketplace" className="hover:text-white">Marketplace</Link>
          <Link href="/become-a-tester" className="hover:text-white">Become a Tester</Link>
          <Link href="/faq" className="hover:text-white">FAQ</Link>
          <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-white">Terms of Service</Link>
          <a href="mailto:hello@betawindow.com" className="hover:text-white">Contact</a>
        </div>
        <p>© {new Date().getFullYear()} BetaWindow · 2298 Johanna Court, Pinole, CA 94564 · <a href="mailto:hello@betawindow.com" className="hover:text-white">hello@betawindow.com</a></p>
      </footer>
    </div>
  )
}
