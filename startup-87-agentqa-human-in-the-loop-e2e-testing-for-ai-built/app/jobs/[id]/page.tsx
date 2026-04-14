import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { TestJob } from '@/lib/types'
import { TIER_CONFIG } from '@/lib/types'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  published: 'bg-blue-100 text-blue-700',
  assigned: 'bg-yellow-100 text-yellow-700',
  complete: 'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: job } = await supabase
    .from('test_jobs')
    .select('*')
    .eq('id', id)
    .eq('client_id', user.id)
    .single()

  if (!job) notFound()

  const j = job as TestJob

  // Load related data
  const [{ data: assignments }, { data: feedback }] = await Promise.all([
    supabase.from('job_assignments').select('*').eq('job_id', id),
    supabase.from('feedback').select('*, feedback_bugs(*)').eq('job_id', id),
  ])

  const tierCfg = TIER_CONFIG[j.tier]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
            ← Dashboard
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900 font-medium text-sm">{j.title}</span>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[j.status]}`}>
          {j.status}
        </span>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Job Summary Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">{j.title}</h1>
              <a href={j.url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-indigo-600 hover:underline break-all">{j.url}</a>
            </div>
            <div className="text-right ml-4 shrink-0">
              <div className="text-2xl font-bold text-gray-900">
                ${j.price_cents / 100}
              </div>
              <div className="text-xs text-gray-500">{tierCfg?.label} tier · {tierCfg?.duration_min} min</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mt-4 pt-4 border-t border-gray-100">
            <div>
              <span className="text-gray-500">Created</span>
              <p className="text-gray-900">{new Date(j.created_at).toLocaleDateString()}</p>
            </div>
            {j.published_at && (
              <div>
                <span className="text-gray-500">Published</span>
                <p className="text-gray-900">{new Date(j.published_at).toLocaleDateString()}</p>
              </div>
            )}
            {j.completed_at && (
              <div>
                <span className="text-gray-500">Completed</span>
                <p className="text-gray-900">{new Date(j.completed_at).toLocaleDateString()}</p>
              </div>
            )}
            <div>
              <span className="text-gray-500">Payment</span>
              <p className={j.payment_status === 'paid' ? 'text-green-700 font-medium' : 'text-gray-900'}>
                {j.payment_status}
              </p>
            </div>
          </div>

          {j.instructions && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-1">Testing Instructions</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{j.instructions}</p>
            </div>
          )}
        </div>

        {/* Assignments */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-3">
            Assignments ({assignments?.length ?? 0})
          </h2>
          {!assignments || assignments.length === 0 ? (
            <p className="text-sm text-gray-400">
              {j.status === 'draft' ? 'Publish this job to receive tester assignments.' : 'No assignments yet.'}
            </p>
          ) : (
            <div className="space-y-2">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                  <span className="text-gray-700 font-mono text-xs">{a.tester_id.slice(0, 8)}…</span>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      a.status === 'active' ? 'bg-blue-50 text-blue-700' :
                      a.status === 'submitted' ? 'bg-green-50 text-green-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>{a.status}</span>
                    <span className="text-gray-400">{new Date(a.assigned_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feedback */}
        {feedback && feedback.length > 0 && (
          <div className="space-y-4">
            {feedback.map((fb) => (
              <div key={fb.id} className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-900">Tester Feedback</h2>
                  {fb.overall_rating && (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < fb.overall_rating ? 'text-yellow-400' : 'text-gray-200'}>★</span>
                      ))}
                    </div>
                  )}
                </div>

                {fb.summary && (
                  <p className="text-sm text-gray-700 mb-4 whitespace-pre-wrap">{fb.summary}</p>
                )}

                {(fb as { feedback_bugs?: Array<{ id: string; title: string; severity: string; description: string }> }).feedback_bugs && 
                  (fb as { feedback_bugs?: Array<{ id: string; title: string; severity: string; description: string }> }).feedback_bugs!.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Bugs Found ({(fb as { feedback_bugs?: unknown[] }).feedback_bugs?.length ?? 0})
                    </h3>
                    <div className="space-y-2">
                      {(fb as { feedback_bugs?: Array<{ id: string; title: string; severity: string; description: string }> }).feedback_bugs!.map((bug) => (
                        <div key={bug.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 shrink-0 ${
                            bug.severity === 'critical' ? 'bg-red-100 text-red-700' :
                            bug.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                            bug.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{bug.severity}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{bug.title}</p>
                            {bug.description && <p className="text-xs text-gray-500 mt-0.5">{bug.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {j.status === 'draft' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Ready to publish?</p>
              <p className="text-xs text-blue-600 mt-0.5">Publishing makes this job visible to testers in the marketplace.</p>
            </div>
            <Link href={`/jobs/${j.id}/publish`}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
              Publish Job
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
