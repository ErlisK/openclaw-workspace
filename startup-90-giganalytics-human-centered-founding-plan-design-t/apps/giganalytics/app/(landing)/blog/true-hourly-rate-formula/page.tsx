import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How to Calculate Your True Hourly Rate as a Freelancer (The Real Formula) — GigAnalytics',
  description: "Most freelancers calculate hourly rate wrong. Here's the real formula that accounts for fees, unpaid admin, and acquisition time — with examples.",
  openGraph: {
    title: 'How to Calculate Your True Hourly Rate as a Freelancer (The Real Formula)',
    description: "The real formula for true hourly rate — with Upwork vs. direct client examples.",
    url: 'https://hourlyroi.com/blog/true-hourly-rate-formula',
    type: 'article',
  },
}

export default function TrueHourlyRateFormulaPost() {
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
            <time dateTime="2025-04-23">April 23, 2025</time>
            <span>·</span><span>8 min read</span>
            <span>·</span>
            {['ROI', 'Pricing', 'Freelance', 'Calculator'].map(t => (
              <span key={t} className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-xs">{t}</span>
            ))}
          </div>
          <h1 className="text-3xl font-bold text-white mb-4 leading-tight">
            How to Calculate Your True Hourly Rate as a Freelancer (The Real Formula)
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            If you bill $75 per hour, that&apos;s not your hourly rate. It&apos;s your invoice rate. Your true
            hourly rate — what you actually earn per hour of life you spend on a client — is almost always lower.
            Sometimes dramatically so.
          </p>
        </div>

        <article className="prose prose-invert prose-gray max-w-none">
          <h2>The Standard Formula (And Why It&apos;s Wrong)</h2>
          <p>Most freelancers calculate hourly rate like this:</p>
          <div className="bg-gray-900 rounded-lg p-4 my-4 font-mono text-sm text-green-400">
            Hourly Rate = Revenue ÷ Billable Hours
          </div>
          <p>The problem: this only counts hours you were paid for. It ignores:</p>
          <ul>
            <li>Time spent writing proposals and pitches (unpaid)</li>
            <li>Platform fees taken off the top (reducing net income)</li>
            <li>Admin hours: invoicing, contract review, onboarding emails (unpaid)</li>
            <li>Revisions and scope-creep hours (often unbilled)</li>
            <li>Marketing and acquisition time for that client</li>
          </ul>
          <p>When you leave these out, you systematically overestimate what you&apos;re earning.</p>

          <h2>The True Hourly Rate Formula</h2>
          <div className="bg-gray-900 rounded-lg p-4 my-4 font-mono text-sm text-green-400">
            True Hourly Rate = (Revenue − Fees − Ad Spend) ÷ (Billable Hours + Admin Hours + Acquisition Hours)
          </div>
          <p>Let&apos;s break each component down.</p>

          <h3>Revenue</h3>
          <p>Gross payments received from this stream. Use the deposit amount, not invoice amount — unpaid invoices aren&apos;t income.</p>

          <h3>Fees</h3>
          <p>Platform fees (Upwork&apos;s 10–20%, Fiverr&apos;s 20%, Stripe&apos;s 2.9% + $0.30), payment processor fees, marketplace commissions. These reduce your net income directly.</p>

          <h3>Ad Spend</h3>
          <p>If you spend money on ads, LinkedIn Premium, or job board listings to acquire this work, subtract it.</p>

          <h3>Billable Hours</h3>
          <p>Hours you tracked and billed for. This is the number most people already count.</p>

          <h3>Admin Hours</h3>
          <p>Every hour that was spent in service of this stream but wasn&apos;t billed:</p>
          <ul>
            <li>Proposal writing (be honest — count every pitch)</li>
            <li>Onboarding emails and kickoff calls</li>
            <li>Revision rounds beyond scope</li>
            <li>Invoice creation and follow-up</li>
            <li>Status updates and check-in calls</li>
          </ul>

          <h3>Acquisition Hours</h3>
          <p>The hours you spent finding this work: outreach, portfolio updates, platform profile maintenance, applying to jobs.</p>

          <h2>Example: Upwork vs. Direct Clients</h2>
          <div className="bg-gray-900 rounded-lg p-6 my-6 font-mono text-sm">
            <div className="text-gray-400 mb-3 font-semibold">Upwork Stream (Month 1):</div>
            <div>Revenue:                   $3,200</div>
            <div>Fees (15%):               −$480</div>
            <div>Net:                        $2,720</div>
            <div>Billable hours:             40 hrs</div>
            <div>Proposal writing:           +6 hrs</div>
            <div>Admin/revisions:            +4 hrs</div>
            <div className="border-t border-gray-700 mt-3 pt-3 text-green-400 font-bold">
              True Hourly Rate: $2,720 ÷ 50 hrs = $54.40/hr
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-6 my-6 font-mono text-sm">
            <div className="text-gray-400 mb-3 font-semibold">Direct Client Stream (Month 1):</div>
            <div>Revenue:                   $3,400</div>
            <div>Fees (Stripe 2.9%):       −$99</div>
            <div>Net:                        $3,301</div>
            <div>Billable hours:             45 hrs</div>
            <div>Outreach + admin:           +3 hrs</div>
            <div className="border-t border-gray-700 mt-3 pt-3 text-green-400 font-bold">
              True Hourly Rate: $3,301 ÷ 48 hrs = $68.77/hr
            </div>
          </div>
          <p>
            Direct clients win by $14/hr — despite similar gross revenue. Over a year, that difference compounds significantly.
          </p>

          <h2>How to Track This Without Going Crazy</h2>
          <p>The main barrier to running this calculation is data collection. Here&apos;s a minimal viable tracking system:</p>
          <ol>
            <li><strong>Time:</strong> Use any timer app. Log billable AND non-billable hours, tagged by stream.</li>
            <li><strong>Fees:</strong> Export monthly CSV from Stripe, PayPal, or your platform and subtract fees.</li>
            <li><strong>Spreadsheet:</strong> One row per month per stream. Apply the formula above.</li>
          </ol>
          <p>
            Or use a tool like{' '}
            <Link href="https://hourlyroi.com" className="text-blue-400 hover:text-blue-300">GigAnalytics</Link>
            {' '}to automate the import, time logging, and calculation — it&apos;s designed specifically for this calculation across multiple streams.
          </p>

          <h2>What to Do With the Number</h2>
          <p>Once you have true hourly rates per stream:</p>
          <ul>
            <li><strong>Cut or deprioritize</strong> streams below your target rate</li>
            <li><strong>Negotiate fees or raise prices</strong> on streams that are close to target</li>
            <li><strong>Double down</strong> on streams with the highest true rate AND highest scaling potential</li>
            <li><strong>Run pricing experiments</strong> to test whether higher rates reduce volume enough to hurt net hourly rate</li>
          </ul>

          <h2>The Bottom Line</h2>
          <p>
            Your invoice rate is a ceiling, not a floor. Your true hourly rate — accounting for every hour and every fee — is what you&apos;re actually exchanging your time for.
          </p>
          <p>Calculate it once and you&apos;ll never look at income streams the same way again.</p>

          <div className="mt-10 p-6 bg-gray-900 rounded-lg border border-gray-700">
            <p className="text-gray-300 font-medium mb-2">Want this calculation automated?</p>
            <p className="text-gray-400 text-sm mb-4">
              GigAnalytics imports your Stripe, PayPal, or CSV data and calculates true hourly rate per stream automatically.
            </p>
            <Link
              href="https://hourlyroi.com/demo"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Try the free demo →
            </Link>
          </div>
        </article>
      </main>
    </div>
  )
}
