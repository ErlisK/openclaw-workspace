'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { TIER_CONFIG } from '@/lib/types'
import type { TestJob } from '@/lib/types'

const TIER_CREDITS: Record<string, number> = { quick: 5, standard: 10, deep: 15 }

export default function PublishJobPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params?.id as string

  const [job, setJob] = useState<TestJob | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [held, setHeld] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.auth.getUser().then(({ data }) => {
        if (!data.user) router.replace('/login')
      }),
      fetch(`/api/jobs/${jobId}`).then(r => r.ok ? r.json() : null).then(d => {
        if (d?.job) setJob(d.job as TestJob)
      }),
      fetch('/api/credits').then(r => r.ok ? r.json() : null).then(d => {
        if (d) { setBalance(d.available ?? d.balance ?? null); setHeld(d.held ?? null) }
      }),
    ]).finally(() => setLoading(false))
  }, [jobId, router])

  async function handlePublish() {
    setPublishing(true)
    setError('')
    const res = await fetch(`/api/jobs/${jobId}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: 'published' }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to publish job')
      setPublishing(false)
      return
    }
    router.push(`/jobs/${jobId}?published=1`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">Job not found or you don&apos;t have access.</p>
        <Link href="/dashboard" className="text-indigo-600 hover:underline text-sm">← Back to Dashboard</Link>
      </div>
    )
  }

  if (job.status !== 'draft') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">
          This job is already <strong>{job.status}</strong> and cannot be published again.
        </p>
        <Link href={`/jobs/${jobId}`} className="text-indigo-600 hover:underline text-sm">← Back to Job</Link>
      </div>
    )
  }

  const tierCfg = TIER_CONFIG[job.tier]
  const creditCost = TIER_CREDITS[job.tier] ?? 5
  const hasEnough = balance !== null && balance >= creditCost

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <Link href={`/jobs/${jobId}`} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
          ← Back to Job
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium text-sm">Publish</span>
      </header>

      <main className="max-w-lg mx-auto px-6 py-12 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Publish your test job</h1>
          <p className="text-sm text-gray-500">Once published, your job will appear in the tester marketplace. Credits are held until the test completes.</p>
        </div>

        {/* Job Summary */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-gray-900">{job.title}</p>
              <a href={job.url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-indigo-600 hover:underline break-all">{job.url}</a>
            </div>
            <span className="ml-3 shrink-0 text-sm font-semibold text-gray-700">
              {tierCfg?.label} · {tierCfg?.duration_min} min
            </span>
          </div>
          {job.instructions && (
            <p className="text-xs text-gray-500 border-t border-gray-100 pt-3 line-clamp-3">{job.instructions}</p>
          )}
        </div>

        {/* Credit check */}
        <div className={`rounded-xl p-5 border ${hasEnough ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Credit balance</span>
            <span className={`text-sm font-bold ${hasEnough ? 'text-green-700' : 'text-amber-700'}`}>
              {balance !== null ? `${balance} available` : '—'}
              {held !== null && held > 0 ? ` (${held} held)` : ''}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Cost to publish</span>
            <span className="text-sm font-bold text-gray-900">{creditCost} credits (${(creditCost).toFixed(2)})</span>
          </div>
          {!hasEnough && (
            <div className="mt-3 pt-3 border-t border-amber-200">
              <p className="text-xs text-amber-700 mb-2">You need {creditCost - (balance ?? 0)} more credits to publish this job.</p>
              <Link href="/credits" className="inline-block px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
                Buy credits →
              </Link>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link href={`/jobs/${jobId}`}
            className="flex-1 text-center px-4 py-3 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50">
            Cancel
          </Link>
          <button
            onClick={handlePublish}
            disabled={publishing || !hasEnough}
            className="flex-1 px-4 py-3 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {publishing ? 'Publishing…' : `Publish for ${creditCost} credits`}
          </button>
        </div>
      </main>
    </div>
  )
}
