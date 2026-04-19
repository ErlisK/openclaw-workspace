import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing & Billing — TeachRepo Docs',
  description: 'TeachRepo pricing tiers, revenue share, and paywall mechanics explained.',
};

export default function PricingDocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      <nav className="mb-8 text-sm">
        <a href="/docs" className="text-violet-600 hover:underline">Docs</a>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-600">Pricing & Billing</span>
      </nav>

      <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900">Pricing & Billing</h1>
      <p className="mb-12 text-lg text-gray-600">
        TeachRepo is free to self-host. The hosted SaaS tier handles infrastructure,
        payments, and marketplace distribution for you.
      </p>

      {/* Tiers */}
      <div className="mb-12 grid gap-4 sm:grid-cols-2">
        {[
          {
            name: 'Free / Self-Hosted',
            price: '$0',
            sub: 'forever',
            color: 'border-gray-200',
            features: [
              'Full source code access',
              'Self-deploy on Vercel/Netlify/etc.',
              'Your own Stripe account (0% platform fee)',
              'Unlimited courses & students',
              'Git-native import workflow',
              'AI quiz generation (bring your own key)',
              'Community support',
            ],
          },
          {
            name: 'Pro (Hosted)',
            price: '$29',
            sub: '/month',
            color: 'border-violet-300 ring-2 ring-violet-500/20',
            features: [
              'Everything in Free',
              'Hosted on teachrepo.com',
              'Marketplace listing & discovery',
              'Built-in Stripe checkout (5% platform fee)',
              'Analytics dashboard',
              'AI quiz generation (included)',
              'Custom domain support',
              'Priority support',
            ],
          },
        ].map((tier) => (
          <div key={tier.name} className={`rounded-xl border bg-white p-6 shadow-sm ${tier.color}`}>
            <h2 className="mb-1 text-lg font-bold text-gray-900">{tier.name}</h2>
            <div className="mb-4">
              <span className="text-3xl font-bold text-gray-900">{tier.price}</span>
              <span className="text-gray-500 text-sm">{tier.sub}</span>
            </div>
            <ul className="space-y-2">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-violet-500 mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Revenue / Paywall */}
      <h2 className="mb-4 text-2xl font-bold text-gray-900">How Paywall & Revenue Works</h2>

      <div className="mb-8 space-y-6 text-gray-700">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold text-gray-900">1. You set the price</h3>
          <p className="text-sm">
            In <code className="bg-gray-100 px-1 rounded text-xs">course.yml</code>, set{' '}
            <code className="bg-gray-100 px-1 rounded text-xs">price_cents</code> (e.g. <code>2900</code> for $29).
            Set to <code>0</code> for a free course.
            Lessons with <code>access: free</code> are always visible as a preview.
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold text-gray-900">2. Stripe handles checkout</h3>
          <p className="text-sm">
            When a student clicks Enroll, TeachRepo creates a Stripe Checkout session.
            Payment is processed by Stripe directly — we never store card details.
            After payment, the student is automatically enrolled and locked lessons unlock instantly.
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold text-gray-900">3. Platform fee</h3>
          <p className="text-sm">
            On the hosted Pro tier, TeachRepo takes a <strong>5% platform fee</strong> on each sale.
            Stripe processes the payment and deposits <code>(price × 0.95) − Stripe fees</code> to your bank account.
            On the free/self-hosted tier, <strong>0% platform fee</strong> — pay only Stripe fees directly.
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-2 font-semibold text-gray-900">4. Affiliate / referral tracking</h3>
          <p className="text-sm">
            Set <code className="bg-gray-100 px-1 rounded text-xs">affiliate_pct</code> in course.yml to enable
            affiliate links. Affiliates get a unique link; TeachRepo tracks referrals via a 30-day cookie.
            Commission is paid manually via Stripe transfer — TeachRepo surfaces the affiliate report in your dashboard.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <h2 className="mb-4 text-2xl font-bold text-gray-900">FAQ</h2>
      <div className="space-y-4">
        {[
          ['Can I move from self-hosted to the Pro tier?', 'Yes. Import your courses to teachrepo.com at any time. Student enrollments are tied to Stripe — contact support to migrate purchase history.'],
          ['What payment methods does Stripe support?', 'Cards, Apple Pay, Google Pay, SEPA, iDEAL, and more. Availability depends on your Stripe account settings.'],
          ['Can students get refunds?', 'Refunds are issued directly via your Stripe dashboard. TeachRepo revokes enrollment when you mark an order as refunded.'],
          ['Is there a free trial for Pro?', '14-day free trial, no credit card required. After trial, $29/month or cancel any time.'],
        ].map(([q, a]) => (
          <details key={q as string} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <summary className="cursor-pointer font-medium text-gray-900">{q}</summary>
            <p className="mt-3 text-sm text-gray-600">{a as string}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
