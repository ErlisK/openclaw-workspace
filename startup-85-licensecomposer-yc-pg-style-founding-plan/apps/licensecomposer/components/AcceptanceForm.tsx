'use client';
/**
 * components/AcceptanceForm.tsx
 * Buyer acceptance form for hosted license pages.
 * POSTs to /api/license-pages/:slug/accept with name/email/checkbox.
 */

import { useState } from 'react';

interface Props {
  slug:          string;
  licenseTitle:  string;
  documentHash?: string | null;
}

interface AcceptResult {
  ok:              boolean;
  alreadyAccepted?: boolean;
  acceptanceId?:   string;
  acceptedAt?:     string;
  message?:        string;
  error?:          string;
}

export default function AcceptanceForm({ slug, licenseTitle, documentHash }: Props) {
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [agreed,  setAgreed]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<AcceptResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/license-pages/${slug}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, agreedToTerms: agreed }),
      });
      const data: AcceptResult = await res.json();
      setResult(data);
    } catch {
      setResult({ ok: false, error: 'Network error — please try again.' });
    } finally {
      setLoading(false);
    }
  }

  if (result?.ok) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h3 className="text-lg font-semibold text-green-900 mb-1">
          {result.alreadyAccepted ? 'Already Accepted' : 'License Accepted!'}
        </h3>
        <p className="text-sm text-green-700 mb-3">{result.message}</p>
        {result.acceptedAt && (
          <p className="text-xs text-green-600">
            Recorded at: {new Date(result.acceptedAt).toLocaleString()}
          </p>
        )}
        {result.acceptanceId && (
          <p className="text-xs text-gray-500 mt-1 font-mono">
            Acceptance ID: {result.acceptanceId}
          </p>
        )}
        {documentHash && (
          <p className="text-xs text-gray-400 mt-1 font-mono break-all">
            Document hash: {documentHash.slice(0, 32)}…
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900">Accept This License</h3>
      <p className="text-sm text-gray-600">
        By completing this form, you confirm you have read and agree to the terms above.
        Your acceptance will be recorded with a timestamp and IP address.
      </p>

      <div>
        <label htmlFor="acc-name" className="block text-sm font-medium text-gray-700 mb-1">
          Full name <span className="text-red-500">*</span>
        </label>
        <input
          id="acc-name"
          type="text"
          required
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your full legal name"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="acc-email" className="block text-sm font-medium text-gray-700 mb-1">
          Email address <span className="text-red-500">*</span>
        </label>
        <input
          id="acc-email"
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="flex items-start gap-3">
        <input
          id="acc-agree"
          type="checkbox"
          checked={agreed}
          onChange={e => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <label htmlFor="acc-agree" className="text-sm text-gray-700">
          I have read and agree to the <strong>{licenseTitle}</strong>. I understand this is a
          binding agreement and my acceptance will be recorded.
        </label>
      </div>

      {result?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
          {result.error}
        </div>
      )}

      <button
        type="submit"
        disabled={!agreed || !name || !email || loading}
        className="w-full bg-indigo-600 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Recording acceptance…
          </span>
        ) : 'I Accept This License'}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Your acceptance is recorded with your IP address and a timestamp.
        This record cannot be undone.
      </p>
    </form>
  );
}
