import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { DisclaimerBanner } from '@/components/DisclaimerBanner'

async function logout() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: products } = await supabase
    .from('products')
    .select('*, transactions(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: experiments } = await supabase
    .from('experiments')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')

  const { data: suggestions } = await supabase
    .from('suggestions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(3)

  const totalTxns = await supabase
    .from('transactions')
    .select('id', { count: 'exact' })
    .eq('user_id', user.id)

  return (
    <div className="page">
      <nav className="nav">
        <div className="container nav-inner">
          <Link href="/dashboard" className="nav-logo">🚀 PricingSim</Link>
          <div className="nav-links">
            <Link href="/import">Import</Link>
            <Link href="/suggestions">Suggestions</Link>
            <Link href="/experiments">Experiments</Link>
            <Link href="/ai-tools">AI Tools</Link>
            <Link href="/settings/connections">Connections</Link>
            <Link href="/onboarding">Get Started</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/docs">Docs</Link>
            <form action={logout}>
              <button type="submit" className="btn btn-secondary btn-sm" data-testid="logout-btn">Sign out</button>
            </form>
          </div>
        </div>
      </nav>

      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <DisclaimerBanner />
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Dashboard</h1>
          <p style={{ color: 'var(--muted)' }}>Welcome back, {user.email}</p>
        </div>

        <div className="grid-3" style={{ marginBottom: '2rem' }}>
          <div className="card">
            <p className="stat-label">Products tracked</p>
            <p className="stat-big">{products?.length || 0}</p>
          </div>
          <div className="card">
            <p className="stat-label">Transactions imported</p>
            <p className="stat-big">{totalTxns.count || 0}</p>
          </div>
          <div className="card">
            <p className="stat-label">Active experiments</p>
            <p className="stat-big">{experiments?.length || 0}</p>
          </div>
        </div>

        {(!products || products.length === 0) && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>📂</p>
            <h2 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Import your first sales data</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>Upload a Gumroad CSV or connect Stripe to get your first price recommendation in minutes.</p>
            <Link href="/import" className="btn btn-primary">Import sales data →</Link>
          </div>
        )}

        {suggestions && suggestions.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontWeight: 700 }}>💡 Price suggestions</h2>
              <Link href="/suggestions" style={{ fontSize: '0.9rem' }}>View all →</Link>
            </div>
            {suggestions.map((s: Record<string, unknown>) => (
              <div key={s.id as string} className="card" style={{ marginBottom: '0.75rem' }} data-testid="suggestion-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: 700 }}>{s.title as string}</p>
                    <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.25rem' }} data-testid="suggestion-why">{s.rationale as string}</p>
                  </div>
                  <span className="badge badge-purple" style={{ whiteSpace: 'nowrap' }}>{s.confidence_label as string}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {products && products.length > 0 && (
          <div>
            <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Products</h2>
            {products.map((p: Record<string, unknown>) => (
              <div key={p.id as string} className="card" style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 700 }}>{p.name as string}</p>
                    <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                      ${((p.current_price_cents as number) / 100).toFixed(2)} · {p.platform as string}
                    </p>
                  </div>
                  <Link href="/suggestions" className="btn btn-secondary btn-sm">Get suggestion</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
