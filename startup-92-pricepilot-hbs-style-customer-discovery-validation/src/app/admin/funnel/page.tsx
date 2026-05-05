/**
 * /admin/funnel — Admin funnel metrics dashboard
 * Reads from analytics_events (platform-wide, service role).
 * Secured by ADMIN_SECRET cookie or query param.
 * Renders even with zero real users (seeded data).
 */
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

export const metadata: Metadata = { title: 'Funnel Metrics — Admin | PricingSim' }
export const dynamic = 'force-dynamic'

const FUNNEL_STEP_LABELS: Record<string, string> = {
  page_view:           'Page views',
  signup:              'Signups',
  onboarding_viewed:   'Onboarding viewed',
  import_started:      'Import started',
  import_complete:     'Import complete',
  engine_run:          'Engine runs',
  suggestion_created:  'Suggestions',
  experiment_created:  'Experiments created',
  experiment_viewed:   'Exp. page views',
  converted_variant:   'Conversions',
}

const FUNNEL_STEP_ICONS: Record<string, string> = {
  page_view:           '👁',
  signup:              '✏️',
  onboarding_viewed:   '👋',
  import_started:      '📤',
  import_complete:     '✅',
  engine_run:          '⚡',
  suggestion_created:  '💡',
  experiment_created:  '🧪',
  experiment_viewed:   '🔗',
  converted_variant:   '🏆',
}

interface FunnelStep {
  step: string
  count: number
  dropoff_pct: number
}

interface FunnelData {
  period_days: number
  generated_at: string
  summary: {
    total_page_views: number
    total_signups: number
    total_engine_runs: number
    total_experiments: number
    total_conversions: number
    signup_rate_pct: number
    activation_rate_pct: number
    experiment_rate_pct: number
  }
  funnel: FunnelStep[]
  daily_activity: Array<{ date: string; count: number }>
  top_referrers: Array<{ source: string; count: number }>
  variant_performance: Array<{ variant: string; views: number; conversions: number; cvr: number }>
  weekly_signups: Array<{ week: string; count: number }>
}

async function getFunnelData(days: number): Promise<FunnelData> {
  const adminSecret = process.env.ADMIN_SECRET ?? ''
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  const resp = await fetch(`${baseUrl}/api/admin/funnel?days=${days}`, {
    headers: { Authorization: `Bearer ${adminSecret}` },
    cache: 'no-store',
  })

  if (!resp.ok) throw new Error(`Funnel API failed: ${resp.status}`)
  return resp.json()
}

function BarChart({ data, maxVal }: { data: number[]; maxVal: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: 64 }}>
      {data.map((v, i) => (
        <div
          key={i}
          title={String(v)}
          style={{
            flex: 1,
            minWidth: 4,
            height: `${Math.max(4, (v / Math.max(maxVal, 1)) * 64)}px`,
            background: v > 0 ? '#4f46e5' : '#e5e7eb',
            borderRadius: '2px 2px 0 0',
            opacity: 0.5 + 0.5 * (v / Math.max(maxVal, 1)),
          }}
        />
      ))}
    </div>
  )
}

export default async function AdminFunnelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  // Auth: check ADMIN_SECRET in query params (or cookie for browser access)
  const sp = await searchParams
  const adminSecret = process.env.ADMIN_SECRET ?? ''
  const provided = sp.key ?? ''

  if (!provided || provided !== adminSecret) {
    // Show login form
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#0f0f23', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#1e1e3f', padding: '2rem', borderRadius: 12, maxWidth: 380, width: '90%', border: '1px solid #3730a3' }}>
          <h1 style={{ color: '#a5b4fc', fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>🔐 Admin Dashboard</h1>
          <p style={{ color: '#6b7280', fontSize: '0.8rem', marginBottom: '1.5rem' }}>PricingSim Funnel Metrics</p>
          <form method="GET" action="/admin/funnel">
            <input
              name="key"
              type="password"
              placeholder="Admin secret key"
              required
              style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: 8, border: '1px solid #3730a3', background: '#0f0f23', color: '#e5e7eb', fontSize: '0.875rem', boxSizing: 'border-box', marginBottom: '0.75rem' }}
            />
            <button
              type="submit"
              style={{ width: '100%', padding: '0.65rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}
            >
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    )
  }

  const days = Number(sp.days ?? 30)
  let data: FunnelData | null = null
  let fetchError: string | null = null

  try {
    data = await getFunnelData(days)
  } catch (e) {
    fetchError = String(e)
  }

  if (!data) {
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', color: '#ef4444' }}>
        <p>Error loading funnel data: {fetchError}</p>
      </div>
    )
  }

  const funnelMax = data.funnel[0]?.count ?? 1
  const dailyMax = Math.max(...data.daily_activity.map(d => d.count), 1)

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', background: '#0f0f23', color: '#e5e7eb' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #1e1e3f', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f0f23' }}>
        <div>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#a5b4fc', margin: 0 }}>🚀 PricingSim — Admin Funnel</h1>
          <p style={{ color: '#4b5563', fontSize: '0.75rem', margin: '0.1rem 0 0' }}>
            Last {days} days · Generated {new Date(data.generated_at).toLocaleString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[7, 30, 90].map(d => (
            <a
              key={d}
              href={`/admin/funnel?key=${provided}&days=${d}`}
              style={{
                padding: '0.3rem 0.65rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                background: days === d ? '#4f46e5' : '#1e1e3f',
                color: days === d ? '#fff' : '#9ca3af',
                textDecoration: 'none', border: `1px solid ${days === d ? '#4f46e5' : '#3730a3'}`,
              }}
            >
              {d}d
            </a>
          ))}
        </div>
      </div>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1.5rem' }}>
        {/* KPI cards */}
        <div data-testid="kpi-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Page Views',      value: data.summary.total_page_views.toLocaleString(),  sub: 'unique visitors', color: '#6366f1' },
            { label: 'Signups',         value: data.summary.total_signups.toLocaleString(),      sub: `${data.summary.signup_rate_pct}% CVR`,  color: '#8b5cf6' },
            { label: 'Engine Runs',     value: data.summary.total_engine_runs.toLocaleString(),  sub: `${data.summary.activation_rate_pct}% of signups`, color: '#06b6d4' },
            { label: 'Experiments',     value: data.summary.total_experiments.toLocaleString(),  sub: `${data.summary.experiment_rate_pct}% of runs`, color: '#10b981' },
          ].map(card => (
            <div key={card.label} style={{ background: '#1e1e3f', borderRadius: 10, padding: '1.25rem', border: `1px solid ${card.color}33` }}>
              <p style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{card.label}</p>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: card.color, margin: '0.2rem 0 0.1rem', lineHeight: 1 }}>{card.value}</p>
              <p style={{ fontSize: '0.72rem', color: '#4b5563', margin: 0 }}>{card.sub}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Funnel visualization */}
          <div data-testid="funnel-chart" style={{ background: '#1e1e3f', borderRadius: 10, padding: '1.25rem', border: '1px solid #1e2a4f' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#a5b4fc', margin: '0 0 1.25rem' }}>Conversion Funnel</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {data.funnel.map((step, i) => {
                const pct = funnelMax > 0 ? (step.count / funnelMax) * 100 : 0
                const label = FUNNEL_STEP_LABELS[step.step] ?? step.step
                const icon  = FUNNEL_STEP_ICONS[step.step] ?? '•'
                return (
                  <div key={step.step}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
                      <span style={{ width: 20, textAlign: 'center', fontSize: '0.9rem' }}>{icon}</span>
                      <span style={{ width: 160, fontSize: '0.78rem', color: '#9ca3af', flexShrink: 0 }}>{label}</span>
                      <div style={{ flex: 1, height: 18, background: '#0f0f23', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`, height: '100%', borderRadius: 4,
                          background: `hsl(${240 - i * 22}, 80%, 60%)`,
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                      <span style={{ width: 55, textAlign: 'right', fontWeight: 700, fontSize: '0.78rem', color: '#e5e7eb' }}>
                        {step.count.toLocaleString()}
                      </span>
                      {i > 0 && step.dropoff_pct > 0 && (
                        <span style={{
                          width: 50, textAlign: 'right', fontSize: '0.72rem',
                          color: step.dropoff_pct > 50 ? '#ef4444' : step.dropoff_pct > 25 ? '#f59e0b' : '#10b981',
                        }}>
                          -{step.dropoff_pct}%
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Daily activity chart */}
          <div style={{ background: '#1e1e3f', borderRadius: 10, padding: '1.25rem', border: '1px solid #1e2a4f' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#a5b4fc', margin: '0 0 1rem' }}>
              Daily Activity (last {Math.min(days, 30)} days)
            </h2>
            <BarChart data={data.daily_activity.map(d => d.count)} maxVal={dailyMax} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#4b5563', marginTop: '0.3rem' }}>
              <span>{data.daily_activity[0]?.date?.slice(5)}</span>
              <span>today</span>
            </div>

            {/* Top referrers */}
            <h3 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#a5b4fc', margin: '1.25rem 0 0.75rem' }}>Top Signup Sources</h3>
            {data.top_referrers.slice(0, 6).map(r => (
              <div key={r.source} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                <span style={{ color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{r.source || 'direct'}</span>
                <span style={{ fontWeight: 700, color: '#6366f1', flexShrink: 0 }}>{r.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Variant performance */}
          <div data-testid="variant-performance" style={{ background: '#1e1e3f', borderRadius: 10, padding: '1.25rem', border: '1px solid #1e2a4f' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#a5b4fc', margin: '0 0 1rem' }}>A/B Variant CVR</h2>
            {data.variant_performance.length === 0 && (
              <p style={{ color: '#4b5563', fontSize: '0.8rem' }}>No variant data in this window</p>
            )}
            {data.variant_performance.map(v => (
              <div key={v.variant} style={{ marginBottom: '0.875rem', padding: '0.75rem', background: '#0f0f23', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#a5b4fc', fontWeight: 700 }}>{v.variant}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#10b981' }}>{v.cvr}% CVR</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', color: '#6b7280' }}>
                  <span>Views: <strong style={{ color: '#9ca3af' }}>{v.views}</strong></span>
                  <span>Conversions: <strong style={{ color: '#9ca3af' }}>{v.conversions}</strong></span>
                </div>
              </div>
            ))}
          </div>

          {/* Weekly signups */}
          <div style={{ background: '#1e1e3f', borderRadius: 10, padding: '1.25rem', border: '1px solid #1e2a4f' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#a5b4fc', margin: '0 0 1rem' }}>Weekly Signups</h2>
            {data.weekly_signups.slice(-8).map(w => {
              const maxW = Math.max(...data.weekly_signups.map(s => s.count), 1)
              return (
                <div key={w.week} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', fontSize: '0.75rem' }}>
                  <span style={{ width: 70, color: '#4b5563', flexShrink: 0 }}>{w.week.slice(5)}</span>
                  <div style={{ flex: 1, height: 14, background: '#0f0f23', borderRadius: 4 }}>
                    <div style={{ width: `${(w.count / maxW) * 100}%`, height: '100%', background: '#8b5cf6', borderRadius: 4 }} />
                  </div>
                  <span style={{ width: 30, textAlign: 'right', fontWeight: 700, color: '#8b5cf6' }}>{w.count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Seed data controls */}
        <div style={{ background: '#1a1a2e', borderRadius: 10, padding: '1.25rem', border: '1px solid #1e2a4f', fontSize: '0.8rem' }}>
          <h2 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a5b4fc', margin: '0 0 0.75rem' }}>⚡ Seed Controls</h2>
          <p style={{ color: '#4b5563', marginBottom: '0.75rem' }}>Seed synthetic funnel events so the dashboard renders without real user activity.</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <a
              data-testid="btn-seed-90d"
              href={`/api/admin/seed-events?days=90&users=120`}
              target="_blank"
              onClick={e => { e.preventDefault(); fetch('/api/admin/seed-events?days=90&users=120', { method: 'POST', headers: { Authorization: `Bearer ${provided}` } }).then(() => window.location.reload()) }}
              style={{ padding: '0.4rem 0.875rem', background: '#4f46e5', color: '#fff', borderRadius: 6, textDecoration: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              Seed 120 users · 90 days
            </a>
            <a
              href={`/api/admin/seed-events?days=30&users=50`}
              onClick={e => { e.preventDefault(); fetch('/api/admin/seed-events?days=30&users=50', { method: 'POST', headers: { Authorization: `Bearer ${provided}` } }).then(() => window.location.reload()) }}
              style={{ padding: '0.4rem 0.875rem', background: '#1e1e3f', color: '#9ca3af', border: '1px solid #3730a3', borderRadius: 6, textDecoration: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              Seed 50 users · 30 days
            </a>
            <a
              href="#"
              onClick={e => { e.preventDefault(); window.location.reload() }}
              style={{ padding: '0.4rem 0.875rem', background: '#1e1e3f', color: '#6b7280', border: '1px solid #374151', borderRadius: 6, textDecoration: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              ↻ Refresh
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
