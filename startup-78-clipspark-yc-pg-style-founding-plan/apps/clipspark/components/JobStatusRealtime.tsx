'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAnalytics, EVENTS } from '@/lib/analytics'

type JobStatus = 'queued' | 'ingesting' | 'transcribing' | 'scoring' | 'rendering' | 'done' | 'failed' | 'cancelled'

interface JobUpdate {
  id: string
  status: JobStatus
  preview_ready_at: string | null
  done_at: string | null
  error_message: string | null
  tat_sec: number | null
  clip_outputs?: ClipUpdate[]
}

interface ClipUpdate {
  id: string
  clip_index: number
  render_status: string
  preview_url: string | null
  heuristic_score: number | null
  title: string | null
  platform: string | null
}

const STATUS_STEPS: { key: JobStatus; label: string; pct: number }[] = [
  { key: 'queued',       label: 'Queued',        pct: 5  },
  { key: 'ingesting',    label: 'Downloading',   pct: 15 },
  { key: 'transcribing', label: 'Transcribing',  pct: 45 },
  { key: 'scoring',      label: 'Finding clips', pct: 70 },
  { key: 'rendering',    label: 'Rendering',     pct: 88 },
  { key: 'done',         label: 'Done',          pct: 100 },
]

function getStatusPct(status: JobStatus): number {
  const s = STATUS_STEPS.find(s => s.key === status)
  return s?.pct ?? 0
}

function getStatusLabel(status: JobStatus): string {
  const s = STATUS_STEPS.find(s => s.key === status)
  return s?.label ?? status
}

interface Props {
  jobId: string
  initialStatus: JobStatus
  initialClips?: ClipUpdate[]
  onDone?: (clips: ClipUpdate[]) => void
}

export function JobStatusRealtime({ jobId, initialStatus, initialClips = [], onDone }: Props) {
  const [status, setStatus] = useState<JobStatus>(initialStatus)
  const [clips, setClips] = useState<ClipUpdate[]>(initialClips)
  const [elapsed, setElapsed] = useState(0)
  const [startTime] = useState(Date.now())
  const [previewTracked, setPreviewTracked] = useState(false)
  const { track } = useAnalytics()

  const supabase = createClient()

  // Elapsed timer
  useEffect(() => {
    if (status === 'done' || status === 'failed') return
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000)
    return () => clearInterval(iv)
  }, [status, startTime])

  // Supabase Realtime subscription
  useEffect(() => {
    if (status === 'done' || status === 'failed') return

    const channel = supabase
      .channel(`job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'processing_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const updated = payload.new as JobUpdate
          setStatus(updated.status)
          if (updated.status === 'done' || updated.status === 'failed') {
            // Fetch final clip list
            supabase
              .from('clip_outputs')
              .select('id, clip_index, render_status, preview_url, heuristic_score, title, platform')
              .eq('job_id', jobId)
              .order('clip_index')
              .then(({ data }) => {
                if (data) {
                  setClips(data as ClipUpdate[])
                  if (updated.status === 'done') onDone?.(data as ClipUpdate[])
                  // Track first preview — this is the activation event
                  if (!previewTracked && (data as ClipUpdate[]).some(c => c.preview_url)) {
                    setPreviewTracked(true)
                    track(EVENTS.PREVIEW_READY, {
                      job_id: jobId,
                      clip_count: (data as ClipUpdate[]).filter(c => c.preview_url).length,
                      elapsed_ms: Date.now() - startTime,
                    })
                  }
                }
              })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'clip_outputs',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          const newClip = payload.new as ClipUpdate
          setClips(prev => {
            const existing = prev.find(c => c.id === newClip.id)
            if (existing) return prev
            return [...prev, newClip].sort((a, b) => a.clip_index - b.clip_index)
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'clip_outputs',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          const updated = payload.new as ClipUpdate
          setClips(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [jobId, status, supabase, onDone])

  const pct = getStatusPct(status)
  const isActive = status !== 'done' && status !== 'failed' && status !== 'cancelled'
  const isFailed = status === 'failed'

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isActive && (
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            )}
            {isFailed && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
            {!isActive && !isFailed && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
            <span className={`text-sm font-medium ${
              isFailed ? 'text-red-400' :
              !isActive ? 'text-emerald-400' :
              'text-white'
            }`}>
              {getStatusLabel(status)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {isActive && <span>{formatElapsed(elapsed)}</span>}
            {!isActive && <span>{pct}%</span>}
          </div>
        </div>

        {/* Steps */}
        <div className="relative">
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isFailed ? 'bg-red-500' :
                status === 'done' ? 'bg-emerald-500' :
                'bg-indigo-500'
              } ${isActive ? 'relative overflow-hidden' : ''}`}
              style={{ width: `${pct}%` }}
            >
              {isActive && (
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              )}
            </div>
          </div>

          {/* Step markers */}
          <div className="flex justify-between mt-2">
            {STATUS_STEPS.filter(s => s.key !== 'done').map(step => {
              const idx = STATUS_STEPS.findIndex(s => s.key === status)
              const stepIdx = STATUS_STEPS.findIndex(s => s.key === step.key)
              const done = stepIdx < idx || status === 'done'
              const active = step.key === status
              return (
                <div key={step.key} className={`text-xs transition-colors ${
                  active ? 'text-indigo-400 font-medium' :
                  done ? 'text-gray-500' :
                  'text-gray-700'
                }`}>
                  {step.label}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Clips appearing in realtime */}
      {clips.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-400 font-medium">{clips.length} clip{clips.length !== 1 ? 's' : ''} ready</p>
          {clips.map(clip => (
            <ClipPreviewCard key={clip.id} clip={clip} />
          ))}
        </div>
      )}

      {/* Failed state */}
      {isFailed && (
        <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-4">
          <p className="text-red-400 text-sm font-medium">Processing failed</p>
          <p className="text-gray-500 text-xs mt-1">
            Our team has been notified. Try re-submitting the job or contact support.
          </p>
        </div>
      )}
    </div>
  )
}

function ClipPreviewCard({ clip }: { clip: ClipUpdate }) {
  const isReady = clip.render_status === 'preview_ready' || clip.render_status === 'exported'
  const score = clip.heuristic_score

  return (
    <div className={`bg-gray-900 border rounded-xl p-4 flex items-center gap-4 transition-all ${
      isReady ? 'border-gray-700' : 'border-gray-800 opacity-60'
    }`}>
      {/* Preview thumbnail */}
      <div className="w-16 h-12 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
        {clip.preview_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={clip.preview_url} alt="" className="w-full h-full object-cover rounded-lg" />
        ) : (
          <span className="text-gray-600 text-lg">
            {isReady ? '🎬' : <span className="animate-spin inline-block">⟳</span>}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">
          {clip.title || `Clip ${clip.clip_index + 1}`}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-gray-500">{clip.platform || 'YouTube Shorts'}</span>
          {score !== null && (
            <span className={`text-xs font-medium ${
              score >= 0.6 ? 'text-emerald-400' :
              score >= 0.3 ? 'text-yellow-400' :
              'text-gray-500'
            }`}>
              Score: {(score * 100).toFixed(0)}
            </span>
          )}
          <span className={`text-xs ${isReady ? 'text-emerald-400' : 'text-gray-600'}`}>
            {isReady ? '✓ Ready' : 'Processing…'}
          </span>
        </div>
      </div>

      {isReady && (
        <a
          href={`/clips/${clip.id}/edit`}
          className="text-indigo-400 hover:text-indigo-300 text-xs font-medium flex-shrink-0"
        >
          Edit →
        </a>
      )}
    </div>
  )
}

function formatElapsed(sec: number): string {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}m ${s}s`
}
