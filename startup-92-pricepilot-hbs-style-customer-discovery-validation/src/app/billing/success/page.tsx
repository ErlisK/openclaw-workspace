import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams

  // Attempt to read updated plan (webhook may have already fired)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let plan = 'pro' // optimistic — webhook sets it; success page just celebrates
  if (user) {
    const { data: ent } = await supabase
      .from('entitlements')
      .select('plan')
      .eq('user_id', user.id)
      .single()
    if (ent?.plan) plan = ent.plan
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#fafafa', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '1rem', padding: '3rem', maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>
          You&apos;re on Pro!
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
          Your subscription is active. Enjoy unlimited experiments and all AI writing tools.
          {session_id && <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.8rem', color: '#d1d5db' }}>Session: {session_id.slice(0, 24)}…</span>}
        </p>

        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.75rem', padding: '1rem', marginBottom: '2rem' }}>
          <p style={{ color: '#065f46', fontWeight: 700 }}>Current plan: <span style={{ textTransform: 'uppercase' }}>{plan}</span></p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link href="/dashboard" style={{
            display: 'block', padding: '0.75rem', background: '#6c47ff', color: '#fff',
            borderRadius: '0.75rem', textDecoration: 'none', fontWeight: 700,
          }} data-testid="success-dashboard-link">
            Go to dashboard →
          </Link>
          <Link href="/experiments/new" style={{
            display: 'block', padding: '0.75rem', border: '1px solid #e5e7eb',
            borderRadius: '0.75rem', textDecoration: 'none', color: '#374151', fontWeight: 600,
          }}>
            Create your first experiment →
          </Link>
        </div>
      </div>
    </div>
  )
}
