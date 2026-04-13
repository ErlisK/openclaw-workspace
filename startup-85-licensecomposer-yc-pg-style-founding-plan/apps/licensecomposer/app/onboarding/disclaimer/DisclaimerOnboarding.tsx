'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const DISCLAIMER_POINTS = [
  'PactTailor is NOT a law firm and does NOT provide legal advice or legal services.',
  'These templates do not create an attorney-client relationship.',
  'Templates have been reviewed for general accuracy but may not be appropriate for your specific situation.',
  'Laws vary by jurisdiction and change over time — always verify currency for your location.',
  'For important legal matters, consult a qualified attorney licensed in your jurisdiction.',
  'PactTailor provides templates "as is" without warranty, and is not liable for damages arising from their use.',
  'You are solely responsible for determining whether a template is suitable for your needs.',
];

export default function DisclaimerOnboarding() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleAccept() {
    if (!checked) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding/disclaimer-accepted', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to save acceptance');
      router.push('/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-gray-900">PactTailor</Link>
          <p className="text-gray-500 mt-2">Before you start — please read this</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-6">
          <div className="flex items-start gap-3">
            <span className="text-3xl">⚖️</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Legal Disclaimer</h1>
              <p className="text-sm text-gray-500 mt-1">
                PactTailor generates <strong>template documents</strong>, not legal advice. Please read and acknowledge the following before using our service.
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
            {DISCLAIMER_POINTS.map((point, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-amber-900">
                <span className="mt-0.5 shrink-0 text-amber-600">•</span>
                <span>{point}</span>
              </div>
            ))}
          </div>

          <label className="flex items-start gap-3 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              aria-label="I have read and acknowledge the legal disclaimer"
            />
            <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
              I have read and understood this disclaimer. I acknowledge that PactTailor&apos;s templates are{' '}
              <strong>not legal advice</strong> and I use them at my own risk. I understand I should consult
              a licensed attorney for important legal matters.
            </span>
          </label>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          <button
            onClick={handleAccept}
            disabled={!checked || loading}
            className="w-full bg-indigo-600 text-white rounded-xl py-3.5 font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving…' : 'I Acknowledge — Continue to Dashboard'}
          </button>

          <p className="text-center text-xs text-gray-400">
            You can review our full{' '}
            <Link href="/legal/disclaimer" className="hover:underline text-indigo-500" target="_blank">Legal Disclaimer</Link>
            {' '}and{' '}
            <Link href="/legal/terms" className="hover:underline text-indigo-500" target="_blank">Terms of Service</Link>{' '}
            at any time.
          </p>
        </div>
      </div>
    </div>
  );
}
