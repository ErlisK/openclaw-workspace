import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default async function ExperimentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: experiments } = await supabase
    .from('experiments')
    .select('*, products(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const statusColor = (s: string) => {
    if (s === 'active') return 'badge-green'
    if (s === 'rolled_back') return 'badge-red'
    if (s === 'concluded') return 'badge-purple'
    return 'badge-yellow'
  }

  return (
    <div className="page">
      <nav className="nav">
        <div className="container nav-inner">
          <Link href="/dashboard" className="nav-logo">🚀 PricePilot</Link>
          <div className="nav-links">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/import">Import</Link>
            <Link href="/suggestions">Suggestions</Link>
          </div>
        </div>
      </nav>

      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Experiments</h1>
            <p style={{ color: 'var(--muted)' }}>A/B price tests with rollback</p>
          </div>
          <Link href="/experiments/new" className="btn btn-primary" data-testid="new-experiment-btn">+ New experiment</Link>
        </div>

        {(!experiments || experiments.length === 0) ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>🧪</p>
            <h2 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>No experiments yet</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>Start from a suggestion to create your first price experiment.</p>
            <Link href="/suggestions" className="btn btn-primary">View suggestions →</Link>
          </div>
        ) : (
          <div>
            {experiments.map((exp: Record<string, unknown>) => {
              const prod = exp.products as { name: string } | null
              const confPct = exp.confidence ? Math.round((exp.confidence as number) * 100) : null
              return (
                <div key={exp.id as string} className="card" style={{ marginBottom: '1rem' }} data-testid="experiment-row" data-status={exp.status as string}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontWeight: 700 }}>{prod?.name || 'Product'}</h3>
                        <span className={`badge ${statusColor(exp.status as string)}`}>{exp.status as string}</span>
                      </div>
                      <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                        Control: ${((exp.variant_a_price_cents as number) / 100).toFixed(0)} vs
                        Challenger: ${((exp.variant_b_price_cents as number) / 100).toFixed(0)}
                      </p>
                      {confPct !== null && (
                        <div style={{ marginTop: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Confidence</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{confPct}% likely</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${confPct}%` }} />
                          </div>
                        </div>
                      )}
                      <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                        Slug: <code>/x/{exp.slug as string}</code> · {(exp.conversions_a as number) + (exp.conversions_b as number)} conversions
                      </p>
                    </div>
                    <Link href={`/experiments/${exp.id as string}`} className="btn btn-secondary btn-sm" style={{ marginLeft: '1rem' }}>
                      View →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
