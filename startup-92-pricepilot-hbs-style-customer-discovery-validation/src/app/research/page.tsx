/**
 * /research — Public signals research hub
 * Shows scraped pricing discussions clustered by theme + AI-derived personas.
 * No auth required — this is a public research page.
 * Data comes from the weekly cron job (/api/cron/weekly-signals).
 *
 * If the table is empty (first run), shows a placeholder with trigger instructions.
 */
import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

export const metadata: Metadata = {
  title: 'Pricing Research — Public Signals | PricePilot',
  description: 'Weekly-scraped pricing discussions from Hacker News, Product Hunt and the indie SaaS community, clustered by theme.',
}
export const dynamic = 'force-dynamic'
export const revalidate = 0

const CLUSTER_META: Record<string, { label: string; icon: string; color: string }> = {
  price_increase:     { label: 'Price Increases',       icon: '📈', color: '#10b981' },
  price_experiment:   { label: 'Price Experiments',     icon: '🧪', color: '#6366f1' },
  churn_risk:         { label: 'Churn Risk',             icon: '⚠️', color: '#f59e0b' },
  value_anchor:       { label: 'Value Communication',   icon: '💎', color: '#8b5cf6' },
  competitor_pricing: { label: 'Competitor Pricing',    icon: '🔍', color: '#06b6d4' },
  bundling:           { label: 'Bundling & Tiering',    icon: '📦', color: '#ec4899' },
  new_tool:           { label: 'New Tools',             icon: '🛠', color: '#14b8a6' },
  general_pricing:    { label: 'General Pricing',       icon: '💬', color: '#6b7280' },
}

const SOURCE_LABELS: Record<string, { label: string; icon: string }> = {
  hacker_news:     { label: 'Hacker News',      icon: '🟠' },
  hacker_news_ask: { label: 'Ask HN',            icon: '🔶' },
  product_hunt:    { label: 'Product Hunt',      icon: '🔴' },
  reddit:          { label: 'Reddit',            icon: '🔵' },
}

interface PublicSignal {
  id: string
  source: string
  signal_type: string
  title: string
  url: string | null
  summary: string | null
  price_context: string | null
  cluster: string | null
  persona_tags: string[] | null
  collected_at: string
  week_label: string
}

interface Persona {
  id: string
  name: string
  segment: string | null
  pain_points: string[] | null
  price_range: string | null
  key_signals: string[] | null
  evidence_count: number
  week_label: string | null
  updated_at: string
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function getData() {
  const supabase = getServiceClient()

  const [{ data: signals }, { data: personas }] = await Promise.all([
    supabase
      .from('public_signals')
      .select('*')
      .order('collected_at', { ascending: false })
      .limit(200),
    supabase
      .from('research_personas')
      .select('*')
      .order('evidence_count', { ascending: false })
      .limit(8),
  ])

  return {
    signals: (signals ?? []) as PublicSignal[],
    personas: (personas ?? []) as Persona[],
  }
}

export default async function ResearchPage() {
  const { signals, personas } = await getData()

  // Group by cluster
  const byCluster: Record<string, PublicSignal[]> = {}
  for (const s of signals) {
    const cluster = s.cluster ?? 'general_pricing'
    if (!byCluster[cluster]) byCluster[cluster] = []
    byCluster[cluster].push(s)
  }

  const sortedClusters = Object.entries(byCluster)
    .sort((a, b) => b[1].length - a[1].length)

  // Group by week
  const weeks = [...new Set(signals.map(s => s.week_label))].sort().reverse().slice(0, 4)

  const isEmpty = signals.length === 0

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', background: '#0f0f23', color: '#e5e7eb' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #1e1e3f', padding: '1.25rem 2rem', background: '#0f0f23' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <a href="/" style={{ color: '#6366f1', fontWeight: 800, fontSize: '1rem', textDecoration: 'none' }}>PricePilot</a>
            <span style={{ color: '#374151', margin: '0 0.5rem' }}>›</span>
            <span style={{ color: '#9ca3af', fontSize: '0.9rem', fontWeight: 600 }}>Pricing Research</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem' }}>
            <a href="/calculator" style={{ color: '#6366f1', textDecoration: 'none' }}>Calculator</a>
            <a href="/blog" style={{ color: '#6366f1', textDecoration: 'none' }}>Blog</a>
            <a href="/guides" style={{ color: '#6366f1', textDecoration: 'none' }}>Guides</a>
          </div>
        </div>
      </div>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Page title */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', margin: '0 0 0.5rem' }}>
            🔭 Weekly Pricing Signals
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
            Automatically scraped from Hacker News, Ask HN, and Product Hunt every Monday.
            AI-clustered by pricing theme. {signals.length > 0 && `${signals.length} signals from ${weeks.length} week${weeks.length !== 1 ? 's' : ''}.`}
          </p>
        </div>

        {isEmpty ? (
          /* Empty state */
          <div data-testid="empty-state" style={{ textAlign: 'center', padding: '4rem 2rem', background: '#1e1e3f', borderRadius: 12, border: '1px dashed #3730a3' }}>
            <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📭</p>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a5b4fc', marginBottom: '0.5rem' }}>No signals yet</h2>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', maxWidth: 420, margin: '0 auto 1.5rem' }}>
              The weekly cron runs every Monday at 09:00 UTC. To trigger it manually, call the cron endpoint with the correct secret.
            </p>
            <code style={{ background: '#0f0f23', padding: '0.5rem 0.875rem', borderRadius: 6, fontSize: '0.75rem', color: '#a5b4fc', fontFamily: 'monospace' }}>
              GET /api/cron/weekly-signals
            </code>
          </div>
        ) : (
          <>
            {/* Cluster summary strip */}
            <div data-testid="cluster-summary" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
              {sortedClusters.map(([cluster, items]) => {
                const meta = CLUSTER_META[cluster] ?? CLUSTER_META.general_pricing
                return (
                  <a
                    key={cluster}
                    href={`#cluster-${cluster}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      padding: '0.35rem 0.75rem', borderRadius: 20,
                      background: '#1e1e3f', border: `1px solid ${meta.color}44`,
                      color: meta.color, fontSize: '0.78rem', fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    <span>{meta.icon}</span>
                    <span>{meta.label}</span>
                    <span style={{ background: meta.color + '22', borderRadius: 10, padding: '0 0.35rem', fontSize: '0.7rem' }}>{items.length}</span>
                  </a>
                )
              })}
            </div>

            {/* AI Personas */}
            {personas.length > 0 && (
              <section data-testid="personas-section" style={{ marginBottom: '2.5rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a5b4fc', marginBottom: '1rem' }}>
                  🧑‍💼 AI-Derived Personas
                  <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#4b5563', marginLeft: '0.5rem' }}>
                    Generated from this week&apos;s signal patterns
                  </span>
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {personas.map(p => (
                    <div key={p.id} data-testid="persona-card" style={{ background: '#1e1e3f', borderRadius: 10, padding: '1.25rem', border: '1px solid #2d2d5e' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e5e7eb', margin: 0 }}>{p.name}</h3>
                        {p.price_range && (
                          <span style={{ fontSize: '0.7rem', background: '#10b98122', color: '#10b981', padding: '0.15rem 0.4rem', borderRadius: 4, flexShrink: 0 }}>
                            {p.price_range}
                          </span>
                        )}
                      </div>
                      {p.segment && <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: '0 0 0.75rem' }}>{p.segment}</p>}
                      {p.pain_points && p.pain_points.length > 0 && (
                        <div>
                          <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.3rem' }}>Pain Points</p>
                          <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                            {p.pain_points.map((pp, i) => <li key={i} style={{ marginBottom: '0.15rem' }}>{pp}</li>)}
                          </ul>
                        </div>
                      )}
                      <p style={{ fontSize: '0.68rem', color: '#374151', margin: '0.75rem 0 0', textAlign: 'right' }}>
                        {p.evidence_count} signals · {p.week_label ?? 'this week'}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Signals by cluster */}
            {sortedClusters.map(([cluster, items]) => {
              const meta = CLUSTER_META[cluster] ?? CLUSTER_META.general_pricing
              return (
                <section key={cluster} id={`cluster-${cluster}`} data-testid={`cluster-${cluster}`} style={{ marginBottom: '2rem' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, color: meta.color, marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>{meta.icon}</span>
                    <span>{meta.label}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#4b5563', marginLeft: '0.25rem' }}>({items.length})</span>
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {items.slice(0, 10).map(signal => {
                      const src = SOURCE_LABELS[signal.source] ?? { label: signal.source, icon: '🔗' }
                      return (
                        <div key={signal.id} data-testid="signal-card" style={{ background: '#1e1e3f', borderRadius: 8, padding: '0.875rem 1rem', border: '1px solid #1e2a4f', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '0.1rem' }}>{src.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                              {signal.url ? (
                                <a href={signal.url} target="_blank" rel="noopener noreferrer" style={{ color: '#e5e7eb', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none', flex: 1, minWidth: 200 }}>
                                  {signal.title}
                                </a>
                              ) : (
                                <span style={{ color: '#e5e7eb', fontWeight: 600, fontSize: '0.85rem', flex: 1 }}>{signal.title}</span>
                              )}
                              <span style={{ fontSize: '0.7rem', color: '#4b5563', flexShrink: 0 }}>{src.label}</span>
                            </div>
                            {signal.summary && (
                              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.2rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {signal.summary}
                              </p>
                            )}
                            {signal.price_context && (
                              <span style={{ display: 'inline-block', marginTop: '0.3rem', fontSize: '0.7rem', background: '#10b98122', color: '#10b981', padding: '0.1rem 0.35rem', borderRadius: 4 }}>
                                💵 {signal.price_context}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })}

            {/* Week labels footer */}
            <div style={{ fontSize: '0.72rem', color: '#374151', textAlign: 'center', marginTop: '2rem' }}>
              Data from weeks: {weeks.join(' · ')} · Updated every Monday at 09:00 UTC
            </div>
          </>
        )}
      </main>
    </div>
  )
}
