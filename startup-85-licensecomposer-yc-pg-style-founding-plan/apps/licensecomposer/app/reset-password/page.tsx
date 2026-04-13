'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const supabase = createBrowserClient();
  const router = useRouter();

  // Supabase sends the user to this page with a hash fragment; we need to let the session be set
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Session is now set, user can update password
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); }
    else {
      setDone(true);
      setTimeout(() => router.push('/dashboard'), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-gray-900">PactTailor</Link>
          <p className="text-gray-500 mt-2">Set a new password</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          {done ? (
            <div className="text-center space-y-3">
              <div className="text-4xl">✅</div>
              <h2 className="text-lg font-semibold text-gray-900">Password updated!</h2>
              <p className="text-sm text-gray-500">Redirecting you to your dashboard…</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-6">{error}</div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                  <input
                    id="password" type="password" value={password}
                    onChange={e => setPassword(e.target.value)} required minLength={8}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Min. 8 characters"
                  />
                </div>
                <div>
                  <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
                  <input
                    id="confirm" type="password" value={confirm}
                    onChange={e => setConfirm(e.target.value)} required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Repeat password"
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-indigo-600 text-white rounded-xl px-4 py-3 text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50">
                  {loading ? 'Saving...' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
