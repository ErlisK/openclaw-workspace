import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Running 5 Income Streams Without Burning Out: A Systems Approach — GigAnalytics',
  description:
    'Most multi-income earners don\'t fail from lack of hustle — they fail from lack of data. Here\'s how to use a simple measurement system to decide which streams deserve your time.',
  openGraph: {
    title: 'Running 5 Income Streams Without Burning Out: A Systems Approach',
    description: 'A data-driven approach to managing multiple gig income streams.',
    url: 'https://hourlyroi.com/blog/five-income-streams',
    type: 'article',
  },
}

export default function FiveIncomeStreamsPost() {
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
        <div className="mb-10">
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
            <time dateTime="2025-03-27">March 27, 2025</time>
            <span>·</span><span>7 min read</span>
            <span>·</span>
            {['Productivity', 'Multi-income', 'Systems'].map(t => (
              <span key={t} className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-xs">{t}</span>
            ))}
          </div>
          <h1 className="text-3xl font-bold text-white mb-4 leading-tight">
            Running 5 Income Streams Without Burning Out: A Systems Approach
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Most multi-income earners don&apos;t fail from lack of hustle — they fail from lack of data.
            Here&apos;s how to use a simple measurement system to decide which streams deserve your time.
          </p>
        </div>

        <article className="prose prose-invert prose-gray max-w-none">
          <h2>The Hustle Trap</h2>
          <p>
            There&apos;s a seductive narrative in the gig economy: more streams = more income = more
            freedom. And it&apos;s partially true — diversification reduces risk, and multiple income
            streams can build meaningful wealth.
          </p>
          <p>
            But there&apos;s a failure mode almost nobody talks about: running 5 streams without knowing
            which 2 are actually carrying the other 3. The result is a grinding, always-busy feeling
            with income growth that never quite keeps up with effort.
          </p>
          <p>
            The fix isn&apos;t more hustle. It&apos;s measurement.
          </p>

          <h2>The 3-Metric Framework</h2>
          <p>
            For each income stream, you need three numbers:
          </p>
          <ol>
            <li><strong>True hourly rate</strong> — net income ÷ total hours (including admin)</li>
            <li><strong>Time concentration</strong> — what % of your total work hours does this stream consume?</li>
            <li><strong>Growth trajectory</strong> — is this stream growing, stable, or declining month-over-month?</li>
          </ol>
          <p>
            With just these three numbers per stream, you can make clear resource allocation decisions
            instead of gut-feel guesses.
          </p>

          <h2>Case Study: The Designer with 4 Streams</h2>
          <p>
            Let&apos;s look at a realistic example: a UX designer running four income streams.
          </p>

          <div className="bg-gray-900 rounded-lg p-6 my-6 font-mono text-sm overflow-x-auto">
            <div className="text-gray-400 mb-3 font-sans font-semibold">Monthly snapshot</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left pb-2 pr-4">Stream</th>
                  <th className="text-right pb-2 pr-4">Revenue</th>
                  <th className="text-right pb-2 pr-4">Hours</th>
                  <th className="text-right pb-2 pr-4">True $/hr</th>
                  <th className="text-right pb-2">Trend</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-gray-800">
                  <td className="py-2 pr-4">Upwork clients</td>
                  <td className="text-right pr-4">$3,200</td>
                  <td className="text-right pr-4">42h</td>
                  <td className="text-right pr-4 text-green-400">$76</td>
                  <td className="text-right text-green-400">↑ +12%</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-2 pr-4">Fiverr gigs</td>
                  <td className="text-right pr-4">$890</td>
                  <td className="text-right pr-4">28h</td>
                  <td className="text-right pr-4 text-yellow-400">$32</td>
                  <td className="text-right text-gray-500">→ flat</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-2 pr-4">Design course</td>
                  <td className="text-right pr-4">$1,100</td>
                  <td className="text-right pr-4">6h</td>
                  <td className="text-right pr-4 text-green-400">$183</td>
                  <td className="text-right text-green-400">↑ +8%</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Template shop</td>
                  <td className="text-right pr-4">$240</td>
                  <td className="text-right pr-4">15h</td>
                  <td className="text-right pr-4 text-red-400">$16</td>
                  <td className="text-right text-red-400">↓ −5%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            The picture is clear: the template shop is burning 15 hours per month for $240 and
            declining. Fiverr is time-intensive at a low rate. The design course is almost pure profit.
            Upwork is the core engine.
          </p>
          <p>
            Without this data, a hustle-brain response might be &quot;I need to put more into the
            template shop — it just needs more listings.&quot; With the data, the right move is
            obvious: deprecate the template shop, reduce Fiverr to maintenance-only, and double down
            on the course (highest margin, growing, minimal time).
          </p>

          <h2>The &quot;Minimum Viable Stream&quot; Rule</h2>
          <p>
            Every income stream has a minimum viable threshold below which it isn&apos;t worth running.
            The calculation:
          </p>
          <div className="bg-gray-900 rounded-lg p-4 my-4 font-mono text-sm">
            <div>Min viable = your target hourly rate × hours invested</div>
            <div className="text-gray-400 mt-2">If target = $60/hr and stream takes 20h/mo:</div>
            <div className="text-yellow-400">Min revenue needed = $1,200/mo to justify it</div>
          </div>
          <p>
            If a stream consistently falls below its minimum viable threshold, it&apos;s a liability,
            not an asset — regardless of how &quot;passive&quot; you think it is.
          </p>

          <h2>Scheduling: When to Work Which Stream</h2>
          <p>
            Once you know your stream values, you can schedule intelligently. High-rate, high-effort
            work (client projects) goes in peak energy hours. Maintenance work (answering reviews,
            updating listings) goes in low-energy slots.
          </p>
          <p>
            The heatmap principle applies here too: over time, you&apos;ll notice that certain days or
            times generate more client inquiries on certain platforms. Matching your availability
            to those windows — even approximately — can meaningfully improve win rates without
            adding more hours.
          </p>

          <h2>The System, Not the Hustle</h2>
          <p>
            The difference between a multi-income earner who burns out and one who scales isn&apos;t
            work ethic. It&apos;s having a simple system that shows:
          </p>
          <ul>
            <li>Which streams are pulling their weight</li>
            <li>Which ones are draining time quietly</li>
            <li>Where one extra hour generates the most return</li>
          </ul>
          <p>
            That system doesn&apos;t need to be complex. A monthly review of 3 numbers per stream —
            rate, hours, trend — is enough to make dramatically better decisions than most freelancers
            ever make.
          </p>
          <p>
            Measure. Prune. Concentrate. Repeat.
          </p>
        </article>

        <div className="mt-16 bg-blue-950/30 border border-blue-900/40 rounded-xl p-8 text-center">
          <h3 className="text-xl font-semibold text-white mb-2">See all your streams side by side</h3>
          <p className="text-gray-400 mb-6">
            GigAnalytics automatically calculates true hourly rate, time concentration, and growth
            trends for each of your income streams.
          </p>
          <Link
            href="/signup?utm_source=blog&utm_medium=cta&utm_campaign=five_streams_post"
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Connect your streams free
          </Link>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-800">
          <Link href="/blog" className="text-blue-400 hover:text-blue-300 text-sm">← Back to blog</Link>
        </div>
      </main>
    </div>
  )
}
