import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Payments & Affiliates — TeachRepo Docs',
  description: 'How Stripe payments, pricing models, and the affiliate/referral system work on TeachRepo.',
  alternates: { canonical: 'https://teachrepo.com/docs/payments-affiliates' },
};

export default function PaymentsAffiliatesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/docs" className="text-sm text-violet-600 hover:text-violet-800">← Docs</Link>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Payments & Affiliates</h1>
      <p className="text-gray-600 mb-8 text-lg">
        TeachRepo handles Stripe checkout, paywall enforcement, and a simple affiliate link system — all without you writing a line of payment code.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Pricing models</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Free', desc: 'Set price_cents: 0 in course.yml. Anyone can enroll.', icon: '🆓' },
            { label: 'One-time', desc: 'Set a price in cents (e.g. 4900 = $49). Stripe checkout handles the rest.', icon: '💳' },
            { label: 'Coming soon', desc: 'Subscriptions and bundles are on the roadmap.', icon: '🔜' },
          ].map((m) => (
            <div key={m.label} className="border border-gray-200 rounded-xl p-4">
              <div className="text-2xl mb-2">{m.icon}</div>
              <div className="font-semibold text-gray-900 text-sm mb-1">{m.label}</div>
              <p className="text-xs text-gray-600">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">How checkout works</h2>
        <ol className="space-y-3">
          {[
            'Learner clicks "Enroll" on a paid course page',
            'TeachRepo creates a Stripe Checkout Session via POST /api/checkout',
            'Learner completes payment on Stripe\'s hosted page',
            'Stripe fires a webhook to POST /api/webhooks/stripe',
            'Webhook verifies signature, creates an enrollment row in Supabase',
            'Learner is redirected back and can access all paid lessons',
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{i + 1}</span>
              <span className="text-sm text-gray-700">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Platform fees</h2>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-gray-900">0%</span>
            <span className="text-gray-600 text-sm">platform fee on self-hosted / OSS tier</span>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-bold text-gray-900">5%</span>
            <span className="text-gray-600 text-sm">platform fee on hosted SaaS + marketplace listing</span>
          </div>
          <p className="text-xs text-gray-500">
            Stripe&#39;s standard processing fee (2.9% + 30¢) applies to all transactions. TeachRepo&#39;s platform fee is taken from the payout, not charged separately.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Affiliate links</h2>
        <p className="text-gray-600 text-sm mb-4">
          Give affiliates a unique referral link. When a learner purchases through that link, the affiliate earns a configurable commission.
        </p>
        <pre className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-mono overflow-x-auto text-gray-800">
{`https://teachrepo.com/courses/git-for-engineers?ref=AFFILIATE_CODE`}
        </pre>
        <div className="mt-4 space-y-3 text-sm text-gray-700">
          <p>
            <strong>How it works:</strong> The <code className="bg-gray-100 px-1 rounded">?ref=</code> parameter is captured at checkout
            and stored in the <code className="bg-gray-100 px-1 rounded">referrals</code> table. Affiliates can see their clicks
            and conversions in the dashboard.
          </p>
          <p>
            <strong>Commission:</strong> Set per-affiliate in the Affiliates tab of your dashboard. Default: 30% of the sale price.
          </p>
          <p>
            <strong>Payouts:</strong> Currently manual (export a CSV from the dashboard). Automated payouts via Stripe Connect are on the roadmap.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Test purchases</h2>
        <p className="text-gray-600 text-sm mb-3">
          Set the environment variable <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">ENABLE_PURCHASE_SIMULATION=true</code> to
          enable the <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">POST /api/enroll/simulate</code> endpoint.
          Use this to test the enrolled state without going through Stripe.
        </p>
        <pre className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-mono overflow-x-auto text-gray-800">
{`curl -X POST https://yoursite.com/api/enroll/simulate \\
  -H "Authorization: Bearer <jwt>" \\
  -H "Content-Type: application/json" \\
  -d '{"courseId": "uuid-here"}'`}
        </pre>
        <p className="mt-2 text-xs text-gray-500">⚠ Disable this in production — it bypasses payment validation.</p>
      </section>

      <div className="mt-10 flex gap-4">
        <Link href="/docs/self-hosting" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
          Next: Self-Hosting →
        </Link>
        <Link href="/docs/quizzes" className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          ← Quizzes
        </Link>
      </div>
    </div>
  );
}
