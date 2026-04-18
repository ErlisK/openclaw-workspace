import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Why Your Real Hourly Rate Is Probably 40% Lower Than You Think — GigAnalytics',
  description:
    'You charge $80/hr on Upwork. But when you factor in platform fees, unpaid admin time, and client acquisition costs, your true hourly rate might be closer to $47.',
  openGraph: {
    title: 'Why Your Real Hourly Rate Is Probably 40% Lower Than You Think',
    description: 'The math behind your true gig hourly rate — and how to fix it.',
    url: 'https://giganalytics.app/blog/true-hourly-rate',
    type: 'article',
  },
}

export default function TrueHourlyRatePost() {
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
            <time dateTime="2025-04-10">April 10, 2025</time>
            <span>·</span><span>6 min read</span>
            <span>·</span>
            {['ROI', 'Pricing', 'Freelance'].map(t => (
              <span key={t} className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-xs">{t}</span>
            ))}
          </div>
          <h1 className="text-3xl font-bold text-white mb-4 leading-tight">
            Why Your Real Hourly Rate Is Probably 40% Lower Than You Think
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            You charge $80/hr on Upwork. But when you factor in platform fees, unpaid admin time, and
            client acquisition costs, your true hourly rate might be closer to $47. Here&apos;s the math.
          </p>
        </div>

        <article className="prose prose-invert prose-gray max-w-none">
          <h2>The Illusion of the Billing Rate</h2>
          <p>
            Most freelancers set their rates based on what feels competitive or what past clients have
            accepted. What they rarely do is calculate the rate they actually <em>earn</em> after all
            costs are stripped away.
          </p>
          <p>
            Let&apos;s take a realistic example. Say you&apos;re a designer earning $80/hr on Upwork,
            billing 20 hours a week. On paper, that&apos;s $1,600/week or $83,200/year. Solid income.
          </p>
          <p>But here&apos;s what actually happens:</p>

          <h2>The Hidden Cost Stack</h2>
          <h3>1. Platform fees (−8–20%)</h3>
          <p>
            Upwork takes 20% on the first $500 with a client, 10% up to $10,000, then 5% beyond that.
            For a diverse client base, expect 12–15% on average. On $80/hr, that&apos;s $9.60–$12 gone
            immediately.
          </p>

          <h3>2. Unpaid admin time (−15–25%)</h3>
          <p>
            Proposals, invoicing, revisions, back-and-forth emails, onboarding calls. Industry surveys
            suggest freelancers spend 15–25% of their working hours on non-billable admin. If you work
            25 hours to bill 20, your effective hourly rate just dropped by 20%.
          </p>

          <h3>3. Client acquisition costs (−5–12%)</h3>
          <p>
            Even &quot;free&quot; acquisition costs time — time browsing job boards, writing proposals,
            or posting on LinkedIn. At $80/hr equivalent, every hour prospecting is a direct cost.
            Budget 5–12% depending on your pipeline.
          </p>

          <h3>4. Software and tools (−$200–800/year)</h3>
          <p>
            Adobe CC, Figma, Slack, project management tools, accounting software. Small individually,
            but they add up to $2–7/hr at typical billing volumes.
          </p>

          <h2>The Real Math</h2>
          <div className="bg-gray-900 rounded-lg p-6 my-6 font-mono text-sm">
            <div className="text-gray-400 mb-2">// True hourly rate calculation</div>
            <div>Billing rate:          $80.00/hr</div>
            <div>– Platform fee (13%):  −$10.40</div>
            <div>– Admin overhead (20%): −$13.44 (applied to net)</div>
            <div>– Acquisition (8%):    −$5.33</div>
            <div>– Tools/month ($50):   −$2.50</div>
            <div className="border-t border-gray-700 mt-3 pt-3 text-green-400 font-bold">
              True hourly rate:      $48.33/hr (−40%)
            </div>
          </div>

          <p>
            That $80/hr job pays you $48.33 in real take-home value. For someone in the US, after
            self-employment tax (~15.3%) and income tax, the real hourly rate approaches $35–38/hr.
          </p>

          <h2>Why This Matters for Multi-Income Earners</h2>
          <p>
            If you&apos;re running 2–5 income streams, this calculation gets more complex — and more
            important. Different platforms have different fee structures. Different income types have
            different time costs. You can&apos;t optimize what you don&apos;t measure.
          </p>
          <p>
            A common mistake: doubling down on a platform that <em>looks</em> lucrative because of a
            high nominal rate, while a lower-rate platform with less overhead actually pays more in
            true value.
          </p>

          <h2>What to Do About It</h2>
          <ol>
            <li>
              <strong>Track actual time, not just billed time.</strong> Include proposals, admin,
              revisions — everything client-related.
            </li>
            <li>
              <strong>Log all platform costs.</strong> Fees, chargebacks, disputes, payout delays.
            </li>
            <li>
              <strong>Calculate true hourly rate monthly</strong> per income stream, not yearly.
              Seasonality matters.
            </li>
            <li>
              <strong>Set a floor rate.</strong> Below X true hourly rate, the stream isn&apos;t worth
              your time. Know your number before you accept work.
            </li>
          </ol>

          <h2>The Takeaway</h2>
          <p>
            Your billing rate is a starting point, not a salary. The gap between what you charge and
            what you keep is where most freelancers leave money on the table — not because they charge
            too little, but because they don&apos;t measure the full cost picture.
          </p>
          <p>
            The good news: once you see the real numbers, it&apos;s surprisingly straightforward to
            optimize. Reduce admin friction, concentrate on clients with lower acquisition cost, and
            negotiate away from high-fee platforms as relationships mature.
          </p>
        </article>

        {/* CTA */}
        <div className="mt-16 bg-blue-950/30 border border-blue-900/40 rounded-xl p-8 text-center">
          <h3 className="text-xl font-semibold text-white mb-2">See your true hourly rate automatically</h3>
          <p className="text-gray-400 mb-6">
            GigAnalytics connects to your income platforms and calculates your real ROI —
            fees, time costs, and all.
          </p>
          <Link
            href="/signup?utm_source=blog&utm_medium=cta&utm_campaign=true_hourly_rate_post"
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Try it free — 5-minute setup
          </Link>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-800">
          <Link href="/blog" className="text-blue-400 hover:text-blue-300 text-sm">← Back to blog</Link>
        </div>
      </main>
    </div>
  )
}
