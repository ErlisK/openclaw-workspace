import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { TestJob } from '@/lib/types'
import { TIER_CONFIG } from '@/lib/types'

export const revalidate = 30 // revalidate every 30s

export default async function MarketplacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch published jobs — RLS policy allows authenticated users to see them
  const { data: jobs, error } = await supabase
    .from('test_jobs')
    .select('id, title, url, tier, price_cents, instructions, status, published_at, created_at')
    .in('status', ['published'])
    .order('published_at', { ascending: false })
    .limit(50)

  const jobList = (jobs ?? []) as TestJob[]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-gray-900">AgentQA</Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/marketplace" className="text-indigo-600 font-medium">Marketplace</Link>
            {user && <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link href="/dashboard" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Sign in</Link>
              <Link href="/signup" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
                Sign up
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tester Marketplace</h1>
          <p className="text-gray-500">
            Browse open testing jobs. Pick one up and earn ${5}–${15} per completed test.
          </p>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 mb-8 text-sm text-gray-500">
          <span data-testid="marketplace-job-count">
            <strong className="text-gray-900">{jobList.length}</strong> open job{jobList.length !== 1 ? 's' : ''}
          </span>
          <span>Avg payout <strong className="text-gray-900">$9</strong></span>
          <span>Avg time <strong className="text-gray-900">20 min</strong></span>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error.message}
          </div>
        )}

        {!user && (
          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
            <p className="text-sm text-indigo-800">
              <strong>Sign up as a tester</strong> to pick up jobs and start earning.
            </p>
            <Link href="/signup" className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
              Get started
            </Link>
          </div>
        )}

        {/* Job Grid */}
        {jobList.length === 0 ? (
          <div className="text-center py-20 text-gray-400" data-testid="marketplace-empty">
            <div className="text-5xl mb-4">🧪</div>
            <p className="text-lg font-medium mb-1">No open jobs right now</p>
            <p className="text-sm">Check back soon — new jobs are posted regularly.</p>
            {user && (
              <Link href="/jobs/new" className="inline-block mt-6 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700">
                Post a test job
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4" data-testid="marketplace-jobs">
            {jobList.map((job) => {
              const tierCfg = TIER_CONFIG[job.tier]
              return (
                <div key={job.id}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
                  data-testid={`marketplace-job-${job.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{job.title}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                          {tierCfg?.label ?? job.tier}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mb-2 truncate">{job.url}</p>
                      {job.instructions && (
                        <p className="text-sm text-gray-600 line-clamp-2">{job.instructions}</p>
                      )}
                      {job.published_at && (
                        <p className="text-xs text-gray-400 mt-2">
                          Posted {new Date(job.published_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-bold text-indigo-600">${job.price_cents / 100}</div>
                      <div className="text-xs text-gray-400 mt-0.5">~{tierCfg?.duration_min ?? 20} min</div>
                      {user ? (
                        <Link href={`/marketplace/${job.id}`}
                          className="inline-block mt-3 px-4 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700"
                          data-testid={`accept-job-${job.id}`}>
                          Accept Job
                        </Link>
                      ) : (
                        <Link href="/signup"
                          className="inline-block mt-3 px-4 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200">
                          Sign in to accept
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
