import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { STATUS_LABELS, STATUS_COLORS, formatDuration } from '@/lib/utils'
import { JobStatusRealtime } from '@/components/JobStatusRealtime'
import { FeedbackWidget, ClipFeedback } from '@/components/FeedbackWidget'

export const dynamic = 'force-dynamic'

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: job } = await supabase
    .from('processing_jobs')
    .select(`
      *,
      media_assets(id, title, source_url, duration_min, source_type, transcript_status),
      clip_outputs(*)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!job) notFound()

  const clips = (job.clip_outputs || []).sort((a: any, b: any) => a.clip_index - b.clip_index)
  const asset = job.media_assets
  const readyClips = clips.filter((c: any) => ['preview_ready', 'exported'].includes(c.render_status))
  const isProcessing = !['done', 'failed', 'cancelled'].includes(job.status)

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4">
        <Link href="/dashboard" className="text-gray-500 hover:text-white text-sm">← Dashboard</Link>
      </nav>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Job header */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">{asset?.title || 'Processing...'}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                {asset?.source_type === 'url_import' && (
                  <a href={asset.source_url} target="_blank" rel="noopener noreferrer"
                    className="text-indigo-400 hover:underline truncate max-w-xs">
                    🔗 Source URL
                  </a>
                )}
                {asset?.duration_min && <span>~{Math.round(asset.duration_min)} min</span>}
                <span>{job.clips_requested} clips requested</span>
                <span>{job.target_platforms?.join(', ')}</span>
              </div>
            </div>
            <span className={`text-sm px-3 py-1 rounded-full font-medium whitespace-nowrap ${STATUS_COLORS[job.status] || 'bg-gray-800 text-gray-400'}`}>
              {STATUS_LABELS[job.status] || job.status}
            </span>
          </div>

          {/* Progress pipeline */}
          <div className="mt-6">
            <div className="flex items-center gap-0">
              {['queued', 'ingested', 'transcribing', 'scoring', 'rendering', 'preview_ready', 'done'].map((s, i, arr) => {
                const statusOrder = ['queued', 'ingested', 'proxying', 'transcribing', 'scoring', 'rendering', 'preview_ready', 'done']
                const currentIdx = statusOrder.indexOf(job.status)
                const stepIdx = statusOrder.indexOf(s)
                const done = stepIdx < currentIdx
                const active = stepIdx === currentIdx || (s === 'ingested' && job.status === 'proxying')
                const label: Record<string,string> = { queued: 'Upload', ingested: 'Proxy', transcribing: 'Transcribe', scoring: 'Score', rendering: 'Render', preview_ready: 'Preview', done: 'Done' }
                return (
                  <div key={s} className="flex items-center flex-1">
                    <div className={`flex flex-col items-center gap-1 flex-1 ${i > 0 ? 'relative' : ''}`}>
                      {i > 0 && <div className={`absolute left-0 right-1/2 top-2.5 h-0.5 ${done || active ? 'bg-indigo-500' : 'bg-gray-700'}`} />}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 ${
                        done ? 'bg-indigo-500 border-indigo-500' :
                        active ? 'bg-indigo-900 border-indigo-400 animate-pulse' :
                        'bg-gray-900 border-gray-700'
                      }`}>
                        {done && <span className="text-white text-xs">✓</span>}
                      </div>
                      <span className={`text-xs ${active ? 'text-indigo-400' : done ? 'text-gray-400' : 'text-gray-600'}`}>
                        {label[s] || s}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Realtime job status — replaces manual refresh */}
          {isProcessing ? (
            <div className="mt-4">
              <JobStatusRealtime
                jobId={job.id}
                initialStatus={job.status as any}
                initialClips={(clips as any[]).map((c: any) => ({
                  id: c.id,
                  clip_index: c.clip_index,
                  render_status: c.render_status,
                  preview_url: c.preview_url,
                  heuristic_score: c.heuristic_score,
                  title: c.title,
                  platform: c.platform,
                }))}
              />
            </div>
          ) : null}

          {job.error_message && (
            <div className="mt-4 bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
              {job.error_message}
            </div>
          )}
        </div>

        {/* Clips */}
        {clips.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              Clips {readyClips.length > 0 && `(${readyClips.length} ready)`}
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {clips.map((clip: any) => (
                <div key={clip.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="bg-gray-800 text-gray-300 text-xs font-mono px-2 py-1 rounded">
                        #{clip.clip_index}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{clip.platform}</p>
                        {clip.duration_sec && (
                          <p className="text-gray-500 text-xs">{formatDuration(clip.duration_sec)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {clip.heuristic_score !== null && (
                        <span className="text-xs bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded">
                          score {clip.heuristic_score}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        clip.render_status === 'preview_ready' || clip.render_status === 'exported'
                          ? 'bg-green-900/40 text-green-400'
                          : clip.render_status === 'rendering'
                          ? 'bg-yellow-900/40 text-yellow-400'
                          : clip.render_status === 'failed'
                          ? 'bg-red-900/40 text-red-400'
                          : 'bg-gray-800 text-gray-500'
                      }`}>
                        {clip.render_status}
                      </span>
                    </div>
                  </div>

                  {clip.title && (
                    <p className="mt-3 text-gray-300 text-sm font-medium">"{clip.title}"</p>
                  )}

                  {clip.heuristic_signals?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {clip.heuristic_signals.map((s: string) => (
                        <span key={s} className="text-xs bg-purple-900/20 text-purple-400 px-2 py-0.5 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {clip.hashtags?.length > 0 && (
                    <p className="mt-2 text-indigo-400 text-xs">{clip.hashtags.join(' ')}</p>
                  )}

                  {clip.transcript_excerpt && clip.transcript_excerpt !== '[placeholder]' && (
                    <p className="mt-3 text-gray-600 text-xs font-mono line-clamp-2 bg-gray-800 rounded p-2">
                      {clip.transcript_excerpt}
                    </p>
                  )}

                  {/* Preview player */}
                  {clip.preview_url && (
                    <div className="mt-4">
                      <video
                        src={clip.preview_url}
                        controls
                        className="w-full max-w-xs rounded-lg"
                        style={{ maxHeight: '300px' }}
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 mt-4">
                    {clip.preview_url && (
                      <a
                        href={clip.preview_url}
                        download
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                      >
                        ⬇ Download
                      </a>
                    )}
                    {clip.export_url && (
                      <a
                        href={clip.export_url}
                        download
                        className="bg-green-700 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                      >
                        ⬇ HD Export
                      </a>
                    )}
                    {(clip.preview_url || clip.render_status !== 'pending') && (
                      <FeedbackButton clipId={clip.id} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function RefreshButton() {
  'use client'
  return (
    <button
      onClick={() => window.location.reload()}
      className="mt-2 text-indigo-400 hover:text-indigo-300 text-sm underline"
    >
      Refresh
    </button>
  )
}

function FeedbackButton({ clipId }: { clipId: string }) {
  'use client'
  return (
    <button
      onClick={() => {
        const url = `/api/feedback?clip_id=${clipId}`
        window.open(url, '_blank', 'width=500,height=600')
      }}
      className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
    >
      Rate clip
    </button>
  )
}
