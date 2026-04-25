/**
 * GET /analytics — Analytics dashboard
 * Shows funnel metrics from analytics_events + experiment performance
 */
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Analytics — PricePilot' }
export const dynamic = 'force-dynamic'

// ── Event funnel definition ───────────────────────────────────────────────
const FUNNEL_STEPS = [
  { event: 'page_view',           label: 'Page views' },
  { event: 'signup',              label: 'Signups' },
  { event: 'import_started',      label: 'Import started' },
  { event: 'import_complete',     label: 'Import complete' },
  { event: 'engine_run',          label: 'Engine runs' },
  { event: 'experiment_created',  label: 'Experiments created' },
  { event: 'experiment_viewed',   label: 'Exp. pages viewed' },
  { event: 'converted_variant',   label: 'Conversions' },
]

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── All events for this user ─────────────────────────────────────────
  const { data: events } = await supabase
    .from('analytics_events')
    .select('event, properties, ab_variant, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(2000)

  const allEvents = events ?? []

  // ── Funnel counts ────────────────────────────────────────────────────
  const funnelCounts = FUNNEL_STEPS.map(step => ({
    ...step,
    count: allEvents.filter(e => e.event === step.event).length,
  }))
  const maxFunnelCount = Math.max(...funnelCounts.map(s => s.count), 1)

  // ── Events by day (last 30 days) ────────────────────────────────────
  const last30: Record<string, number> = {}
  const now = Date.now()
  for (let d = 29; d >= 0; d--) {
    const dt = new Date(now - d * 86400000)
    last30[dt.toISOString().slice(0, 10)] = 0
  }
  for (const e of allEvents) {
    const day = e.created_at?.slice(0, 10)
    if (day && day in last30) last30[day]++
  }
  const chartMax = Math.max(...Object.values(last30), 1)
  const days = Object.entries(last30)

  // ── Events by type (top 10) ──────────────────────────────────────────
  const byType: Record<string, number> = {}
  for (const e of allEvents) {
    byType[e.event] = (byType[e.event] ?? 0) + 1
  }
  const topEvents = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 10)

  // ── AB variant performance ────────────────────────────────────────────
  const abCounts: Record<string, { views: number; conversions: number }> = {}
  for (const e of allEvents) {
    if (!e.ab_variant) continue
    if (!abCounts[e.ab_variant]) abCounts[e.ab_variant] = { views: 0, conversions: 0 }
    if (e.event === 'experiment_viewed') abCounts[e.ab_variant].views++
    if (e.event === 'converted_variant') abCounts[e.ab_variant].conversions++
  }

  // ── Experiment stats ─────────────────────────────────────────────────
  const { data: experiments } = await supabase
    .from('experiments')
    .select('id, slug, status, confidence, winner, views_a, views_b, conversions_a, conversions_b, started_at')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(10)

  // ── Recent audit trail ────────────────────────────────────────────────
  const { data: auditRows } = await supabase
    .from('audit_log')
    .select('action, entity_type, entity_id, new_value, occurred_at')
    .eq('user_id', user.id)
    .order('occurred_at', { ascending: false })
    .limit(15)

  const totalEvents = allEvents.length

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', background: '#f9fafb' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #e5e7eb', background: '#fff', padding: '0 1.5rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link href="/dashboard" style={{ fontWeight: 700, color: '#4f46e5', textDecoration: 'none', fontSize: '1rem' }}>PricePilot</Link>
          <Link href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem' }}>Dashboard</Link>
          <Link href="/experiments" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem' }}>Experiments</Link>
          <span style={{ color: '#4f46e5', fontWeight: 600, fontSize: '0.875rem' }}>Analytics</span>
        </div>
      </nav>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Analytics</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {totalEvents.toLocaleString()} events tracked · last 2,000 shown
          </p>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Total events',   value: totalEvents },
            { label: 'Signups',        value: funnelCounts.find(s => s.event === 'signup')?.count ?? 0 },
            { label: 'Engine runs',    value: funnelCounts.find(s => s.event === 'engine_run')?.count ?? 0 },
            { label: 'Conversions',    value: funnelCounts.find(s => s.event === 'converted_variant')?.count ?? 0 },
          ].map(c => (
            <div key={c.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1.25rem', textAlign: 'center' }}>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: '#4f46e5', margin: 0 }}>{c.value.toLocaleString()}</p>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.15rem 0 0' }}>{c.label}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Activity chart (last 30 days) */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1.25rem' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', margin: '0 0 1rem' }}>Events — last 30 days</h2>
            <div data-testid="activity-chart" style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: 80 }}>
              {days.map(([day, count]) => (
                <div
                  key={day}
                  title={`${day}: ${count} events`}
                  style={{
                    flex: 1,
                    height: `${Math.max(4, (count / chartMax) * 80)}px`,
                    background: count > 0 ? '#4f46e5' : '#e5e7eb',
                    borderRadius: '2px 2px 0 0',
                    opacity: count > 0 ? 0.7 + 0.3 * (count / chartMax) : 1,
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.35rem' }}>
              <span>{days[0]?.[0]?.slice(5)}</span>
              <span>today</span>
            </div>
          </div>

          {/* Top event types */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1.25rem' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem' }}>Top event types</h2>
            {topEvents.length === 0 && <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>No events yet</p>}
            {topEvents.map(([evt, cnt]) => (
              <div key={evt} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                <span style={{ color: '#374151', fontFamily: 'monospace' }}>{evt}</span>
                <span style={{ fontWeight: 700, color: '#4f46e5' }}>{cnt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Conversion funnel */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1.25rem' }}>Conversion Funnel</h2>
          <div data-testid="funnel-chart" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {funnelCounts.map((step, i) => {
              const pct = maxFunnelCount > 0 ? (step.count / maxFunnelCount) * 100 : 0
              const prevCount = i > 0 ? funnelCounts[i - 1].count : step.count
              const convRate = prevCount > 0 && i > 0 ? ((step.count / prevCount) * 100).toFixed(1) : null
              return (
                <div key={step.event} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.82rem' }}>
                  <span style={{ width: 160, color: '#374151', flexShrink: 0 }}>{step.label}</span>
                  <div style={{ flex: 1, height: 20, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#4f46e5', borderRadius: 4, transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ width: 40, textAlign: 'right', fontWeight: 700, color: '#374151' }}>{step.count}</span>
                  {convRate && <span style={{ width: 60, fontSize: '0.75rem', color: '#9ca3af' }}>{convRate}%</span>}
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* AB variant performance */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1.25rem' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem' }}>A/B Variant Performance</h2>
            {Object.keys(abCounts).length === 0 && <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>No A/B variant data yet</p>}
            {Object.entries(abCounts).map(([variant, stats]) => (
              <div key={variant} style={{ marginBottom: '0.875rem', padding: '0.75rem', background: '#f9fafb', borderRadius: 8 }}>
                <p style={{ fontWeight: 700, fontSize: '0.85rem', margin: '0 0 0.35rem', fontFamily: 'monospace' }}>{variant}</p>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#6b7280' }}>
                  <span>Views: <strong style={{ color: '#374151' }}>{stats.views}</strong></span>
                  <span>Conversions: <strong style={{ color: '#374151' }}>{stats.conversions}</strong></span>
                  <span>CVR: <strong style={{ color: '#4f46e5' }}>{stats.views > 0 ? ((stats.conversions / stats.views) * 100).toFixed(1) : 0}%</strong></span>
                </div>
              </div>
            ))}
          </div>

          {/* Experiment status table */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1.25rem' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem' }}>Recent Experiments</h2>
            {(!experiments || experiments.length === 0) && <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>No experiments yet</p>}
            {experiments?.map(exp => (
              <div key={exp.id} style={{ marginBottom: '0.6rem', padding: '0.6rem 0.75rem', background: '#f9fafb', borderRadius: 8, fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <Link href={`/experiments/${exp.id}`} style={{ color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>{exp.slug}</Link>
                  <span style={{
                    padding: '0.1rem 0.5rem', borderRadius: 10, fontSize: '0.72rem', fontWeight: 600,
                    background: exp.status === 'running' ? '#dcfce7' : exp.status === 'concluded' ? '#ede9fe' : '#f3f4f6',
                    color: exp.status === 'running' ? '#166534' : exp.status === 'concluded' ? '#5b21b6' : '#6b7280',
                  }}>{exp.status}</span>
                </div>
                <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                  Confidence: {exp.confidence ? `${(exp.confidence * 100).toFixed(0)}%` : '—'} · 
                  Views: {(exp.views_a ?? 0) + (exp.views_b ?? 0)}
                  {exp.winner && <span style={{ color: '#4f46e5', fontWeight: 600 }}> · Winner: {exp.winner}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit trail */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '1.25rem' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem' }}>Audit Trail</h2>
          {(!auditRows || auditRows.length === 0) && <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>No audit events yet</p>}
          <div data-testid="audit-trail" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {auditRows?.map((row, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '0.5rem 0.75rem', background: i % 2 === 0 ? '#f9fafb' : '#fff', borderRadius: 6, fontSize: '0.8rem' }}>
                <span style={{ color: '#9ca3af', width: 130, flexShrink: 0, fontSize: '0.72rem' }}>
                  {new Date(row.occurred_at).toLocaleString()}
                </span>
                <span style={{ fontFamily: 'monospace', color: '#4f46e5', fontWeight: 600, width: 140, flexShrink: 0 }}>{row.action}</span>
                <span style={{ color: '#6b7280' }}>
                  {row.entity_type}{row.entity_id ? ` · ${String(row.entity_id).slice(0, 8)}` : ''}
                  {row.new_value && typeof row.new_value === 'object' && 'product_name' in row.new_value
                    ? ` · ${row.new_value.product_name}`
                    : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
