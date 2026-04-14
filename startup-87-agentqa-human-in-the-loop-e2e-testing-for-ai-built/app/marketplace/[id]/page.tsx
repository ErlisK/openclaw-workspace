import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { acceptJob } from '@/lib/actions'
import type { TestJob } from '@/lib/types'
import { TIER_CONFIG } from '@/lib/types'

export default async function AcceptJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch the published job (RLS ensures only published/assigned/complete are visible)
  const { data: job } = await supabase
    .from('test_jobs')
    .select('*')
    .eq('id', id)
    .in('status', ['published'])
    .single()

  if (!job) notFound()

  const j = job as TestJob
  const tierCfg = TIER_CONFIG[j.tier]

  // Check if already assigned
  const { data: existing } = await supabase
    .from('job_assignments')
    .select('id, status')
    .eq('job_id', id)
    .eq('tester_id', user.id)
    .maybeSingle()

  async function handleAccept() {
    'use server'
    const result = await acceptJob(id)
    if (result.ok) {
      redirect(`/tester/sessions/new?assignment=${result.data.assignmentId}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <Link href="/marketplace" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
          ← Marketplace
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium text-sm truncate">{j.title}</span>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div>
              <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {tierCfg?.label ?? j.tier} Tier
              </span>
              <h1 className="text-xl font-bold text-gray-900 mt-2">{j.title}</h1>
              <a href={j.url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-indigo-600 hover:underline break-all mt-1 block">{j.url}</a>
            </div>
            <div className="text-right ml-4 shrink-0">
              <div className="text-3xl font-bold text-gray-900">${j.price_cents / 100}</div>
              <div className="text-xs text-gray-500 mt-0.5">~{tierCfg?.duration_min} min</div>
            </div>
          </div>

          {/* What to test */}
          {j.instructions && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Testing Instructions</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{j.instructions}</p>
            </div>
          )}

          {/* What&apos;s included */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">What you&apos;ll do</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                Open the app URL in your browser
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                Follow the testing instructions ({tierCfg?.duration_min} min)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                Report any bugs, broken flows, or UX issues
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                Submit your feedback through the platform
              </li>
            </ul>
          </div>

          {/* Action */}
          {existing ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-sm text-yellow-800 font-medium">
                You already have an active assignment for this job.
              </p>
              {existing.status === 'active' && (
                <Link href={`/tester/assignments/${existing.id}`}
                  className="inline-block mt-2 text-sm text-indigo-600 hover:underline">
                  Continue testing →
                </Link>
              )}
            </div>
          ) : j.client_id === user.id ? (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <p className="text-sm text-gray-600">This is your own job — you can&apos;t test it yourself.</p>
            </div>
          ) : (
            <form action={handleAccept}>
              <button type="submit" data-testid="accept-job-button"
                className="w-full py-4 bg-indigo-600 text-white font-bold text-lg rounded-xl hover:bg-indigo-700 transition-colors">
                Accept Job — Earn ${j.price_cents / 100}
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">
                By accepting, you commit to completing the test within 4 hours.
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
