import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Verify Email — GigAnalytics',
}

interface Props {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string; error?: string; error_description?: string }>
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const params = await searchParams
  const { token_hash, type, next, error, error_description } = params

  // Handle error from Supabase redirect
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Verification Failed</h1>
          <p className="text-gray-500 text-sm mb-6">{error_description ?? 'The confirmation link may have expired. Please try signing up again.'}</p>
          <a href="/signup" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            Back to Sign Up
          </a>
        </div>
      </div>
    )
  }

  // If no token_hash, try to verify via OTP exchange
  if (token_hash && type) {
    const supabase = await createClient()
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'email' | 'signup' | 'recovery' | 'invite' | 'email_change',
    })

    if (verifyError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Verification Failed</h1>
            <p className="text-gray-500 text-sm mb-6">{verifyError.message ?? 'The confirmation link may have expired. Please try signing up again.'}</p>
            <a href="/signup" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              Back to Sign Up
            </a>
          </div>
        </div>
      )
    }

    // Success — redirect to next or onboarding
    const destination = next?.startsWith('/') && !next.startsWith('//') ? next : '/onboarding'
    redirect(destination)
  }

  // No token — show "check your email" state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-4xl mb-4">📬</div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Check your inbox</h1>
        <p className="text-gray-500 text-sm mb-6">
          We sent a confirmation link to your email address. Click it to activate your account and start your free trial.
        </p>
        <p className="text-gray-400 text-xs">
          Didn&apos;t get it? Check your spam folder, or{' '}
          <a href="/signup" className="text-indigo-600 underline hover:no-underline">try signing up again</a>.
        </p>
      </div>
    </div>
  )
}
