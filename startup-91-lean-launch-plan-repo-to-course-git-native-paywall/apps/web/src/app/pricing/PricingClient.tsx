'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';

const FREE_FEATURES = [
  { text: 'Full platform source code (MIT licensed)', highlight: false },
  { text: 'Deploy to Vercel, Netlify, or any server', highlight: false },
  { text: 'Git-native authoring (Markdown + YAML)', highlight: false },
  { text: 'Stripe checkout integration', highlight: false },
  { text: 'Auto-graded YAML quizzes', highlight: false },
  { text: 'Gated code sandboxes', highlight: false },
  { text: 'Affiliate/referral tracking', highlight: false },
  { text: 'Up to 3 courses · 10 lessons each', highlight: false },
  { text: '3 AI quiz generations / month', highlight: false },
  { text: 'Community support', highlight: false },
];

const CREATOR_FEATURES = [
  { text: 'Everything in Free', highlight: false },
  { text: 'Unlimited courses & lessons', highlight: true },
  { text: 'Custom domain support', highlight: true },
  { text: 'Marketplace listing & discovery', highlight: true },
  { text: 'Unlimited AI quiz generation', highlight: true },
  { text: 'Analytics — 90-day retention', highlight: true },
  { text: 'Creator funnel dashboard', highlight: true },
  { text: 'Priority email support', highlight: true },
  { text: 'Optional marketplace rev-share (10%)', highlight: false },
];

const FAQS = [
  {
    q: 'What happens to my courses if I cancel?',
    a: 'Your courses stay live. You drop back to the Free limits (3 courses, 10 lessons each). No data is deleted.',
  },
  {
    q: 'Is the free tier really free forever?',
    a: 'Yes. The entire codebase is MIT-licensed on GitHub. Self-host with zero cost forever.',
  },
  {
    q: "What's the marketplace rev-share?",
    a: 'If you opt into the TeachRepo marketplace, we take 10% of each course sale made through marketplace discovery. Sales from your own links have 0% fee.',
  },
  {
    q: 'Can I switch between monthly and annual?',
    a: 'Yes — visit your billing portal any time to switch. Annual is billed upfront and saves $69/year.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'Yes — 14-day no-questions-asked refund on the Creator plan. Email hello@teachrepo.com.',
  },
];

export default function PricingClient() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [, startTransition] = useTransition();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const monthlyPrice = 29;
  const annualMonthlyEquiv = Math.round(27900 / 12 / 100);
  const annualSavings = monthlyPrice * 12 - Math.round(27900 / 100);

  async function handleSubscribe(priceKey: 'creator_monthly' | 'creator_annual') {
    setLoadingPlan(priceKey);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: priceKey }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (res.status === 401) {
        window.location.href = `/auth/signup?next=/pricing`;
      } else {
        alert(data.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  }

  const priceKey: 'creator_monthly' | 'creator_annual' =
    billing === 'annual' ? 'creator_annual' : 'creator_monthly';

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2.5 font-bold">
            <span className="text-xl">📚</span>
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent text-lg">TeachRepo</span>
          </a>
          <nav className="hidden sm:flex items-center gap-7 text-sm text-gray-400">
            <a href="/marketplace" className="hover:text-white transition-colors">Marketplace</a>
            <a href="/docs" className="hover:text-white transition-colors">Docs</a>
            <a href="/blog" className="hover:text-white transition-colors">Blog</a>
            <a href="/pricing" className="text-white">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="/auth/login" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Sign in</a>
            <a href="/auth/signup" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition-all duration-200">
              Get started
            </a>
          </div>
        </div>
      </header>

      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-20 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-600/[0.07] blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 py-24 text-center">
          <div className="inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-300 mb-6">
            Simple, honest pricing
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
            Start free.{' '}
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Scale when you&apos;re ready.
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            The full platform is MIT-licensed and free to self-host forever.
            Upgrade to Hosted Creator for managed infrastructure and marketplace discovery.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                billing === 'monthly'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                billing === 'annual'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Annual
              <span className="ml-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                Save ${annualSavings}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Pricing cards */}
      <div className="mx-auto max-w-5xl px-4 pb-20">
        <div className="grid gap-6 md:grid-cols-3">

          {/* Free / Self-Hosted */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 flex flex-col">
            <div className="mb-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Free / Self-Hosted</div>
              <div className="text-4xl font-bold text-white">$0</div>
              <div className="text-sm text-gray-500 mt-1">forever, MIT licensed</div>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f.text} className="flex items-start gap-2 text-sm text-gray-400">
                  <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                  {f.text}
                </li>
              ))}
            </ul>
            <a
              href="https://github.com/ErlisK/teachrepo-template"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="free-cta"
              className="block w-full rounded-xl border border-white/20 px-6 py-3 text-center text-sm font-semibold text-gray-200 hover:bg-white/5 transition-colors"
            >
              Clone the template →
            </a>
            <p className="text-center text-xs text-gray-600 mt-3">No account needed</p>
          </div>

          {/* Hosted Creator — RECOMMENDED */}
          <div className="rounded-2xl border border-violet-500/50 bg-violet-500/[0.08] p-8 flex flex-col relative shadow-xl shadow-violet-900/20">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-4 py-1 text-xs font-bold text-white uppercase tracking-wide">
              Most Popular
            </div>
            <div className="mb-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-2">Hosted Creator</div>
              <div className="flex items-end gap-1">
                <div className="text-4xl font-bold text-white">
                  ${billing === 'annual' ? annualMonthlyEquiv : monthlyPrice}
                </div>
                <div className="text-sm text-gray-400 mb-1.5">/month</div>
              </div>
              {billing === 'annual' && (
                <div className="text-sm text-emerald-400 font-medium mt-1">
                  Billed ${Math.round(27900/100)}/year · save ${annualSavings}
                </div>
              )}
              {billing === 'monthly' && (
                <div className="text-sm text-gray-500 mt-1">or ${annualMonthlyEquiv}/mo billed annually</div>
              )}
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {CREATOR_FEATURES.map((f) => (
                <li key={f.text} className={`flex items-start gap-2 text-sm ${f.highlight ? 'text-white font-medium' : 'text-gray-400'}`}>
                  <span className="text-violet-400 mt-0.5 shrink-0">✓</span>
                  {f.text}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe(priceKey)}
              disabled={loadingPlan !== null}
              data-testid="creator-cta"
              className="w-full rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-60"
            >
              {loadingPlan === priceKey ? 'Redirecting…' : 'Start Creator plan →'}
            </button>
            <p className="text-center text-xs text-gray-500 mt-3">14-day money-back guarantee</p>
          </div>

          {/* Marketplace / Enterprise */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 flex flex-col">
            <div className="mb-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Marketplace / Enterprise</div>
              <div className="text-4xl font-bold text-white">Custom</div>
              <div className="text-sm text-gray-500 mt-1">rev-share or volume deal</div>
            </div>
            <ul className="space-y-3 mb-8 flex-1 text-sm text-gray-400">
              <li className="flex items-start gap-2"><span className="text-gray-500 mt-0.5 shrink-0">✓</span> Everything in Hosted Creator</li>
              <li className="flex items-start gap-2"><span className="text-gray-500 mt-0.5 shrink-0">✓</span> Negotiated marketplace rev-share</li>
              <li className="flex items-start gap-2"><span className="text-gray-500 mt-0.5 shrink-0">✓</span> White-label / custom branding</li>
              <li className="flex items-start gap-2"><span className="text-gray-500 mt-0.5 shrink-0">✓</span> Team / org access controls</li>
              <li className="flex items-start gap-2"><span className="text-gray-500 mt-0.5 shrink-0">✓</span> SLA + dedicated support</li>
              <li className="flex items-start gap-2"><span className="text-gray-500 mt-0.5 shrink-0">✓</span> SSO / SAML</li>
            </ul>
            <a
              href="mailto:hello@teachrepo.com?subject=Enterprise%20inquiry"
              data-testid="enterprise-cta"
              className="block w-full rounded-xl border border-white/20 px-6 py-3 text-center text-sm font-semibold text-gray-300 hover:bg-white/5 transition-colors"
            >
              Contact us →
            </a>
            <p className="text-center text-xs text-gray-600 mt-3">hello@teachrepo.com</p>
          </div>
        </div>

        {/* Feature comparison table */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-white text-center mb-10">Feature comparison</h2>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left px-6 py-4 font-semibold text-gray-300 w-1/2">Feature</th>
                  <th className="text-center px-6 py-4 font-semibold text-gray-300">Free</th>
                  <th className="text-center px-6 py-4 font-semibold text-violet-400 bg-violet-500/[0.05]">Creator</th>
                  <th className="text-center px-6 py-4 font-semibold text-gray-300">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  ['Max courses', '3', 'Unlimited', 'Unlimited'],
                  ['Max lessons / course', '10', 'Unlimited', 'Unlimited'],
                  ['AI quiz generation', '3/month', 'Unlimited', 'Unlimited'],
                  ['Custom domain', '✗', '✓', '✓'],
                  ['Marketplace listing', '✗', '✓', '✓'],
                  ['Analytics retention', '7 days', '90 days', '1 year'],
                  ['Creator funnel dashboard', '✗', '✓', '✓'],
                  ['Priority support', '✗', '✓', 'Dedicated'],
                  ['White-label', '✗', '✗', '✓'],
                  ['SSO / SAML', '✗', '✗', '✓'],
                ].map(([feature, free, creator, enterprise]) => (
                  <tr key={feature} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3.5 text-gray-300 font-medium">{feature}</td>
                    <td className="px-6 py-3.5 text-center text-gray-500">{free}</td>
                    <td className="px-6 py-3.5 text-center text-violet-400 font-medium bg-violet-500/[0.03]">{creator}</td>
                    <td className="px-6 py-3.5 text-center text-gray-500">{enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-6">
            {FAQS.map((faq) => (
              <div key={faq.q} className="rounded-xl border border-white/10 bg-white/5 p-6">
                <h3 className="font-semibold text-white mb-2">{faq.q}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 relative overflow-hidden text-center rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/80 via-purple-950/60 to-indigo-950/80 py-16 px-8">
          <div className="pointer-events-none absolute -top-16 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white mb-3">Still unsure? Start free.</h2>
            <p className="text-gray-300 mb-8 max-w-lg mx-auto">
              Clone the template, write two lessons, and push. If TeachRepo works for you, upgrade. If not — the code is yours anyway.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/signup"
                className="rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-violet-700 hover:bg-violet-50 transition-colors shadow-lg"
              >
                Import your first course free →
              </Link>
              <a
                href="https://github.com/ErlisK/teachrepo-template"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors"
              >
                Or clone the template on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-10">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="font-semibold text-white">TeachRepo</div>
          <nav className="flex flex-wrap gap-6 justify-center text-gray-500">
            <a href="/marketplace" className="hover:text-gray-300 transition-colors">Marketplace</a>
            <a href="/docs" className="hover:text-gray-300 transition-colors">Docs</a>
            <a href="/blog" className="hover:text-gray-300 transition-colors">Blog</a>
            <a href="/pricing" className="hover:text-gray-300 transition-colors">Pricing</a>
            <a href="/legal/terms" className="hover:text-gray-300 transition-colors">Terms</a>
            <a href="/legal/privacy" className="hover:text-gray-300 transition-colors">Privacy</a>
            <a href="mailto:hello@teachrepo.com" className="hover:text-gray-300 transition-colors">Contact</a>
          </nav>
          <div className="text-xs text-gray-700">&copy; {new Date().getFullYear()} TeachRepo</div>
        </div>
      </footer>
    </div>
  );
}
