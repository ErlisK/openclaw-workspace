'use client';
/**
 * app/pricing/page.tsx
 * Pricing page with live Stripe checkout buttons.
 */
import { useState } from 'react';
import Link from 'next/link';

const FREE_FEATURES = [
  '2 contract exports per month',
  'All free templates (14)',
  'PDF, Markdown, HTML download',
  'Plain-English output',
  'Provenance hash',
  'Embeddable badge',
];

const UNLIMITED_FEATURES = [
  'Unlimited contract exports',
  'All 18 templates including premium',
  'Hosted license page (/l/:slug)',
  'Buyer acceptance tracking',
  'Version history + minor edits',
  'Priority support',
];

const PREMIUM_TEMPLATES = [
  { slug: 'nft-commercial-license-opensea', name: 'NFT Commercial License (OpenSea)', tags: ['NFT', 'Web3', 'OpenSea'] },
  { slug: 'font-license-commercial', name: 'Font Commercial License', tags: ['Type design', 'Commercial'] },
  { slug: 'game-dev-commission-sprites', name: 'Game Dev Commission (Sprites)', tags: ['Game assets', 'Commission'] },
  { slug: 'digital-template-reseller', name: 'Digital Template Reseller License', tags: ['Reseller', 'B2B'] },
];

const FAQ = [
  { q: 'What counts as an export?', a: 'Each time you generate and download a contract (PDF, HTML, or Markdown) counts as one export. Viewing and editing drafts do not count.' },
  { q: 'Can I cancel any time?', a: 'Yes. Cancel your $9/year subscription at any time from your account. You keep access until the end of the billing period.' },
  { q: 'Are premium templates included in Unlimited?', a: 'Yes. PactTailor Unlimited includes access to all premium lawyer-reviewed templates at no extra cost.' },
  { q: 'Can I buy premium templates individually?', a: 'Yes. Each premium template is $5 — a one-time payment for permanent access to that template type, regardless of plan.' },
  { q: 'Do you offer refunds?', a: 'We offer a 14-day refund on annual subscriptions if you haven\'t used the paid features. Email hello@pacttailor.com.' },
  { q: 'Is this legal advice?', a: 'No. PactTailor generates template documents, not legal advice. See our Legal Disclaimer for the full scope of our service.' },
];

function CheckoutButton({
  label,
  priceId,
  mode,
  templateSlug,
  className,
}: {
  label: string;
  priceId: string;
  mode: 'subscription' | 'payment';
  templateSlug?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, mode, templateSlug }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? 'Redirecting to checkout…' : label}
    </button>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="font-bold text-indigo-700 text-lg tracking-tight">PactTailor</Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/templates" className="text-gray-600 hover:text-gray-900">Templates</Link>
            <Link href="/docs" className="text-gray-600 hover:text-gray-900">Docs</Link>
            <Link href="/login" className="text-gray-600 hover:text-gray-900">Sign in</Link>
            <Link href="/signup" className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">Get started</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 space-y-16">

        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-extrabold text-gray-900">Simple, honest pricing</h1>
          <p className="text-gray-500 text-lg">Start free. Upgrade when you need more.</p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">

          {/* Free plan */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-6">
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Free</div>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-4xl font-extrabold text-gray-900">$0</span>
                <span className="text-gray-500 pb-1">/forever</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">No credit card required.</p>
            </div>
            <ul className="space-y-2.5">
              {FREE_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-green-500 flex-shrink-0 mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/wizard"
              className="block w-full text-center border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Start free →
            </Link>
          </div>

          {/* Unlimited plan */}
          <div className="bg-indigo-600 rounded-2xl p-8 space-y-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
              MOST POPULAR
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Unlimited</div>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-4xl font-extrabold text-white">$9</span>
                <span className="text-indigo-300 pb-1">/year</span>
              </div>
              <p className="text-sm text-indigo-200 mt-1">That&apos;s 75¢/month. Less than a coffee.</p>
            </div>
            <ul className="space-y-2.5">
              {UNLIMITED_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-white">
                  <span className="text-indigo-300 flex-shrink-0 mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <CheckoutButton
              label="Get Unlimited for $9/year →"
              priceId="price_1TLG8fGt92XrRvUuhLnkHLG2"
              mode="subscription"
              className="w-full bg-white text-indigo-700 font-bold py-3 rounded-xl hover:bg-indigo-50 transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        {/* Premium templates section */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Premium Templates</h2>
            <p className="text-gray-500 mt-1 text-sm">Lawyer-reviewed · $5 one-time · Permanent access · Free with Unlimited</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PREMIUM_TEMPLATES.map(t => (
              <div key={t.slug} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-sm text-gray-900">{t.name}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {t.tags.map(tag => (
                      <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  <span className="font-bold text-gray-900 text-sm">$5</span>
                  <CheckoutButton
                    label="Buy"
                    priceId="price_1TLG8gGt92XrRvUuGCjTHIqi"
                    mode="payment"
                    templateSlug={t.slug}
                    className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400">
            All premium templates are included free with{' '}
            <button
              onClick={async () => {
                const res = await fetch('/api/checkout', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ priceId: 'price_1TLG8fGt92XrRvUuhLnkHLG2', mode: 'subscription' }),
                });
                const d = await res.json();
                if (d.url) window.location.href = d.url;
              }}
              className="underline hover:text-gray-600"
            >
              Unlimited ($9/yr)
            </button>
          </p>
        </section>

        {/* Compare table */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 text-center">Full comparison</h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-4 font-semibold text-gray-700">Feature</th>
                  <th className="text-center px-5 py-4 font-semibold text-gray-700">Free</th>
                  <th className="text-center px-5 py-4 font-semibold text-indigo-700">Unlimited $9/yr</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Monthly exports', '2', 'Unlimited'],
                  ['Free templates (14)', '✅', '✅'],
                  ['Premium templates (4)', '🔒 $5 each', '✅ All included'],
                  ['PDF / HTML / Markdown download', '✅', '✅'],
                  ['Embeddable badge', '✅', '✅'],
                  ['Provenance hash', '✅', '✅'],
                  ['Hosted license page', '—', '✅'],
                  ['Buyer acceptance tracking', '—', '✅'],
                  ['Version history', '—', '✅'],
                  ['Minor edits / re-versioning', '—', '✅'],
                  ['Priority support', '—', '✅'],
                ].map(([feature, free, unlimited], i) => (
                  <tr key={feature} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                    <td className="px-5 py-3 text-gray-700">{feature}</td>
                    <td className="px-5 py-3 text-center text-gray-500">{free}</td>
                    <td className="px-5 py-3 text-center text-indigo-700 font-medium">{unlimited}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="space-y-4 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 text-center">FAQ</h2>
          {FAQ.map(item => (
            <div key={item.q} className="border border-gray-200 rounded-xl p-5 bg-white">
              <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.q}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </section>

        {/* Disclaimer */}
        <p className="text-center text-xs text-gray-400 pb-4">
          ⚠️ PactTailor generates template documents, not legal advice. Consult a licensed attorney for guidance.{' '}
          <Link href="/legal/disclaimer" className="underline hover:text-gray-600">Read disclaimer</Link>
        </p>
      </div>
    </div>
  );
}
