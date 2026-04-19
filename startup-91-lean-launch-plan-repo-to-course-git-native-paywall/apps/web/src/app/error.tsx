'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to console in dev; swap for Sentry/PostHog in production
    console.error('[TeachRepo Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Decorative */}
        <div className="relative mb-6 select-none">
          <span className="text-[10rem] font-black leading-none text-gray-100 pointer-events-none">
            500
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl">⚡</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Something went wrong
        </h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          We hit an unexpected error. Our team has been notified. You can try
          again or head back to safety.
        </p>

        {error.digest && (
          <p className="text-xs text-gray-400 mb-6 font-mono bg-gray-50 rounded-lg px-3 py-2">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-violet-300 transition-colors"
          >
            Back to home
          </Link>
        </div>

        <div className="mt-10 text-sm text-gray-400">
          Still broken?{' '}
          <a href="mailto:hello@teachrepo.com" className="text-violet-600 hover:underline">
            Contact support
          </a>
        </div>
      </div>
    </div>
  );
}
