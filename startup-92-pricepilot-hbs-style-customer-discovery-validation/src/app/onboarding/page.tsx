'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface OnboardingStep {
  key: string
  label: string
  href: string
  optional?: boolean
  completed: boolean
  skipped: boolean
  completed_at: string | null
}

interface OnboardingData {
  steps: OnboardingStep[]
  completedCount: number
  total: number
  totalRequired: number
  done: boolean
}

export default function OnboardingPage() {
  const [data, setData] = useState<OnboardingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const fetchProgress = async () => {
    const r = await fetch('/api/onboarding')
    if (r.ok) setData(await r.json())
    setLoading(false)
  }

  useEffect(() => {
    fetchProgress()
    // Fire analytics event
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'onboarding_viewed', properties: { page: '/onboarding' } }),
    })
  }, [])

  const markStep = async (step: string, action: 'complete' | 'skip' | 'reset') => {
    setActing(step)
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: `onboarding_${action}`, properties: { step } }),
    })
    const r = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step, action }),
    })
    if (r.ok) await fetchProgress()
    setActing(null)
  }

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>
  if (!data) return <div style={{ padding: '2rem' }}>Please <Link href="/login">log in</Link> to continue.</div>

  const pct = Math.round((data.completedCount / data.total) * 100)

  return (
    <main style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        🚀 Getting Started with PricingSim
      </h1>
      <p style={{ color: 'var(--text-secondary, #666)', marginBottom: '1.5rem' }}>
        Complete these steps to run your first pricing experiment and start growing revenue.
      </p>

      {/* Progress bar */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.4rem' }}>
          <span>{data.completedCount} of {data.total} steps complete</span>
          <span style={{ fontWeight: 600, color: 'var(--brand, #4f46e5)' }}>{pct}%</span>
        </div>
        <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
          <div data-testid="onboarding-progress-bar" style={{
            height: '100%',
            width: `${pct}%`,
            background: 'var(--brand, #4f46e5)',
            borderRadius: 4,
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {data.done && (
        <div data-testid="onboarding-complete-banner" style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
          padding: '1rem 1.25rem', marginBottom: '1.5rem', color: '#166534'
        }}>
          🎉 <strong>You&apos;re all set!</strong> Your first experiment is ready to launch.
          {' '}<Link href="/experiments" style={{ color: '#166534', fontWeight: 600 }}>View experiments →</Link>
        </div>
      )}

      {/* Step list */}
      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {data.steps.map((step, idx) => {
          const isDone = step.completed || step.skipped
          const isActing = acting === step.key
          return (
            <li
              key={step.key}
              data-testid={`onboarding-step-${step.key}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '1rem 1.25rem',
                background: isDone ? '#f9fafb' : '#fff',
                border: `1px solid ${isDone ? '#e5e7eb' : 'var(--brand, #4f46e5)'}`,
                borderRadius: 8,
                opacity: isDone ? 0.75 : 1,
              }}
            >
              {/* Check circle */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: step.completed ? '#22c55e' : step.skipped ? '#9ca3af' : 'var(--brand, #4f46e5)',
                color: '#fff', fontWeight: 700, fontSize: '0.875rem',
              }}>
                {step.completed ? '✓' : step.skipped ? '—' : idx + 1}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: '0.1rem' }}>{step.label}</div>
                {step.optional && <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Optional</span>}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                {!isDone && (
                  <>
                    <Link href={step.href} style={{
                      background: 'var(--brand, #4f46e5)', color: '#fff',
                      padding: '0.4rem 0.875rem', borderRadius: 6, fontSize: '0.875rem',
                      fontWeight: 600, textDecoration: 'none',
                    }}
                      onClick={() => fetch('/api/analytics', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ event: 'onboarding_step_clicked', properties: { step: step.key } }),
                      })}
                    >
                      Go →
                    </Link>
                    <button
                      onClick={() => markStep(step.key, 'complete')}
                      disabled={isActing}
                      data-testid={`complete-btn-${step.key}`}
                      style={{
                        background: '#f3f4f6', border: '1px solid #d1d5db',
                        padding: '0.4rem 0.75rem', borderRadius: 6, fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      {isActing ? '…' : '✓ Mark done'}
                    </button>
                    {!step.optional && (
                      <button
                        onClick={() => markStep(step.key, 'skip')}
                        disabled={isActing}
                        data-testid={`skip-btn-${step.key}`}
                        style={{
                          background: 'transparent', border: 'none',
                          padding: '0.4rem', fontSize: '0.8rem',
                          color: '#9ca3af', cursor: 'pointer',
                        }}
                      >
                        Skip
                      </button>
                    )}
                  </>
                )}
                {isDone && (
                  <button
                    onClick={() => markStep(step.key, 'reset')}
                    disabled={isActing}
                    data-testid={`reset-btn-${step.key}`}
                    style={{
                      background: 'transparent', border: 'none',
                      fontSize: '0.8rem', color: '#9ca3af', cursor: 'pointer',
                    }}
                  >
                    Undo
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href="/dashboard" style={{ color: 'var(--brand, #4f46e5)', fontSize: '0.9rem' }}>
          ← Back to dashboard
        </Link>
        <Link href="/docs" style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          Read the docs
        </Link>
      </div>
    </main>
  )
}
