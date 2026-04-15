'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Payout {
  id: string
  amount_cents: number
  currency: string
  status: string
  created_at: string
  notes?: string
  stripe_transfer_id?: string
}

export default function TesterPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      supabase
        .from('payouts')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) setError(error.message)
          else setPayouts(data ?? [])
          setLoading(false)
        })
    })
  }, [])

  const totalEarned = payouts
    .filter(p => p.status === 'released')
    .reduce((sum, p) => sum + p.amount_cents, 0)

  const pendingEarnings = payouts
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount_cents, 0)

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      released: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      flagged: 'bg-orange-100 text-orange-700',
    }
    return `text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] ?? 'bg-gray-100 text-gray-600'}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
          ← Dashboard
        </Link>
        <span className="text-gray-300">/</span>
        <span className="font-medium text-gray-900 text-sm">My Payouts</span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Tester Payouts</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-sm text-gray-500 mb-1">Total Earned</div>
            <div className="text-2xl font-bold text-green-600">${(totalEarned / 100).toFixed(2)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-sm text-gray-500 mb-1">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">${(pendingEarnings / 100).toFixed(2)}</div>
          </div>
        </div>

        {/* Payout info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 text-sm text-blue-800">
          <strong>How payouts work:</strong> After completing a test session, earnings are held for 48 hours
          or until the requester approves your work. Payouts are processed manually by the AgentQA team
          and sent via PayPal or bank transfer. Make sure to keep your payout information up to date.
        </div>

        {/* Payouts list */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading payouts...</div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
        ) : payouts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">💰</div>
            <p className="text-gray-600 font-medium mb-1">No payouts yet</p>
            <p className="text-sm">Complete test sessions to start earning!</p>
            <Link href="/marketplace" className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
              Browse Jobs
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {payouts.map(payout => (
              <div key={payout.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">${(payout.amount_cents / 100).toFixed(2)} {payout.currency.toUpperCase()}</div>
                    {payout.notes && <div className="text-xs text-gray-500 mt-0.5">{payout.notes}</div>}
                    <div className="text-xs text-gray-400 mt-1">{new Date(payout.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={statusBadge(payout.status)}>{payout.status}</span>
                  </div>
                </div>
                {payout.stripe_transfer_id && (
                  <div className="text-xs text-gray-400 mt-2">Transfer: {payout.stripe_transfer_id}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
