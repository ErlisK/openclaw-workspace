'use client';
import * as React from 'react';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === 'true';

interface AuthFormProps {
  mode: 'login' | 'signup';
}

export function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    const supabase = createClient();

    if (mode === 'signup') {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) {
        setError(authError.message);
      } else {
        setMessage('Check your email for a confirmation link.');
      }
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message);
      } else {
        window.location.href = '/dashboard';
      }
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError('');
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (authError) {
      setError(authError.message);
      setGoogleLoading(false);
    }
    // On success, browser redirects to Google — no need to setLoading(false)
  };

  if (message) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
        <p className="text-2xl mb-2">📧</p>
        <p className="font-semibold text-emerald-300 mb-1">Almost there!</p>
        <p className="text-sm text-emerald-400">{message}</p>
        <p className="mt-3 text-xs text-emerald-500">
          Sent to <strong>{email}</strong>. Check your spam folder if you don&apos;t see it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Google OAuth button */}
      {GOOGLE_ENABLED && (
        <>
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-60 transition-colors"
          >
            <GoogleIcon />
            {googleLoading ? 'Redirecting…' : `Continue with Google`}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase text-gray-500">
              <span className="bg-transparent px-2">or</span>
            </div>
          </div>
        </>
      )}

      {/* Email/password form */}
      <form onSubmit={handleEmailAuth} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">Email</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-500 px-3 py-2 text-sm outline-none focus:border-violet-500/50 focus:bg-white/10 transition-colors"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">Password</label>
          <input
            type="password"
            required
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={mode === 'signup' ? 8 : 1}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-500 px-3 py-2 text-sm outline-none focus:border-violet-500/50 focus:bg-white/10 transition-colors"
            placeholder={mode === 'signup' ? 'Min. 8 characters' : ''}
          />
        </div>
        {error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60 transition-colors"
        >
          {loading
            ? mode === 'signup' ? 'Creating account…' : 'Signing in…'
            : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      {mode === 'login' && (
        <p className="text-center text-xs text-gray-500">
          <a href="/auth/forgot-password" className="text-violet-400 hover:text-violet-300 transition-colors">
            Forgot password?
          </a>
        </p>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.84-1.57 2.4v2h2.54c1.49-1.37 2.35-3.39 2.35-5.75 0-.55-.05-1.08-.09-1.65z"/>
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.54-2C11.03 13.67 10.05 14 8.98 14c-2.09 0-3.86-1.41-4.5-3.31H1.87v2.06C3.19 15.28 5.91 17 8.98 17z"/>
      <path fill="#FBBC05" d="M4.48 10.69A5.37 5.37 0 0 1 4.2 9c0-.59.1-1.17.28-1.69V5.25H1.87A8.96 8.96 0 0 0 1 9c0 1.45.35 2.82.87 4.06l2.6-2.37z"/>
      <path fill="#EA4335" d="M8.98 4c1.18 0 2.23.41 3.07 1.2l2.3-2.3C12.95 1.59 11.14.82 8.98.82 5.91.82 3.19 2.54 1.87 5.07l2.6 2.37C5.12 5.41 6.89 4 8.98 4z"/>
    </svg>
  );
}
