import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AISummary from '@/app/run/[sessionId]/AISummary'
import EventTimeline from './EventTimeline'
import ScreenshotGallery from './ScreenshotGallery'
import Link from 'next/link'

interface Props {
  params: Promise<{ sessionId: string }>
}

interface FeedbackRow {
  id?: string
  overall_rating?: number
  summary?: string
  bugs_found?: number
  repro_steps?: string
  expected_behavior?: string
  actual_behavior?: string
  feedback_bugs?: Array<{title?: string; severity?: string; description?: string; steps_to_reproduce?: string}>
}

export default async function ReportPage({ params }: Props) {
  const { sessionId } = await params
  const admin = createAdminClient()

  const { data: session } = await admin
    .from('test_sessions')
    .select('id, status, started_at, ended_at, notes, end_reason, job_id, tester_id, ai_summary')
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
    .select('id, overall_rating, summary, bugs_found, repro_steps, expected_behavior, actual_behavior, feedback_bugs(*)')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })

  const { count: eventCount } = await admin
    .from('session_events')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)

  const TIER_LABELS: Record<string, string> = { quick: '10 min', standard: '20 min', deep: '30 min' }

  const durationMs = session.started_at && session.ended_at
    ? new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()
    : null
  const durationMin = durationMs != null ? Math.round(durationMs / 60000) : null

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200" data-testid="report-page">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4 sticky top-0 z-20 bg-gray-950/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              ← Back to dashboard
            </Link>
            <h1 className="text-base font-semibold text-white mt-0.5">
              {job?.title ?? 'Test Report'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {durationMin != null && (
              <span className="text-xs text-gray-500">{durationMin}m</span>
            )}
            {eventCount != null && (
              <span className="text-xs text-gray-500" data-testid="report-event-count">
                {eventCount} events
              </span>
            )}
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              session.status === 'complete' ? 'bg-green-900/60 text-green-300 border border-green-800' :
              session.status === 'abandoned' ? 'bg-yellow-900/60 text-yellow-300 border border-yellow-800' :
              session.status === 'timed_out' ? 'bg-orange-900/60 text-orange-300 border border-orange-800' :
              'bg-gray-800 text-gray-400 border border-gray-700'
            }`} data-testid="report-status">
              {session.status}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">

        {/* ─── AI Summary (top) ─── */}
        <section data-testid="report-ai-summary">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] bg-indigo-900/50 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full font-medium">
              AI
            </span>
            <h2 className="text-sm font-semibold text-white">AI Analysis</h2>
          </div>
          <AISummary sessionId={sessionId} autoLoad={true} />
        </section>

        {/* ─── Job metadata ─── */}
        <section className="bg-gray-900 border border-gray-700 rounded-lg p-4" data-testid="report-job-meta">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Session Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-gray-500">URL</span>
              <p className="text-gray-300 truncate mt-0.5">
                <a href={job?.url} target="_blank" rel="noopener noreferrer"
                  className="hover:text-indigo-300 transition-colors">
                  {job?.url ?? '—'}
                </a>
              </p>
            </div>
            <div>
              <span className="text-gray-500">Tier</span>
              <p className="text-gray-300 mt-0.5">{job?.tier} · {TIER_LABELS[job?.tier ?? 'standard'] ?? '?'}</p>
            </div>
            <div>
              <span className="text-gray-500">Started</span>
              <p className="text-gray-300 mt-0.5">
                {session.started_at ? new Date(session.started_at).toLocaleString() : '—'}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Ended</span>
              <p className="text-gray-300 mt-0.5">
                {session.ended_at ? new Date(session.ended_at).toLocaleString() : '—'}
              </p>
            </div>
          </div>
          {session.end_reason && (
            <div className="mt-3 pt-3 border-t border-gray-800 text-xs">
              <span className="text-gray-500">End reason: </span>
              <span className="text-gray-400">{session.end_reason}</span>
            </div>
          )}
          {job?.instructions && (
            <div className="mt-3 pt-3 border-t border-gray-800">
              <span className="text-xs text-gray-500 block mb-1">Instructions</span>
              <p className="text-xs text-gray-400 whitespace-pre-wrap">{job.instructions}</p>
            </div>
          )}
        </section>

        {/* ─── Screenshot gallery ─── */}
        <section data-testid="report-screenshot-gallery">
          <h2 className="text-sm font-semibold text-white mb-3">Screenshots</h2>
          <ScreenshotGallery sessionId={sessionId} />
        </section>

        {/* ─── Feedback list ─── */}
        {feedbackRows && feedbackRows.length > 0 && (
          <section data-testid="report-feedback-list">
            <h2 className="text-sm font-semibold text-white mb-3">
              Tester Feedback
              {feedbackRows.length > 1 && (
                <span className="ml-2 text-xs text-gray-500">({feedbackRows.length} submissions)</span>
              )}
            </h2>
            <div className="space-y-4">
              {(feedbackRows as FeedbackRow[]).map((feedback, idx) => (
                <div key={feedback.id ?? idx}
                  className="bg-gray-900 border border-gray-700 rounded-lg p-4"
                  data-testid="report-feedback">
                  {/* Rating + bugs count */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(n => (
                          <span key={n} className={n <= (feedback.overall_rating ?? 0) ? 'text-yellow-400' : 'text-gray-700'}>
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">{feedback.overall_rating}/5</span>
                    </div>
                    {(feedback.bugs_found ?? 0) > 0 && (
                      <span className="text-xs bg-red-900/60 text-red-300 border border-red-800 px-2 py-0.5 rounded-full">
                        {feedback.bugs_found} bug{feedback.bugs_found !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Summary */}
                  {feedback.summary && (
                    <div className="mb-3">
                      <span className="text-xs text-gray-500 block mb-1">Summary</span>
                      <p className="text-sm text-gray-300">{feedback.summary}</p>
                    </div>
                  )}

                  {/* Repro / expected / actual */}
                  {feedback.repro_steps && (
                    <div className="mt-3 pt-3 border-t border-gray-800">
                      <span className="text-xs text-gray-500 block mb-1">Reproduction steps</span>
                      <p className="text-xs text-gray-400 whitespace-pre-wrap">{feedback.repro_steps}</p>
                    </div>
                  )}
                  {(feedback.expected_behavior || feedback.actual_behavior) && (
                    <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-2 gap-3">
                      {feedback.expected_behavior && (
                        <div>
                          <span className="text-xs text-gray-500 block mb-1">Expected</span>
                          <p className="text-xs text-green-400/80">{feedback.expected_behavior}</p>
                        </div>
                      )}
                      {feedback.actual_behavior && (
                        <div>
                          <span className="text-xs text-gray-500 block mb-1">Actual</span>
                          <p className="text-xs text-red-400/80">{feedback.actual_behavior}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bug list */}
                  {Array.isArray(feedback.feedback_bugs) && feedback.feedback_bugs.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
                      <h4 className="text-xs font-semibold text-gray-400">Reported bugs ({feedback.feedback_bugs.length})</h4>
                      {(feedback.feedback_bugs as Array<{title?: string; severity?: string; description?: string; steps_to_reproduce?: string}>).map((bug, i) => (
                        <div key={i} className="flex gap-2 items-start bg-gray-800/50 rounded p-2" data-testid="report-bug-item">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 mt-0.5 ${
                            bug.severity === 'critical' ? 'bg-red-900/60 text-red-300 border border-red-800' :
                            bug.severity === 'high' ? 'bg-orange-900/60 text-orange-300 border border-orange-800' :
                            bug.severity === 'medium' ? 'bg-yellow-900/60 text-yellow-300 border border-yellow-800' :
                            'bg-blue-900/60 text-blue-300 border border-blue-800'
                          }`}>
                            {bug.severity ?? 'low'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-300">{bug.title}</p>
                            {bug.description && <p className="text-xs text-gray-500 mt-0.5">{bug.description}</p>}
                            {bug.steps_to_reproduce && (
                              <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{bug.steps_to_reproduce}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Tester notes ─── */}
        {session.notes && (
          <section className="bg-gray-900 border border-gray-700 rounded-lg p-4" data-testid="report-tester-notes">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tester Notes</h3>
            <p className="text-sm text-gray-400 whitespace-pre-wrap">{session.notes}</p>
          </section>
        )}

        {/* ─── Event timeline ─── */}
        <section data-testid="report-event-timeline">
          <h2 className="text-sm font-semibold text-white mb-3">Event Log</h2>
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <EventTimeline sessionId={sessionId} />
          </div>
        </section>

      </div>
    </div>
  )
}
