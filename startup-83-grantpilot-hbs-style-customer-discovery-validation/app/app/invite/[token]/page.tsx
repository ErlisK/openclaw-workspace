'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

export default function InvitePage({ params }: { params: { token: string } }) {
  const [status, setStatus] = useState<'loading' | 'accepting' | 'done' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [needsAuth, setNeedsAuth] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function handle() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setNeedsAuth(true)
        setStatus('loading')
        return
      }

      setStatus('accepting')
      const { data, error } = await supabase.rpc('accept_team_invite', { p_token: params.token })

      if (error || data?.error) {
        setStatus('error')
        setMessage(error?.message || data?.error || 'Invalid or expired invite link')
      } else {
        setStatus('done')
        setMessage('You\'ve joined the organization!')
        setTimeout(() => router.push('/dashboard'), 2000)
      }
    }
    handle()
  }, [params.token])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-lg">GP</span>
        </div>

        {status === 'loading' && !needsAuth && (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Processing invite…</h1>
            <div className="text-gray-500 text-sm">Please wait</div>
          </>
        )}

        {needsAuth && (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Accept team invite</h1>
            <p className="text-gray-500 text-sm mb-6">Sign in or create an account to accept this invitation.</p>
            <div className="flex gap-3">
              <a href={`/login?redirect=/invite/${params.token}`}
                 className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 text-sm">
                Sign in
              </a>
              <a href={`/signup?redirect=/invite/${params.token}`}
                 className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 text-sm">
                Create account
              </a>
            </div>
          </>
        )}

        {status === 'accepting' && (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Accepting invite…</h1>
            <div className="text-gray-500 text-sm">Joining organization…</div>
          </>
        )}

        {status === 'done' && (
          <>
            <div className="text-4xl mb-4">🎉</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">You&apos;re in!</h1>
            <p className="text-gray-500 text-sm">{message} Redirecting to dashboard…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Invite failed</h1>
            <p className="text-red-600 text-sm mb-4">{message}</p>
            <a href="/dashboard" className="text-indigo-600 text-sm hover:underline">Go to dashboard →</a>
          </>
        )}
      </div>
    </div>
  )
}
