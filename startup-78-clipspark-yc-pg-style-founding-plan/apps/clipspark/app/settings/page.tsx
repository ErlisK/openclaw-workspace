import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import * as React from 'react'
import { ConnectedAccounts } from '@/components/ConnectedAccounts'
import { InviteCodeSection } from '@/components/InviteCodeSection'
import { ReferralWidget } from '@/components/ReferralWidget'
import { UsageMeter } from '@/components/UsageMeter'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: sub }, { data: consent }] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase.from('subscriptions').select('*').eq('user_id', user.id).eq('status', 'active').single(),
    supabase.from('analytics_consent').select('*').eq('user_id', user.id).single(),
  ])

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="border-b border-gray-800 px-6 py-4">
        <Link href="/dashboard" className="text-gray-500 hover:text-white text-sm">← Dashboard</Link>
      </nav>
      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>

        {/* Account */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide">Account</h2>
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-white">{user.email}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Name</p>
            <p className="text-white">{profile?.full_name || '—'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Creator niche</p>
            <p className="text-white">{profile?.creator_niche?.replace(/_/g, ' ') || '—'}</p>
          </div>
        </div>

        {/* Plan */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide">Plan</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium capitalize">
                {profile?.is_alpha ? 'Alpha (unlimited)' : (sub?.plan || 'Free')}
              </p>
              {!profile?.is_alpha && sub?.current_period_end && (
                <p className="text-gray-500 text-sm">
                  Renews {new Date(sub.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
            {!profile?.is_alpha && (
              <Link href="/pricing" className="text-indigo-400 hover:underline text-sm">
                Upgrade →
              </Link>
            )}
          </div>
          {!profile?.is_alpha && sub?.plan !== 'free' && (
            <form action="/api/customer-portal" method="POST">
              <button type="submit" className="text-gray-500 hover:text-white text-sm underline">
                Manage billing / cancel →
              </button>
            </form>
          )}
        </div>

        {/* Analytics consent */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide">Privacy</h2>
          <div className="flex items-start gap-3">
            <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center ${
              consent?.performance_data ? 'bg-indigo-600 border-indigo-500' : 'border-gray-600'
            }`}>
              {consent?.performance_data && <span className="text-white text-xs">✓</span>}
            </div>
            <div>
              <p className="text-sm text-white font-medium">Share performance data</p>
              <p className="text-gray-500 text-xs mt-0.5">
                Anonymized clip view counts shared to improve AI highlight selection.
              </p>
            </div>
          </div>
          <a href="/api/user" className="text-gray-600 hover:text-gray-400 text-xs">
            Update preferences via API
          </a>
        </div>

        {/* Alpha invite codes */}
        {profile?.is_alpha && <AlphaInvites />}

        {/* Connected accounts */}
        <ConnectedAccounts />

        {/* Invite code */}
        <InviteCodeSection />

        <ReferralWidget />

        {/* Full usage + credit pack purchase */}
        <UsageMeter />

        {/* Signout */}
        <form action="/auth/signout" method="POST">
          <button className="text-red-500 hover:text-red-400 text-sm transition-colors">
            Sign out
          </button>
        </form>
      </main>
    </div>
  )
}

function AlphaInvites() {
  return (
    <div className="bg-indigo-900/20 border border-indigo-800/30 rounded-xl p-5 space-y-2">
      <h2 className="font-semibold text-sm text-indigo-400 uppercase tracking-wide">Alpha Invites</h2>
      <p className="text-gray-400 text-sm">
        Share these codes with fellow creators (5 uses each):
      </p>
      <div className="flex flex-wrap gap-2 font-mono text-sm">
        {['CLIPSPARK-ALPHA-001', 'CLIPSPARK-ALPHA-002', 'CLIPSPARK-ALPHA-003'].map(c => (
          <span key={c} className="bg-gray-800 text-indigo-300 px-3 py-1.5 rounded-lg">{c}</span>
        ))}
      </div>
    </div>
  )
}
