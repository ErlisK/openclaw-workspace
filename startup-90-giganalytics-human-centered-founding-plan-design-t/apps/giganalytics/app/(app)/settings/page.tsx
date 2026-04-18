import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import BenchmarkOptIn from './BenchmarkOptIn'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('benchmark_opt_in')
    .eq('id', user.id)
    .single()

  const benchmarkOptIn = profile?.benchmark_opt_in ?? false

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-400">Manage your account preferences</p>
        </div>
        <Link href="/dashboard" className="text-sm border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50">
          ← Dashboard
        </Link>
      </div>

      {/* Account section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Account</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-800">Email</div>
            <div className="text-sm text-gray-400">{user.email}</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
            Change password
          </Link>
        </div>
      </div>

      {/* Privacy / Benchmarking */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Privacy &amp; Benchmarks</h2>
        <BenchmarkOptIn initialOptIn={benchmarkOptIn} />
        <p className="text-xs text-gray-400 mt-3">
          Your individual data is never shared. Only aggregated percentiles with ≥10 contributors are published.{' '}
          <Link href="/privacy" className="text-blue-500 hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}
