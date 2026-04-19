import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing & Billing — TeachRepo Docs',
  description:
    'TeachRepo pricing — free forever (MIT licensed), Hosted Creator ($29/mo or $290/yr), Enterprise. What\'s free, what\'s hosted, rev-share, and billing FAQ.',
};

function Pill({ children, color = 'violet' }: { children: React.ReactNode; color?: 'violet' | 'gray' | 'green' }) {
  const cls = {
    violet: 'bg-violet-100 text-violet-700 border-violet-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
    green: 'bg-green-100 text-green-700 border-green-200',
  }[color];
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}

const CHECK = (
  <svg className="mx-auto h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const CROSS = <span className="mx-auto block text-center text-gray-300 text-sm">—</span>;

export default function PricingDocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm">
        <a href="/docs" className="text-violet-600 hover:underline">Docs</a>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-600">Pricing & Billing</span>
      </nav>

      <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900">Pricing & Billing</h1>
      <p className="mb-6 text-lg text-gray-600">
        TeachRepo is <strong>free and MIT-licensed</strong> — self-host it forever with zero
        platform fees. The <strong>Hosted Creator plan</strong> ($29/mo) adds managed
        infrastructure, marketplace discovery, and AI quiz generation so you can focus on
        content rather than devops.
      </p>

      <div className="mb-12 flex flex-wrap gap-3">
        <a href="/pricing" className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
          See interactive pricing →
        </a>
        <a href="/docs/self-hosting" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Self-hosting guide
        </a>
      </div>

      {/* ── Plan overview table ── */}
      <section className="mb-14">
        <h2 className="mb-5 text-2xl font-bold text-gray-900">Plan overview</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 w-1/3">Feature</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700 w-1/5">
                  Free / Self-hosted
                </th>
                <th className="px-4 py-3 text-center font-semibold text-violet-700 w-1/5">
                  Creator<br />
                  <span className="font-normal text-xs">$29/mo · $290/yr</span>
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700 w-1/5">
                  Enterprise
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ['Courses (hosted SaaS)', '3', 'Unlimited', 'Unlimited'],
                ['Lessons per course', '10', 'Unlimited', 'Unlimited'],
                ['Course paywall (Stripe)', '✓', '✓', '✓'],
                ['AI quiz generation', '3 / month', 'Unlimited', 'Unlimited'],
                ['Git-native import (CLI)', '✓', '✓', '✓'],
                ['Custom domain', '✗', '✓', '✓'],
                ['Marketplace listing', '✗', '✓', '✓'],
                ['Affiliate / referral links', '30% cap', '50% cap', 'Custom'],
                ['Analytics retention', '7 days', '90 days', '1 year'],
                ['Embeddable sandboxes', '✓', '✓', '✓'],
                ['Version history', '✓', '✓', '✓'],
                ['Marketplace rev-share', '—', '10% of marketplace sales', 'Negotiable'],
                ['Platform fee (direct sales)', '0%', '0%', '0%'],
                ['Priority support', '✗', '✓', 'Dedicated SLA'],
                ['White-label', '✗', '✗', '✓'],
                ['SSO / SAML', '✗', '✗', '✓'],
                ['SLA uptime', '—', '99.5%', '99.9%'],
              ].map(([feature, free, creator, enterprise]) => (
                <tr key={feature} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-700 font-medium">{feature}</td>
                  <td className="px-4 py-2.5 text-center text-gray-500">{free}</td>
                  <td className="px-4 py-2.5 text-center text-violet-700 font-medium">{creator}</td>
                  <td className="px-4 py-2.5 text-center text-gray-500">{enterprise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Limits above apply to the <strong>hosted</strong> TeachRepo SaaS only. Self-hosted
          deployments have no artificial limits — you own the infrastructure.
        </p>
      </section>

      {/* ── What's free ── */}
      <section className="mb-14">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">What&apos;s free — forever</h2>
        <p className="mb-4 text-gray-700">
          The <strong>entire platform codebase is MIT-licensed on{' '}
          <a href="https://github.com/ErlisK/openclaw-workspace" className="text-violet-600 hover:underline" target="_blank" rel="noopener noreferrer">
            GitHub
          </a></strong>. Self-hosting is and will always be free. No usage caps, no feature flags —
          you control everything.
        </p>
        <ul className="space-y-2 text-gray-700 text-sm">
          {[
            'Full source code — fork, modify, white-label',
            'Git-native import via CLI (`teachrepo push`)',
            'Course paywalls powered by your own Stripe account',
            'Auto-graded quizzes (YAML frontmatter)',
            'Embeddable code sandboxes (CodeSandbox / StackBlitz)',
            'Affiliate / referral tracking (up to 30% commission cap)',
            'Version history and course rollback',
            'GitHub Actions deploy workflow included in the template',
            'Your own Supabase instance — zero vendor lock-in',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <svg className="h-4 w-4 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 rounded-lg bg-green-50 border border-green-100 px-5 py-4 text-sm text-green-800">
          <strong>Zero platform fee on direct sales.</strong> When a learner buys your course
          through your own link, TeachRepo takes 0%. You pay Stripe&apos;s standard rate
          (~2.9% + 30¢). Period.
        </div>
      </section>

      {/* ── What's in Creator ── */}
      <section className="mb-14">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">What the Creator plan adds</h2>
        <p className="mb-4 text-gray-700">
          The $29/mo plan is for creators who want <strong>managed hosting</strong> and
          <strong>marketplace reach</strong> without touching Vercel, Supabase, or Stripe
          webhooks themselves.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              title: 'Managed infrastructure',
              body: 'We run Supabase, Vercel edge deploys, CDN, and webhook processing. No devops required.',
            },
            {
              title: 'Unlimited courses & lessons',
              body: 'The 3-course / 10-lesson free-tier cap is removed. Ship as much as you want.',
            },
            {
              title: 'Custom domain',
              body: 'Point your own domain (e.g. learn.yourdomain.com) at your course site in one click.',
            },
            {
              title: 'Marketplace listing',
              body: 'Your courses appear in the TeachRepo marketplace for organic discovery. Opt in per-course.',
            },
            {
              title: 'Unlimited AI quizzes',
              body: 'Generate quiz questions from your lesson content with AI. Free tier is capped at 3/month.',
            },
            {
              title: '90-day analytics',
              body: 'See where learners drop off, completion rates, and revenue trends over the past 90 days.',
            },
          ].map((card) => (
            <div key={card.title} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-1 font-semibold text-gray-900">{card.title}</h3>
              <p className="text-sm text-gray-600">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Subscription flow ── */}
      <section className="mb-14">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Subscribing to Creator</h2>
        <ol className="space-y-4 text-gray-700">
          {[
            { step: '1', title: 'Create an account', body: <>Sign up at <a href="/auth/signup" className="text-violet-600 hover:underline">/auth/signup</a> with email + password.</> },
            { step: '2', title: 'Go to Pricing', body: <>Visit <a href="/pricing" className="text-violet-600 hover:underline">/pricing</a> and click <strong>Start Creator plan</strong>. Choose monthly ($29) or annual ($290 — save 2 months).</> },
            { step: '3', title: 'Complete Stripe checkout', body: <>You are redirected to a Stripe-hosted checkout page. Use test card <code className="rounded bg-gray-100 px-1 font-mono text-xs">4242 4242 4242 4242</code> (any future expiry, any CVC) in test mode.</> },
            { step: '4', title: 'Plan activates immediately', body: <>After payment, Stripe fires a webhook to TeachRepo. Your account is upgraded to Creator — no page refresh needed.</> },
            { step: '5', title: 'Manage from dashboard', body: <>Go to <a href="/dashboard/billing" className="text-violet-600 hover:underline">/dashboard/billing</a> to see your plan, next renewal, and a link to the Stripe customer portal for invoices / cancellation.</> },
          ].map(({ step, title, body }) => (
            <li key={step} className="flex items-start gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
                {step}
              </span>
              <div>
                <p className="font-semibold text-gray-900">{title}</p>
                <p className="mt-0.5 text-sm text-gray-600">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Two payment flows ── */}
      <section className="mb-14">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Two payment flows — don&apos;t confuse them</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <Pill color="gray">Buyer pays you</Pill>
            <h3 className="mt-3 font-semibold text-gray-900">Course paywall</h3>
            <p className="mt-1 text-sm text-gray-600">
              A learner pays you (the creator) for access to a specific course.
              One-time Stripe Checkout Session. You keep 100% minus Stripe fees.
              Available on both Free and Creator plans.
            </p>
          </div>
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-5">
            <Pill color="violet">You pay TeachRepo</Pill>
            <h3 className="mt-3 font-semibold text-gray-900">Creator subscription</h3>
            <p className="mt-1 text-sm text-gray-600">
              You pay TeachRepo $29/mo for managed hosting + features.
              Monthly Stripe subscription. Cancel anytime from the dashboard.
              Completely optional — self-hosting is always free.
            </p>
          </div>
        </div>
      </section>

      {/* ── Marketplace rev-share ── */}
      <section className="mb-14">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Marketplace rev-share</h2>
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Sale source</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Platform fee</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">You keep</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-3 text-gray-700">Your direct link (any plan)</td>
                <td className="px-4 py-3 text-center font-semibold text-green-600">0%</td>
                <td className="px-4 py-3 text-center text-gray-600">100% (minus Stripe ~3%)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">Marketplace discovery (Creator plan)</td>
                <td className="px-4 py-3 text-center text-gray-600">10%</td>
                <td className="px-4 py-3 text-center text-gray-600">90% (minus Stripe ~3%)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700">Affiliate referral link</td>
                <td className="px-4 py-3 text-center text-gray-600">0% extra</td>
                <td className="px-4 py-3 text-center text-gray-600">You set the commission (max 50% on Creator)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Marketplace opt-in is per-course and can be toggled in course settings at any time.
          Only Creator plan courses are eligible for marketplace listing.
        </p>
      </section>

      {/* ── Cancellation ── */}
      <section className="mb-14">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Cancelling your subscription</h2>
        <ul className="space-y-3 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-violet-500 mt-0.5 shrink-0">→</span>
            Cancel from <a href="/dashboard/billing" className="text-violet-600 hover:underline">/dashboard/billing</a> → <strong>Manage billing</strong> (Stripe customer portal).
          </li>
          <li className="flex items-start gap-2">
            <span className="text-violet-500 mt-0.5 shrink-0">→</span>
            Cancellation takes effect at the <strong>end of the current billing period</strong>. You are not charged again.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-violet-500 mt-0.5 shrink-0">→</span>
            Your courses remain live. Learners who already purchased retain access.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-violet-500 mt-0.5 shrink-0">→</span>
            Plan reverts to Free tier limits (3 courses, 10 lessons each). Courses over the limit are hidden but not deleted.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-violet-500 mt-0.5 shrink-0">→</span>
            Marketplace listings are unlisted when plan reverts to Free.
          </li>
        </ul>
      </section>

      {/* ── Annual billing ── */}
      <section className="mb-14">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Annual billing (save 17%)</h2>
        <div className="rounded-xl bg-violet-50 border border-violet-100 p-6">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm text-gray-600">Monthly</p>
              <p className="text-2xl font-bold text-gray-900">$29<span className="text-base font-normal text-gray-500">/mo</span></p>
              <p className="text-xs text-gray-400">$348/yr</p>
            </div>
            <div className="text-2xl text-gray-300">→</div>
            <div>
              <p className="text-sm text-gray-600">Annual <span className="rounded bg-violet-200 px-1.5 py-0.5 text-xs font-medium text-violet-700">Save $58</span></p>
              <p className="text-2xl font-bold text-violet-700">$290<span className="text-base font-normal text-violet-400">/yr</span></p>
              <p className="text-xs text-gray-400">$24.17/mo billed annually</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Switch to annual from the billing dashboard at any time. You are credited the remaining
            monthly days and charged the prorated annual difference.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mb-14">
        <h2 className="mb-5 text-2xl font-bold text-gray-900">Billing FAQ</h2>
        <div className="space-y-5">
          {[
            {
              q: 'Can I try Creator for free?',
              a: 'There is no trial period, but you can cancel within the first month for a full refund — just email hello@teachrepo.com within 30 days.',
            },
            {
              q: 'What happens to my courses if I stop paying?',
              a: 'Courses already published remain live. Learners who paid retain access. Courses over the Free-tier limit (3 courses, 10 lessons) are hidden until you re-subscribe or delete the extras.',
            },
            {
              q: 'Do you offer refunds?',
              a: '30-day no-questions-asked refund for annual subscriptions. Monthly subscriptions are not refunded for used periods, but you can cancel immediately.',
            },
            {
              q: 'Is TeachRepo really free to self-host?',
              a: 'Yes. The entire codebase is MIT-licensed. Fork it, deploy it, charge your students — TeachRepo takes nothing. You only pay Stripe fees on actual sales.',
            },
            {
              q: 'Can I use my own Stripe account on the hosted plan?',
              a: 'Yes. Your Stripe Connect account is used for course paywalls on all plans. The Creator subscription billing goes through TeachRepo\'s Stripe account separately.',
            },
            {
              q: 'Do you offer non-profit or education discounts?',
              a: 'Yes — email hello@teachrepo.com with your institution details. We offer 50% off for verified non-profits and open-source maintainers.',
            },
          ].map(({ q, a }) => (
            <div key={q} className="border-b border-gray-100 pb-5">
              <p className="font-semibold text-gray-900">{q}</p>
              <p className="mt-1.5 text-sm text-gray-600">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <div className="rounded-xl bg-gray-900 p-8 text-center">
        <h3 className="mb-2 text-xl font-bold text-white">Ready to start?</h3>
        <p className="mb-6 text-sm text-gray-400">
          Self-host for free — or subscribe to Creator for managed hosting + marketplace.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a href="/auth/signup" className="rounded-lg bg-violet-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-400">
            Start free
          </a>
          <a href="/pricing" className="rounded-lg bg-white/10 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/20">
            See pricing →
          </a>
        </div>
      </div>
    </div>
  );
}
