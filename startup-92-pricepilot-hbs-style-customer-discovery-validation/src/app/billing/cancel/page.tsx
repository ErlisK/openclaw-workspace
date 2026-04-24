import Link from 'next/link'

export default function BillingCancelPage() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#fafafa', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '1rem', padding: '3rem', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>😕</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Checkout cancelled</h1>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
          No problem — you&apos;re still on the free plan. Upgrade anytime from the pricing page.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link href="/pricing" style={{ display: 'block', padding: '0.75rem', background: '#6c47ff', color: '#fff', borderRadius: '0.75rem', textDecoration: 'none', fontWeight: 700 }}
            data-testid="cancel-back-to-pricing">
            Back to pricing →
          </Link>
          <Link href="/dashboard" style={{ display: 'block', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.75rem', textDecoration: 'none', color: '#374151' }}>
            Continue with free plan
          </Link>
        </div>
      </div>
    </div>
  )
}
