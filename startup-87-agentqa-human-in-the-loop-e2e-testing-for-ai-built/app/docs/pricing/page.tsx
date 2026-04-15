import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Pricing & Tiers — AgentQA Docs',
  description: 'Compare AgentQA testing tiers: Quick ($5 / 10 min), Standard ($10 / 20 min), Deep ($15 / 30 min). Understand credits, holds, and refund policy.',
}

const TIERS = [
  {
    id: 'quick',
    name: 'Quick',
    price: 5,
    credits: 5,
    duration: '10 minutes',
    sla: '4 hours',
    deliverables: [
      'Single user flow (signup, core feature, or checkout)',
      'Network request log',
      'Console error capture',
      'Screenshot at each major step',
      '1-paragraph summary + pass/fail verdict',
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 10,
    credits: 10,
    duration: '20 minutes',
    sla: '4 hours',
    popular: true,
    deliverables: [
      'Up to 3 user flows',
      'Full network + console log capture',
      'Annotated screenshots with overlays',
      'Structured bug reports (steps to reproduce, severity)',
      'Overall UX quality score (1–5)',
    ],
  },
  {
    id: 'deep',
    name: 'Deep',
    price: 15,
    credits: 15,
    duration: '30 minutes',
    sla: '1 hour',
    deliverables: [
      'Unlimited flows in 30 minutes',
      'Full session replay log',
      'Accessibility spot-check',
      'Mobile responsiveness notes',
      'Detailed markdown report with screenshots',
    ],
  },
]

export default function PricingDocsPage() {
  return (
    <article data-testid="docs-pricing">
      <h1>Pricing &amp; Tiers</h1>
      <p className="lead text-xl text-gray-600 mb-8">
        AgentQA charges per test. No subscription, no seat fees. Buy credits and spend them on tests.
        Credits never expire.
      </p>

      <h2>Test tiers</h2>
      <div className="not-prose overflow-x-auto mb-8">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 border border-gray-200 font-semibold">Tier</th>
              <th className="px-4 py-3 border border-gray-200 font-semibold">Price</th>
              <th className="px-4 py-3 border border-gray-200 font-semibold">Duration</th>
              <th className="px-4 py-3 border border-gray-200 font-semibold">SLA</th>
              <th className="px-4 py-3 border border-gray-200 font-semibold">Deliverables</th>
            </tr>
          </thead>
          <tbody>
            {TIERS.map(t => (
              <tr key={t.id} className={t.popular ? 'bg-indigo-50' : ''}>
                <td className="px-4 py-3 border border-gray-200 font-medium">
                  {t.name} {t.popular && <span className="ml-1 text-xs text-indigo-600 font-bold">★ popular</span>}
                </td>
                <td className="px-4 py-3 border border-gray-200">${t.price} ({t.credits} credits)</td>
                <td className="px-4 py-3 border border-gray-200">{t.duration}</td>
                <td className="px-4 py-3 border border-gray-200">{t.sla}</td>
                <td className="px-4 py-3 border border-gray-200">
                  <ul className="list-disc list-inside space-y-0.5">
                    {t.deliverables.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>How credits work</h2>
      <p>
        1 credit = $1 USD (volume discounts available). Credits are purchased from the{' '}
        <Link href="/billing">Billing page</Link> via Stripe Checkout (cards, Apple Pay, Google Pay).
        Credits are non-refundable but never expire.
      </p>

      <h3>Credit lifecycle for a test job</h3>
      <ol>
        <li>
          <strong>Publish job</strong> — the tier cost (5, 10, or 15 credits) is placed on hold.
          Your available balance is reduced but credits are not yet spent.
        </li>
        <li>
          <strong>Tester claims &amp; completes</strong> — credits move from held → spent.
          The hold is released and the spend is recorded.
        </li>
        <li>
          <strong>24-hour no-claim timeout</strong> — if no tester picks up your job within 24 hours,
          the job is automatically cancelled and credits are fully refunded (hold released).
        </li>
        <li>
          <strong>Rejected submission</strong> — if you reject a feedback submission,
          the job re-enters the queue. Credits remain on hold until a new tester submits
          accepted feedback, or until the job is manually cancelled.
        </li>
      </ol>

      <h2>Credit packs</h2>
      <div className="not-prose overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 border border-gray-200 font-semibold">Pack</th>
              <th className="px-4 py-3 border border-gray-200 font-semibold">Credits</th>
              <th className="px-4 py-3 border border-gray-200 font-semibold">Price</th>
              <th className="px-4 py-3 border border-gray-200 font-semibold">$/credit</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'Starter', credits: 10, price: 10, unit: '$1.00' },
              { name: 'Growth', credits: 40, price: 36, unit: '$0.90' },
              { name: 'Scale', credits: 100, price: 80, unit: '$0.80' },
            ].map(p => (
              <tr key={p.name}>
                <td className="px-4 py-3 border border-gray-200 font-medium">{p.name}</td>
                <td className="px-4 py-3 border border-gray-200">{p.credits}</td>
                <td className="px-4 py-3 border border-gray-200">${p.price}</td>
                <td className="px-4 py-3 border border-gray-200 text-gray-500">{p.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Tester payouts</h2>
      <p>
        Testers are paid per accepted submission. Payout rates are:
        Quick $3.50, Standard $7.00, Deep $11.00.
        Payouts are processed weekly via Stripe Connect.
      </p>

      <div className="not-prose mt-10 p-6 bg-indigo-50 border border-indigo-200 rounded-xl">
        <p className="text-indigo-700 text-sm">
          See the full pricing page for a side-by-side comparison →{' '}
          <Link href="/pricing" className="font-semibold underline">agentqa.vercel.app/pricing</Link>
        </p>
      </div>
    </article>
  )
}
