import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AISummary from '@/app/run/[sessionId]/AISummary'
import Link from 'next/link'

interface Props {
  params: Promise<{ sessionId: string }>
}

export default async function ReportPage({ params }: Props) {
  const { sessionId } = await params
  const admin = createAdminClient()

  const { data: session } = await admin
    .from('test_sessions')
    .select('id, status, started_at, ended_at, notes, end_reason, job_id, tester_id')
    .eq('id', sessionId)
    .single()

  if (!session) notFound()

  const { data: job } = await admin
    .from('test_jobs')
    .select('title, url, tier, instructions')
    .eq('id', session.job_id)
    .single()

  const { data: feedbackRows } = await admin
    .from('feedback')
    .select('overall_rating, summary, bugs_found, feedback_bugs(*)')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)

  const feedback = feedbackRows?.[0]

  const TIER_LABELS: Record<string, string> = { quick: '10 min', standard: '20 min', deep: '30 min' }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              ← Back to dashboard
            </Link>
            <h1 className="text-lg font-semibold text-white mt-1">Test Report</h1>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            session.status === 'complete' ? 'bg-green-900 text-green-300' :
            session.status === 'abandoned' ? 'bg-yellow-900 text-yellow-300' :
            session.status === 'timed_out' ? 'bg-orange-900 text-orange-300' :
            'bg-gray-800 text-gray-400'
          }`} data-testid="report-status">
            {session.status}
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {/* Job metadata */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4" data-testid="report-job-meta">
          <h2 className="text-sm font-semibold text-white mb-3">{job?.title ?? 'Untitled job'}</h2>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-500">URL</span>
              <p className="text-gray-300 truncate">{job?.url ?? '—'}</p>
            </div>
            <div>
              <span className="text-gray-500">Tier</span>
              <p className="text-gray-300">{job?.tier} ({TIER_LABELS[job?.tier ?? 'standard'] ?? '20 min'})</p>
            </div>
            <div>
              <span className="text-gray-500">Started</span>
              <p className="text-gray-300">{session.started_at ? new Date(session.started_at).toLocaleString() : '—'}</p>
            </div>
            <div>
              <span className="text-gray-500">Ended</span>
              <p className="text-gray-300">{session.ended_at ? new Date(session.ended_at).toLocaleString() : '—'}</p>
            </div>
            {session.end_reason && (
              <div>
                <span className="text-gray-500">End reason</span>
                <p className="text-gray-300">{session.end_reason}</p>
              </div>
            )}
          </div>
          {job?.instructions && (
            <div className="mt-3 pt-3 border-t border-gray-800">
              <span className="text-xs text-gray-500">Instructions</span>
              <p className="text-xs text-gray-400 mt-1">{job.instructions}</p>
            </div>
          )}
        </div>

        {/* Feedback summary */}
        {feedback && (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4" data-testid="report-feedback">
            <h3 className="text-sm font-semibold text-white mb-3">Tester Feedback</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(n => (
                  <span key={n} className={n <= (feedback.overall_rating ?? 0) ? 'text-yellow-400' : 'text-gray-700'}>
                    ★
                  </span>
                ))}
              </div>
              <span className="text-xs text-gray-400">{feedback.overall_rating}/5</span>
              {(feedback.bugs_found ?? 0) > 0 && (
                <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded-full">
                  {feedback.bugs_found} bug{feedback.bugs_found !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-300">{feedback.summary}</p>

            {/* Bug list */}
            {Array.isArray(feedback.feedback_bugs) && feedback.feedback_bugs.length > 0 && (
              <div className="mt-3 space-y-2">
                <h4 className="text-xs font-semibold text-gray-400">Reported bugs</h4>
                {(feedback.feedback_bugs as Array<{title?: string; severity?: string; description?: string}>).map((bug, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                      bug.severity === 'critical' ? 'bg-red-900 text-red-300' :
                      bug.severity === 'high' ? 'bg-orange-900 text-orange-300' :
                      bug.severity === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-blue-900 text-blue-300'
                    }`}>
                      {bug.severity}
                    </span>
                    <div>
                      <p className="text-xs font-medium text-gray-300">{bug.title}</p>
                      {bug.description && <p className="text-xs text-gray-500">{bug.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tester notes */}
        {session.notes && (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4" data-testid="report-tester-notes">
            <h3 className="text-sm font-semibold text-white mb-2">Tester Notes</h3>
            <p className="text-sm text-gray-400">{session.notes}</p>
          </div>
        )}

        {/* AI Summary */}
        <div data-testid="report-ai-summary">
          <AISummary sessionId={sessionId} />
        </div>
      </div>
    </div>
  )
}
