import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 — Page Not Found | TeachRepo',
  description: 'The page you were looking for doesn\'t exist.',
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Decorative number */}
        <div className="relative mb-6 select-none">
          <span className="text-[10rem] font-black leading-none text-gray-100 pointer-events-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl">🗺️</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Page not found
        </h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Maybe the course was unpublished, or the link is outdated.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
          >
            Back to home
          </Link>
          <Link
            href="/marketplace"
            className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-violet-300 transition-colors"
          >
            Browse courses →
          </Link>
        </div>

        {/* Helpful links */}
        <div className="mt-12 pt-8 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-4">Popular destinations</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            {[
              { href: '/docs', label: 'Documentation' },
              { href: '/docs/quickstart', label: 'Quickstart' },
              { href: '/auth/login', label: 'Sign in' },
              { href: '/auth/signup', label: 'Get started free' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="text-violet-600 hover:underline">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
