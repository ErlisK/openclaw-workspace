/**
 * app/auth/confirm/page.tsx
 * Handles email confirmation/verification links from Supabase.
 * Reads the `code` or `token_hash` query param and exchanges it for a session.
 */
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ code?: string; token_hash?: string; type?: string; error?: string; error_description?: string }>;
}

export default async function ConfirmPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { code, token_hash, type, error, error_description } = params;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-red-200 p-8 text-center">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Verification Failed</h1>
          <p className="text-gray-600 mb-6">{error_description ?? error ?? 'An error occurred during email verification.'}</p>
          <Link href="/login" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  if (!code && !token_hash) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-4">🔗</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invalid Confirmation Link</h1>
          <p className="text-gray-600 mb-6">This link is missing required parameters. Please request a new confirmation email.</p>
          <Link href="/login" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  try {
    const supabase = await createServerSupabaseClient();

    if (token_hash && type) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as 'email' | 'signup' | 'recovery' | 'invite',
      });
      if (verifyError) {
        throw verifyError;
      }
    } else if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        throw exchangeError;
      }
    }

    // Success — redirect to dashboard
    redirect('/dashboard?verified=1');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Verification failed';
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-red-200 p-8 text-center">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Verification Failed</h1>
          <p className="text-gray-600 mb-6">{message}</p>
          <Link href="/login" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }
}
