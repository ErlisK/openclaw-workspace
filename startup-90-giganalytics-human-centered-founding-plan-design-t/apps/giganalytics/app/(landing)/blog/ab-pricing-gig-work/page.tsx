import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'A/B Testing Your Gig Prices: A Practical Guide for Freelancers — GigAnalytics',
  description:
    'Platforms like Fiverr and Upwork are natural A/B testing environments. Learn how to run statistically sound pricing experiments without needing a statistics degree.',
  openGraph: {
    title: 'A/B Testing Your Gig Prices: A Practical Guide for Freelancers',
    description: 'Run statistically sound pricing experiments on gig platforms.',
    url: 'https://giganalytics.app/blog/ab-pricing-gig-work',
    type: 'article',
  },
}

export default function ABPricingPost() {
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
            <time dateTime="2025-04-03">April 3, 2025</time>
            <span>·</span><span>8 min read</span>
            <span>·</span>
            {['Pricing', 'A/B Testing', 'Analytics'].map(t => (
              <span key={t} className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-xs">{t}</span>
            ))}
          </div>
          <h1 className="text-3xl font-bold text-white mb-4 leading-tight">
            A/B Testing Your Gig Prices: A Practical Guide for Freelancers
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Platforms like Fiverr and Upwork are natural A/B testing environments. Learn how to run
            statistically sound pricing experiments without needing a statistics degree.
          </p>
        </div>

        <article className="prose prose-invert prose-gray max-w-none">
          <h2>Pricing Is a Hypothesis</h2>
          <p>
            Every freelancer sets prices based on assumptions: &quot;the market bears $X&quot;,
            &quot;I need at least $Y to make this worth it&quot;, &quot;charging more signals
            quality.&quot; These are hypotheses. A/B testing turns them into data.
          </p>
          <p>
            The good news: gig platforms are already designed for price experimentation. Fiverr lets
            you offer multiple packages. Upwork lets you submit different rates to different clients.
            Toptal and similar platforms segment by skill level. You have natural experimental
            surfaces — most freelancers just don&apos;t use them systematically.
          </p>

          <h2>What Makes a Valid Pricing Experiment</h2>
          <p>
            Before running any experiment, you need three things:
          </p>
          <ol>
            <li><strong>A clear control and variant.</strong> E.g., $80/hr vs $95/hr for the same service.</li>
            <li><strong>Enough data.</strong> At minimum 20–30 proposal responses per variant before drawing conclusions.</li>
            <li><strong>A single variable changed.</strong> Don&apos;t change your price and your proposal copy at the same time.</li>
          </ol>

          <h2>The 3-Phase Experiment Framework</h2>

          <h3>Phase 1: Baseline (2–4 weeks)</h3>
          <p>
            Run your current rate consistently. Document: proposals sent, responses received, jobs
            won, total revenue, time spent. This is your control.
          </p>

          <h3>Phase 2: Test Rate (2–4 weeks)</h3>
          <p>
            Increase your rate by 15–25%. Everything else stays identical: same proposal template,
            same response time, same platform. Track the same metrics.
          </p>

          <h3>Phase 3: Analysis</h3>
          <p>
            Compare the key ratio: <strong>revenue per proposal sent</strong>. Not just win rate —
            a lower win rate at a higher price can still be better.
          </p>

          <div className="bg-gray-900 rounded-lg p-6 my-6 font-mono text-sm">
            <div className="text-gray-400 mb-2">// Revenue per proposal comparison</div>
            <div className="mb-4">
              <div className="text-blue-400">// Control: $80/hr</div>
              <div>Proposals: 40 | Won: 8 (20%)</div>
              <div>Avg project: $640 | Revenue: $5,120</div>
              <div className="text-green-400">Rev/proposal: $128</div>
            </div>
            <div>
              <div className="text-purple-400">// Variant: $100/hr</div>
              <div>Proposals: 40 | Won: 5 (12.5%)</div>
              <div>Avg project: $800 | Revenue: $4,000</div>
              <div className="text-yellow-400">Rev/proposal: $100</div>
            </div>
            <div className="border-t border-gray-700 mt-3 pt-3 text-red-400">
              → $100/hr loses: lower rev/proposal despite higher rate
            </div>
          </div>

          <p>
            In this example, the higher rate actually performs worse — but you wouldn&apos;t know
            without measuring. Conversely, many freelancers are undercharging because a modest
            rate increase loses fewer clients than expected.
          </p>

          <h2>Statistical Significance (Without the Math)</h2>
          <p>
            You don&apos;t need a statistics degree, but you do need to avoid a common trap: declaring
            a winner too early.
          </p>
          <p>
            A rough rule for freelance pricing: wait until you have at least <strong>25 proposals
            submitted and evaluated in each condition</strong> before comparing. Random variance in
            client quality, season, and timing can make 10-proposal samples look dramatic but mean
            nothing.
          </p>
          <p>
            GigAnalytics shows a &quot;practical significance&quot; indicator — not just statistical
            significance — so you see whether a difference is big enough to act on, not just unlikely
            to be noise.
          </p>

          <h2>Platform-Specific Tips</h2>

          <h3>Upwork</h3>
          <p>
            Alternate between rates on different job applications. Keep a spreadsheet (or use
            GigAnalytics import) noting which applications used which rate. This is your A/B split.
          </p>

          <h3>Fiverr</h3>
          <p>
            Use the package tiers (Basic/Standard/Premium) as natural price experiments. A common
            insight: clients often self-select Premium when the Standard-to-Premium price jump is
            small relative to the perceived value increase.
          </p>

          <h3>Direct clients</h3>
          <p>
            Harder to A/B test, but not impossible. Segment by source (referral vs cold outreach vs
            inbound) and track rates vs win rates per segment over time.
          </p>

          <h2>The Most Important Metric: Revenue Per Hour of Effort</h2>
          <p>
            Win rate is a vanity metric without context. A 30% win rate at $120/hr with 2-hour
            projects is less valuable than a 15% win rate at $200/hr with 10-hour projects if your
            acquisition time per proposal is similar.
          </p>
          <p>
            Always reduce to: <strong>how much do I earn per hour of total effort (billed + admin)</strong>?
            That&apos;s the number to optimize.
          </p>

          <h2>Start Simple</h2>
          <p>
            You don&apos;t need a complex system. Start with one change: raise your Upwork rate by $15.
            Run it for a month. Compare revenue per proposal to last month. That&apos;s an experiment.
          </p>
          <p>
            Most freelancers who do this systematically find they&apos;ve been undercharging by 20–35%
            — not because clients won&apos;t pay more, but because they never tested.
          </p>
        </article>

        <div className="mt-16 bg-blue-950/30 border border-blue-900/40 rounded-xl p-8 text-center">
          <h3 className="text-xl font-semibold text-white mb-2">Run pricing experiments automatically</h3>
          <p className="text-gray-400 mb-6">
            GigAnalytics tracks your A/B pricing experiments with statistical significance indicators —
            no spreadsheets required.
          </p>
          <Link
            href="/signup?utm_source=blog&utm_medium=cta&utm_campaign=ab_pricing_post"
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Start experimenting free
          </Link>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-800">
          <Link href="/blog" className="text-blue-400 hover:text-blue-300 text-sm">← Back to blog</Link>
        </div>
      </main>
    </div>
  )
}
