'use client';
/**
 * app/checkout/success/page.tsx
 * Post-checkout success page. Confirms payment and fires analytics event.
 */
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { analytics } from '@/lib/analytics';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const sessionId = searchParams?.get('session_id') ?? undefined;
    analytics.checkoutSuccess(sessionId, 'subscription');
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6 bg-white rounded-2xl shadow-sm border border-gray-200 px-8 py-10">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <span className="text-3xl">✅</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment successful!</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Your PactTailor account has been upgraded. Start generating unlimited contracts now.
          </p>
        </div>
        <div className="space-y-2">
          <Link
            href="/wizard"
            className="block w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            ⚡ Generate a Contract →
          </Link>
          <Link
            href="/dashboard"
            className="block w-full border border-gray-200 text-gray-600 py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm"
          >
            Go to Dashboard
          </Link>
        </div>
        <p className="text-xs text-gray-400">
          Questions? Email us at{' '}
          <a href="mailto:hello@pacttailor.com" className="underline hover:text-gray-600">hello@pacttailor.com</a>
        </p>
      </div>
    </div>
  );
}
