import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Billing' }

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <Link href="/" style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827', textDecoration: 'none' }}>🚀 PricePilot</Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', margin: '1rem 0 0.75rem' }}>Billing</h1>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Sign in to manage your billing and subscription.</p>
          <Link href="/login?next=/billing" style={{
            display: 'inline-block', padding: '0.75rem 2rem',
            background: '#6c47ff', color: '#fff', borderRadius: '0.75rem',
            fontWeight: 700, textDecoration: 'none',
          }}>
            Sign in to manage billing
          </Link>
        </div>
      </div>
    )
  }

  const sp = await searchParams
  const showSuccess = sp.success === '1'

  const { data: profile } = await supabase.from('profiles').select('plan, stripe_customer_id').eq('id', user.id).single()
  const plan = profile?.plan || 'free'

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#fafafa', minHeight: '100vh' }}>
      <nav style={{ borderBottom: '1px solid #e5e7eb', background: '#fff', padding: '0 1.5rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/dashboard" style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827', textDecoration: 'none' }}>🚀 PricePilot</Link>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.9rem' }}>Dashboard</Link>
          </div>
        </div>
      </nav>
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Billing</h1>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Manage your subscription and payment details.</p>

        {showSuccess && (
          <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem', color: '#15803d', fontWeight: 600 }}>
            🎉 You&apos;re now on Pro! Welcome to unlimited experiments.
          </div>
        )}

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '1rem', padding: '2rem', marginBottom: '1.5rem' }} data-testid="billing-plan-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                {plan === 'pro' ? '⚡ Pro Plan' : '🌱 Free Plan'}
              </p>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                {plan === 'pro'
                  ? 'Full access to all features including unlimited experiments.'
                  : 'Limited to 3 experiments. Upgrade to Pro for unlimited access.'}
              </p>
            </div>
            <span style={{
              background: plan === 'pro' ? '#ede9fe' : '#f3f4f6',
              color: plan === 'pro' ? '#6c47ff' : '#6b7280',
              borderRadius: 999, padding: '0.2rem 0.75rem',
              fontSize: '0.75rem', fontWeight: 700,
            }}>
              {plan.toUpperCase()}
            </span>
          </div>

          {plan !== 'pro' && (
            <div style={{ marginTop: '1.25rem' }}>
              <form method="post" action="/api/billing/checkout">
                <button type="submit" data-testid="upgrade-btn" style={{
                  padding: '0.75rem 1.5rem', background: '#6c47ff', color: '#fff',
                  border: 'none', borderRadius: '0.75rem', fontWeight: 700, cursor: 'pointer',
                }}>
                  Upgrade to Pro — $29/mo →
                </button>
              </form>
            </div>
          )}

          {plan === 'pro' && (
            <div style={{ marginTop: '1.25rem' }}>
              <form method="post" action="/api/billing/portal">
                <button type="submit" data-testid="manage-billing-btn" style={{
                  padding: '0.75rem 1.5rem', background: '#fff', color: '#374151',
                  border: '1px solid #e5e7eb', borderRadius: '0.75rem', fontWeight: 600, cursor: 'pointer',
                }}>
                  Manage billing →
                </button>
              </form>
            </div>
          )}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '1rem', padding: '1.25rem', fontSize: '0.875rem', color: '#6b7280' }}>
          <p>Questions about billing? Email us at <a href="mailto:support@pricepilot.app" style={{ color: '#6c47ff' }}>support@pricepilot.app</a></p>
          <p style={{ marginTop: '0.5rem' }}>
            See our <Link href="/refund" style={{ color: '#6c47ff' }}>Refund Policy</Link> for cancellation and refund information.
          </p>
        </div>
      </main>
    </div>
  )
}
