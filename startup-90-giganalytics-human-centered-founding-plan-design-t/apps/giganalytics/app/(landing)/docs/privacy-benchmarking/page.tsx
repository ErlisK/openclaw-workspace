import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy & Benchmarking Explainer — GigAnalytics Docs',
  description: 'How GigAnalytics protects your income data while enabling opt-in anonymous benchmarks. Covers k-anonymity, differential privacy, data flows, and user controls.',
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-14 scroll-mt-20">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-3 border-b border-gray-200">{title}</h2>
      {children}
    </section>
  )
}

export default function PrivacyBenchmarkingPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="mb-4">
          <Link href="/docs" className="text-sm text-blue-600 hover:underline">← Documentation</Link>
        </div>
        <div className="mb-12">
          <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">PRIVACY & DATA</span>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy & Benchmarking Explainer</h1>
          <p className="text-xl text-gray-600 mb-6">
            How GigAnalytics protects your income data, what the optional benchmark feature collects, and the technical safeguards (k-anonymity, differential privacy) that make it safe to participate.
          </p>
          <div className="flex gap-4 text-sm text-gray-500 border-t border-gray-100 pt-4">
            <span>Version 1.1 · June 2025</span>
            <span>8 min read</span>
          </div>
        </div>

        {/* TOC */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-12">
          <h2 className="font-bold text-gray-900 mb-4">Contents</h2>
          <ol className="grid md:grid-cols-2 gap-2 text-sm">
            {[
              ['1', 'Privacy-first architecture', '#architecture'],
              ['2', 'What data GigAnalytics stores', '#data-stored'],
              ['3', 'Benchmark feature: full data flow', '#benchmark-flow'],
              ['4', 'K-anonymity: the math', '#k-anonymity'],
              ['5', 'Differential privacy: the math', '#differential-privacy'],
              ['6', 'Benchmark contribution pipeline', '#pipeline'],
              ['7', 'What you see vs. what you share', '#see-vs-share'],
              ['8', 'Data deletion and opt-out', '#deletion'],
              ['9', 'Third-party data processors', '#processors'],
              ['10', 'Security measures', '#security'],
            ].map(([num, title, href]) => (
              <li key={num} className="flex gap-2">
                <span className="text-gray-400 w-4 text-right flex-shrink-0">{num}.</span>
                <a href={href} className="text-blue-600 hover:underline">{title}</a>
              </li>
            ))}
          </ol>
        </div>

        {/* 1. Architecture */}
        <Section id="architecture" title="1. Privacy-First Architecture">
          <p className="text-gray-600 mb-4">
            GigAnalytics is built on a <strong>data minimization</strong> principle: we collect only what's necessary to compute your ROI dashboard, and we store it in a user-partitioned database where your data is isolated by Row Level Security (RLS) from every other user's data.
          </p>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {[
              { icon: '🔒', title: 'Encrypted at rest', desc: 'All data stored in Supabase (Postgres) with AES-256 encryption. TLS 1.3 in transit.' },
              { icon: '🧱', title: 'Row Level Security', desc: 'Postgres RLS ensures every query is automatically scoped to your user_id. No query can return another user\'s data.' },
              { icon: '🚫', title: 'No data selling', desc: 'We never sell, rent, or license your income data to third parties. The benchmark feature is opt-in and anonymized.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="border border-gray-200 rounded-xl p-4 text-center">
                <div className="text-3xl mb-2">{icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1 text-sm">{title}</h3>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <h3 className="font-semibold text-blue-900 mb-2">Free users: zero benchmark participation</h3>
            <p className="text-sm text-blue-800">
              Free tier users never contribute to or appear in any benchmark dataset. Benchmark contribution is an <strong>opt-in Pro feature only</strong>. Free users can still view benchmark statistics generated from Pro user contributions.
            </p>
          </div>
        </Section>

        {/* 2. Data Stored */}
        <Section id="data-stored" title="2. What Data GigAnalytics Stores">
          <p className="text-gray-600 mb-4">Here is a complete inventory of data stored in your GigAnalytics account:</p>
          <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
            <div className="grid grid-cols-4 bg-gray-50 text-xs font-semibold text-gray-500 uppercase px-4 py-2">
              <span>Data type</span><span>What we store</span><span>What we don't store</span><span>Why</span>
            </div>
            {[
              ['Transactions', 'date, net_amount, fee_amount, stream_id', 'Payer name, description, card details', 'ROI calculation needs amounts + dates only'],
              ['Time entries', 'start/stop time, duration, stream_id', 'Location, device, IP at logging time', 'Heatmap needs time + stream only'],
              ['Income streams', 'name, color, platform tag', 'Platform account IDs or credentials', 'Display + grouping only'],
              ['Acquisition costs', 'amount, date, stream_id, channel', 'Ad account IDs, campaign details', 'ROI formula needs cost amount only'],
              ['Auth', 'email (hashed for internal ID), password hash', 'Plain-text password, security questions', 'Standard auth best practices'],
              ['Usage analytics', 'feature events (anonymized)', 'PII, screen recordings, keystrokes', 'Product improvement only'],
            ].map(([type, stored, notStored, why]) => (
              <div key={type} className="grid grid-cols-4 px-4 py-3 text-xs border-t border-gray-100">
                <span className="font-medium text-gray-700">{type}</span>
                <span className="text-green-700">{stored}</span>
                <span className="text-red-600">{notStored}</span>
                <span className="text-gray-500">{why}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* 3. Benchmark Flow */}
        <Section id="benchmark-flow" title="3. Benchmark Feature: Full Data Flow">
          <p className="text-gray-600 mb-6">
            The benchmark feature allows Pro users to opt in to contributing anonymized aggregate metrics that power the "how do I compare?" insights in the dashboard. Here is the complete data flow, step by step:
          </p>
          <ol className="space-y-6">
            {[
              {
                step: '1',
                title: 'You enable "Contribute to benchmarks" in Settings → Privacy',
                detail: 'This toggle is OFF by default. Enabling it starts the contribution pipeline for your account. You can disable it at any time.',
                color: 'bg-blue-100 text-blue-700',
              },
              {
                step: '2',
                title: 'Our backend computes aggregate metrics from your raw data',
                detail: 'The pipeline runs nightly. It reads your transactions and time entries and computes: hourly rate percentile bucket, revenue range bucket, experience range bucket, platform category, and region (country-level). It does NOT read transaction descriptions, client names, or exact amounts.',
                color: 'bg-blue-100 text-blue-700',
              },
              {
                step: '3',
                title: 'Buckets are assigned (not raw values)',
                detail: 'Raw hourly rate of $87/hr is bucketed to "$80–$100/hr". Revenue of $4,200/mo is bucketed to "$4,000–$5,000/mo". This prevents precise individual inference.',
                color: 'bg-blue-100 text-blue-700',
              },
              {
                step: '4',
                title: 'K-anonymity check',
                detail: 'Before your bucket is included in any aggregate, the pipeline checks: does this (platform, rate_bucket, region) combination have ≥ 25 other contributors? If not, your data is suppressed for that segment until the pool grows.',
                color: 'bg-purple-100 text-purple-700',
              },
              {
                step: '5',
                title: 'Differential privacy noise is added',
                detail: 'Even for qualifying buckets, we apply Laplace noise (ε = 0.5) to the aggregate counts before storing them. This means the published percentile is statistically indistinguishable from what it would be if any single user were removed from the pool.',
                color: 'bg-purple-100 text-purple-700',
              },
              {
                step: '6',
                title: 'Contribution is decoupled from user ID',
                detail: 'The final aggregated values in the benchmark store are not linked to your user_id. The pipeline uses a one-way hash of (user_id + contribution_date) as a deduplication key that cannot be reversed.',
                color: 'bg-green-100 text-green-700',
              },
              {
                step: '7',
                title: 'Benchmark values are served to Pro users',
                detail: 'The published p25/median/p75 rates are served to all Pro users querying their platform + region segment. Your personal data never appears — only the anonymized aggregate.',
                color: 'bg-green-100 text-green-700',
              },
            ].map(({ step, title, detail, color }) => (
              <li key={step} className="flex gap-4">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${color}`}>{step}</div>
                <div>
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                  <p className="text-gray-600 text-sm mt-1">{detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        {/* 4. K-Anonymity */}
        <Section id="k-anonymity" title="4. K-Anonymity: The Math">
          <p className="text-gray-600 mb-4">
            K-anonymity is a formal privacy guarantee. A dataset satisfies <em>k-anonymity</em> if, for every record, at least k−1 other records share the same quasi-identifying attributes.
          </p>
          <p className="text-gray-600 mb-6">
            In GigAnalytics's benchmark dataset, the quasi-identifying attributes are:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 mb-6">
            <li><strong>platform_category</strong> — bucketed (design, development, writing, consulting, other)</li>
            <li><strong>hourly_rate_bucket</strong> — $10 increments up to $200, then $50 increments</li>
            <li><strong>region</strong> — country-level (US, UK, CA, AU, DE, other)</li>
            <li><strong>experience_range</strong> — &lt;1yr, 1–3yr, 3–7yr, 7yr+</li>
          </ul>
          <div className="bg-gray-900 text-green-400 font-mono text-sm px-5 py-4 rounded-xl mb-4 overflow-x-auto">
{`k-anonymity guarantee: k = 25

For a record r with attributes (platform, rate_bucket, region, experience):
  count = |{u : user_platform[u] = platform
               AND user_rate_bucket[u] = rate_bucket
               AND user_region[u] = region
               AND user_experience[u] = experience}|

  if count < 25:
    suppress(r)  # do not include in published benchmark
  else:
    include(r)   # safe to publish aggregate for this segment`}
          </div>
          <p className="text-gray-600 mb-4">
            <strong>What this means in practice:</strong> If you're the only freelance copywriter in New Zealand earning $90–$100/hr with 3–7 years of experience, your data won't appear in the benchmark for that segment. You'll see "insufficient data" for that specific combination.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
            <strong>Why k=25 and not k=5?</strong> The GDPR Article 29 Working Party recommends k≥5 for publication. We use k=25 to provide a significantly stronger guarantee, particularly important given the sensitive nature of income data. The tradeoff is reduced benchmark coverage for niche specializations.
          </div>
        </Section>

        {/* 5. Differential Privacy */}
        <Section id="differential-privacy" title="5. Differential Privacy: The Math">
          <p className="text-gray-600 mb-4">
            K-anonymity alone is vulnerable to attacks where an adversary knows about a specific individual. Differential privacy (DP) provides a stronger guarantee: the probability of any inference about an individual changes by at most e^ε whether or not that individual's data is in the dataset.
          </p>
          <p className="text-gray-600 mb-4">
            GigAnalytics applies the <strong>Laplace mechanism</strong> to aggregate counts and statistics before publication:
          </p>
          <div className="bg-gray-900 text-green-400 font-mono text-sm px-5 py-4 rounded-xl mb-4 overflow-x-auto">
{`ε-differential privacy via Laplace mechanism:

For a function f (e.g., median hourly rate of a segment):

  published_f = true_f + Laplace(0, Δf/ε)

Where:
  Δf = sensitivity of f (maximum change in f when one person
       is added or removed from the dataset)
  ε  = privacy budget (0.5 in GigAnalytics)
  Laplace(μ, b) = noise drawn from Laplace distribution

For median of hourly rates:
  Δf ≈ max_rate_bucket_width / 2 = ~$5
  ε  = 0.5
  Scale of noise = $5 / 0.5 = $10

So published median may differ from true median by ±~$10.`}
          </div>
          <p className="text-gray-600 mb-4">
            <strong>Why ε = 0.5?</strong> Lower ε = stronger privacy guarantee but noisier statistics. We chose ε = 0.5 as a balance: it satisfies "strong" DP by most academic standards (ε ≤ 1) while keeping the benchmark accuracy high enough to be useful (±$10 noise on a $60–$150 range is acceptable).
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 mb-4">
            <strong>Sequential composition:</strong> Each time we query the benchmark store with a new ε, the cumulative privacy cost increases. We limit the number of aggregate queries per user per day to 50 to bound the total privacy loss.
          </div>
          <p className="text-gray-600">
            The combination of k=25 anonymity and ε=0.5 differential privacy provides defense-in-depth: k-anonymity protects against record linkage attacks; differential privacy protects against membership inference attacks.
          </p>
        </Section>

        {/* 6. Pipeline */}
        <Section id="pipeline" title="6. Benchmark Contribution Pipeline Architecture">
          <div className="space-y-4">
            {[
              { component: 'Contribution scheduler', detail: 'Runs nightly at 02:00 UTC. Processes all opted-in Pro users added or modified since last run.' },
              { component: 'Aggregation worker', detail: 'Supabase Edge Function that reads user metrics, applies bucketing, and computes per-segment aggregate stats.' },
              { component: 'K-anonymity filter', detail: 'Postgres function that counts contributors per segment and nulls out segments below k=25.' },
              { component: 'DP noise injector', detail: 'Python Lambda function using NumPy\'s Laplace distribution to add calibrated noise to qualifying aggregates.' },
              { component: 'Benchmark store', detail: 'Separate Postgres schema with no user_id columns. Tables: benchmark_segments, benchmark_percentiles, benchmark_metadata.' },
              { component: 'Delayed publish', detail: 'New contributions are held in staging for 72 hours before going live. This prevents near-real-time membership inference.' },
              { component: 'Audit log', detail: 'Append-only log of pipeline runs (no user data). Rotated after 90 days. Used for debugging and compliance review.' },
            ].map(({ component, detail }) => (
              <div key={component} className="flex gap-4 border border-gray-200 rounded-xl p-4">
                <div className="flex-shrink-0 w-2 bg-blue-400 rounded-full"></div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{component}</h3>
                  <p className="text-gray-600 text-sm">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* 7. See vs Share */}
        <Section id="see-vs-share" title="7. What You See vs. What You Share">
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase px-4 py-2">
              <span>Feature</span><span>Free users (see?)</span><span>Pro contributors (see + share?)</span>
            </div>
            {[
              ['Your own ROI dashboard', '✅ Full access', '✅ Full access'],
              ['Benchmark percentiles for your segment', '✅ Read-only', '✅ Read-only + contributes to pool'],
              ['Comparison widget (vs. peers)', '❌ Pro only', '✅ Full access'],
              ['Rate recommendation based on benchmarks', '❌ Pro only', '✅ Full access'],
              ['Your data in benchmark pool', '❌ Never', '⚙️ Only if opted in'],
              ['AI insights using benchmark context', '❌ Pro only', '✅ Full access'],
            ].map(([feature, free, pro]) => (
              <div key={feature} className="grid grid-cols-3 px-4 py-3 text-sm border-t border-gray-100">
                <span className="text-gray-700">{feature}</span>
                <span className="text-gray-600">{free}</span>
                <span className="font-medium text-blue-700">{pro}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* 8. Deletion */}
        <Section id="deletion" title="8. Data Deletion and Opt-Out">
          <div className="space-y-4">
            {[
              {
                action: 'Disable benchmark contribution',
                how: 'Settings → Privacy → Benchmark contribution → toggle off',
                effect: 'Your data stops contributing within 24 hours. Future aggregations exclude you. Previously published aggregates remain (they\'re group statistics, not individual records).',
              },
              {
                action: 'Delete your GigAnalytics account',
                how: 'Settings → Account → Delete Account',
                effect: 'All your raw data (transactions, time entries, streams) is permanently deleted from Supabase within 7 days. Your benchmark contributions are removed from future pipeline runs. The benchmark store retains no user-identifying records, so there\'s nothing to delete there.',
              },
              {
                action: 'GDPR / CCPA data export',
                how: 'Settings → Privacy → Export my data',
                effect: 'Downloads a JSON file of all your raw data: transactions, time entries, streams, and account metadata. We don\'t export benchmark data because it\'s not linked to you in the benchmark store.',
              },
              {
                action: 'GDPR right to be forgotten',
                how: 'Email hello@hourlyroi.com',
                effect: 'We\'ll confirm deletion of your account and raw data within 30 days per GDPR Article 17.',
              },
            ].map(({ action, how, effect }) => (
              <div key={action} className="border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-2">{action}</h3>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase">How</span>
                    <p className="text-gray-700 mt-1">{how}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase">Effect</span>
                    <p className="text-gray-600 mt-1">{effect}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* 9. Third Parties */}
        <Section id="processors" title="9. Third-Party Data Processors">
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-4 bg-gray-50 text-xs font-semibold text-gray-500 uppercase px-4 py-2">
              <span>Processor</span><span>Purpose</span><span>Data shared</span><span>DPA/SCCs</span>
            </div>
            {[
              ['Supabase (Postgres)', 'Database', 'All user data (encrypted)', '✅ DPA signed, SOC 2'],
              ['Vercel', 'Hosting / Edge Functions', 'Request metadata (no body)', '✅ DPA, SOC 2 Type II'],
              ['Stripe', 'Payment processing', 'Email, payment info', '✅ PCI DSS Level 1'],
              ['PostHog (self-hosted)', 'Product analytics', 'Anonymized feature events', '✅ Self-hosted, no PII'],
              ['Plausible Analytics', 'Web analytics', 'Page views (no cookies)', '✅ GDPR-compliant, EU-hosted'],
              ['AWS SES (via Supabase)', 'Transactional email', 'Email address only', '✅ DPA, SOC 2'],
            ].map(([proc, purpose, data, dpa]) => (
              <div key={proc} className="grid grid-cols-4 px-4 py-3 text-xs border-t border-gray-100">
                <span className="font-medium text-gray-700">{proc}</span>
                <span className="text-gray-600">{purpose}</span>
                <span className="text-gray-600">{data}</span>
                <span className="text-green-700">{dpa}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* 10. Security */}
        <Section id="security" title="10. Security Measures">
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: '🔐', title: 'Auth', desc: 'Supabase Auth with bcrypt password hashing, JWT tokens with 1hr expiry, optional MFA.' },
              { icon: '🛡️', title: 'Row Level Security', desc: 'Every table enforces user_id = auth.uid() via Postgres RLS. No shared table scans.' },
              { icon: '🔗', title: 'TLS everywhere', desc: 'TLS 1.3 for all API calls. HSTS header with 2-year max-age. No plain-HTTP fallback.' },
              { icon: '📋', title: 'Dependency audit', desc: 'npm audit runs on every PR. Critical vulnerabilities block deployment.' },
              { icon: '🔍', title: 'Input validation', desc: 'All API inputs validated with Zod schemas. SQL injection mitigated by Supabase parameterized queries.' },
              { icon: '🚨', title: 'Breach notification', desc: 'If a breach is detected, affected users are notified within 72 hours per GDPR Article 33.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="border border-gray-200 rounded-xl p-4 flex gap-3">
                <span className="text-2xl flex-shrink-0">{icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{title}</h3>
                  <p className="text-xs text-gray-600">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700">
            <strong>Responsible disclosure:</strong> Found a security issue? Email <a href="mailto:hello@hourlyroi.com" className="text-blue-600 hover:underline">hello@hourlyroi.com</a>. We follow a 90-day disclosure timeline and offer recognition for valid reports.
          </div>
        </Section>

        <div className="border-t border-gray-200 pt-8 flex flex-wrap gap-4 text-sm">
          <Link href="/docs" className="text-blue-600 hover:underline">← All Docs</Link>
          <Link href="/docs/roi-whitepaper" className="text-blue-600 hover:underline">ROI Whitepaper →</Link>
          <Link href="/docs/integration-roadmap" className="text-blue-600 hover:underline">Integration Roadmap →</Link>
        </div>
      </div>
    </main>
  )
}
