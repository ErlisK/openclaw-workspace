'use client';
/**
 * components/PremiumTemplateLock.tsx
 * Shown inline when a user tries to use a premium template they haven't purchased.
 * Displays a lock modal/overlay with purchase CTA.
 */
import React from 'react';
import Link from 'next/link';

interface PremiumTemplateLockProps {
  templateSlug:  string;
  templateName:  string;
  priceDollars?: number;
  /** If true, renders a full-page block. Otherwise renders an inline card. */
  fullPage?: boolean;
}

export default function PremiumTemplateLock({
  templateSlug,
  templateName,
  priceDollars = 5,
  fullPage = false,
}: PremiumTemplateLockProps) {
  const checkoutUrl = `/api/checkout?templateSlug=${encodeURIComponent(templateSlug)}&priceId=${process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_TEMPLATE ?? 'price_1TLG8gGt92XrRvUuGCjTHIqi'}&mode=payment`;

  const handlePurchase = async () => {
    const res  = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId:      'price_1TLG8gGt92XrRvUuGCjTHIqi',
        mode:         'payment',
        templateSlug: templateSlug,
      }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  if (fullPage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">🔒</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Premium Template</h2>
            <p className="text-gray-500 mt-1 text-sm">{templateName}</p>
          </div>
          <p className="text-gray-600 text-sm">
            This is a lawyer-vetted premium template. Purchase it once for permanent access to this template type.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-sm space-y-2">
            <div className="flex items-center gap-2 text-gray-700">
              <span>✅</span> Lawyer-reviewed contract
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <span>✅</span> Permanent access — pay once
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <span>✅</span> All jurisdictions & platforms
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <span>✅</span> Unlimited exports with $9/yr plan
            </div>
          </div>
          <div className="space-y-2">
            <button
              onClick={handlePurchase}
              className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Unlock for ${priceDollars} →
            </button>
            <p className="text-xs text-gray-400">
              Or get all premium templates free with{' '}
              <Link href="/pricing" className="underline hover:text-gray-600">
                Unlimited ($9/yr)
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Inline card variant
  return (
    <div className="rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50 p-5 text-center space-y-3">
      <div className="text-2xl">🔒</div>
      <p className="font-semibold text-indigo-900 text-sm">Premium Template</p>
      <p className="text-xs text-indigo-700">
        <strong>{templateName}</strong> is a lawyer-vetted premium template. Purchase it once for permanent access.
      </p>
      <div className="flex justify-center gap-2">
        <button
          onClick={handlePurchase}
          className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Unlock for ${priceDollars}
        </button>
        <Link
          href="/pricing"
          className="text-xs text-indigo-600 border border-indigo-200 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          Unlimited $9/yr
        </Link>
      </div>
    </div>
  );
}
