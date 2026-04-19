import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing & Billing — TeachRepo Docs',
  description: 'TeachRepo pricing tiers — Free self-hosted, Hosted Creator ($29/mo), Enterprise. Subscription flow, plan limits, and self-hosting details.',
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
        TeachRepo is free to self-host forever (MIT licensed). The Hosted Creator plan adds managed
        infrastructure, marketplace discovery, and unlimited AI quiz generation for $29/month.
      </p>

      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Plan overview</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Feature</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Free</th>
                <th className="px-4 py-3 text-center font-semibold text-violet-700">Creator ($29/mo)</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ['Max courses', '3', 'Unlimited', 'Unlimited'],
                ['Max lessons / course', '10', 'Unlimited', 'Unlimited'],
                ['AI quiz generation', '3/month', 'Unlimited', 'Unlimited'],
                ['Custom domain', '✗', '✓', '✓'],
                ['Marketplace listing', '✗', '✓', '✓'],
                ['Analytics retention', '7 days', '90 days', '1 year'],
                ['Priority support', '✗', '✓', 'Dedicated'],
                ['White-label', '✗', '✗', '✓'],
              ].map(([f, free, creator, ent]) => (
                <tr key={f} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700 font-medium">{f}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{free}</td>
                  <td className="px-4 py-3 text-center text-violet-700 font-medium">{creator}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{ent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-gray-500">
          Full interactive pricing at <a href="/pricing" className="text-violet-600 hover:underline">/pricing</a>.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Subscribing to Creator</h2>
        <ol className="space-y-3 text-gray-700 list-decimal list-inside">
          <li>Sign in at <a href="/auth/signup" className="text-violet-600 hover:underline">/auth/signup</a></li>
          <li>Go to <a href="/pricing" className="text-violet-600 hover:underline">/pricing</a> and click <strong>Start Creator plan</strong></li>
          <li>Complete the Stripe checkout (test card: <code className="rounded bg-gray-100 px-1">4242 4242 4242 4242</code>)</li>
          <li>You are redirected to <code className="rounded bg-gray-100 px-1">/dashboard/billing</code> with Creator plan active</li>
        </ol>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Managing your subscription</h2>
        <p className="mb-3 text-gray-700">
          Visit <a href="/dashboard/billing" className="text-violet-600 hover:underline">/dashboard/billing</a> to:
        </p>
        <ul className="space-y-2 text-gray-700 list-disc list-inside">
          <li>View your current plan and next renewal date</li>
          <li>Switch between monthly and annual billing</li>
          <li>Cancel or pause your subscription</li>
          <li>Download invoices</li>
        </ul>
        <p className="mt-3 text-sm text-gray-500">
          Cancellation takes effect at the end of the current billing period. Your courses remain live.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Course paywall vs. Creator subscription</h2>
        <p className="mb-3 text-gray-700">
          There are two separate payment flows in TeachRepo:
        </p>
        <ul className="space-y-3 text-gray-700 list-disc list-inside">
          <li>
            <strong>Course paywall</strong> — a <em>buyer</em> pays for access to your course.
            This is a one-time Stripe Checkout Session. You keep 100% (minus Stripe fees).
            Works on both Free and Creator plans.
          </li>
          <li>
            <strong>Creator subscription</strong> — <em>you</em> (the creator) pay $29/mo for
            managed hosting, unlimited features, and marketplace listing.
          </li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Marketplace rev-share</h2>
        <p className="text-gray-700 mb-3">
          If you opt into the TeachRepo marketplace, we take <strong>10%</strong> of each sale
          made through marketplace discovery. Sales from your own direct links have a
          <strong>0% platform fee</strong> — you only pay Stripe&apos;s ~2.9% + 30¢.
        </p>
        <p className="text-gray-700">
          Marketplace opt-in is per-course, controlled in the course settings.
          Enterprise plans negotiate custom rev-share rates.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Self-hosting</h2>
        <p className="text-gray-700 mb-3">
          See the full <a href="/docs/self-hosting" className="text-violet-600 hover:underline">Self-Hosting Guide</a>.
          Self-hosted deployments have no plan limits — you control your own infrastructure,
          Stripe account, and Supabase project.
        </p>
        <p className="text-gray-700">
          The plan limits above only apply to the hosted TeachRepo SaaS.
        </p>
      </section>

      <div className="rounded-xl bg-violet-50 border border-violet-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Questions?</h3>
        <p className="text-sm text-gray-600">
          Email <a href="mailto:hello@teachrepo.com" className="text-violet-600 hover:underline">hello@teachrepo.com</a> or{' '}
          <a href="https://github.com/ErlisK/teachrepo-template/issues" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">
            open an issue on GitHub
          </a>.
        </p>
      </div>
    </div>
  );
}
