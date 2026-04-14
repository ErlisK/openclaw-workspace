import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch user's test jobs
  const { data: jobs } = await supabase
    .from('test_jobs')
    .select('id, url, tier, status, created_at')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const tierColors: Record<string, string> = {
    quick: 'bg-green-100 text-green-700',
    standard: 'bg-blue-100 text-blue-700',
    deep: 'bg-purple-100 text-purple-700',
  }
  const statusColors: Record<string, string> = {
    queued: 'bg-gray-100 text-gray-600',
    assigned: 'bg-yellow-100 text-yellow-700',
    in_progress: 'bg-orange-100 text-orange-700',
    tester_complete: 'bg-blue-100 text-blue-700',
    report_ready: 'bg-green-100 text-green-700',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-indigo-600 font-bold text-lg">AgentQA</Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user.email}</span>
          <form action="/api/auth/signout" method="post">
            <button type="submit" className="text-sm text-gray-500 hover:text-gray-700">Sign out</button>
          </form>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Tests</h1>
            <p className="text-gray-500 mt-1">Track your submitted test jobs</p>
          </div>
          <Link
            href="/submit"
            className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + New test
          </Link>
        </div>

        {!jobs || jobs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <div className="text-5xl mb-4">🧪</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No tests yet</h2>
            <p className="text-gray-500 mb-6">Submit your first test and get results in under 4 hours.</p>
            <Link href="/submit" className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">
              Start a test — from $5
            </Link>
          </div>
        ) : (
          <div className="space-y-3" data-testid="jobs-list">
            {jobs.map((job: { id: string; url: string; tier: string; status: string; created_at: string }) => (
              <div key={job.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between hover:border-gray-300 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{job.url}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(job.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${tierColors[job.tier] || 'bg-gray-100 text-gray-600'}`}>
                    {job.tier}
                  </span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[job.status] || 'bg-gray-100 text-gray-600'}`}>
                    {job.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
