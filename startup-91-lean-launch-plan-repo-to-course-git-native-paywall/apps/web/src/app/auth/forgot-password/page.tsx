'use client';
import * as React from 'react';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://teachrepo.com';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${APP_URL}/auth/update-password`,
    });
    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-3xl mb-3">📬</p>
          <h2 className="text-lg font-bold text-gray-900">Check your email</h2>
          <p className="text-sm text-gray-500 mt-2">
            We sent a password reset link to <strong>{email}</strong>. Check your inbox (and spam folder).
          </p>
          <a href="/auth/login" className="mt-6 inline-block text-sm text-violet-600 hover:underline">
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <a href="/" className="text-2xl font-bold text-violet-600">📚 TeachRepo</a>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Reset your password</h1>
          <p className="mt-1 text-sm text-gray-500">Enter your email and we&apos;ll send a reset link.</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                placeholder="you@example.com"
              />
            </div>
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-sm text-gray-600">
          Remember your password?{' '}
          <a href="/auth/login" className="font-medium text-violet-600 hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
