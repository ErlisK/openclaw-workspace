/**
 * app/verify-email/page.tsx
 * Shown after email signup. Tells user to check their inbox.
 * Also handles the state where someone lands here directly.
 */
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Verify your email | PactTailor' };

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <Link href="/" className="inline-block text-2xl font-bold text-gray-900 mb-8">
          PactTailor
        </Link>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Check your email</h1>
        <p className="text-gray-500 mb-6 leading-relaxed">
          We sent a confirmation link to your inbox.
          Click it to activate your account and start creating contracts.
        </p>

        {/* Steps */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-left space-y-4 mb-8">
          {[
            { step: '1', label: 'Open the email from PactTailor' },
            { step: '2', label: 'Click the confirmation link' },
            { step: '3', label: 'You\'ll be redirected to your dashboard' },
          ].map(({ step, label }) => (
            <div key={step} className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                {step}
              </span>
              <span className="text-sm text-gray-700">{label}</span>
            </div>
          ))}
        </div>

        {/* Tips */}
        <p className="text-xs text-gray-400 mb-6">
          Didn&apos;t get it? Check your spam folder or{' '}
          <Link href="/signup" className="text-indigo-600 hover:underline">try signing up again</Link>.
        </p>

        <Link
          href="/login"
          className="inline-block text-sm text-gray-500 hover:text-gray-900 hover:underline"
        >
          ← Back to sign in
        </Link>

        <p className="text-xs text-gray-400 mt-8">
          Templates only — not legal advice.
        </p>
      </div>
    </div>
  );
}
