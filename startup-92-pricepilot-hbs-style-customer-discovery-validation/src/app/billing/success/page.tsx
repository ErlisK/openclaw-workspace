import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Upgrade Successful' }

export default function BillingSuccessPage() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#111827', marginBottom: '0.75rem' }}>
          You&apos;re now on Pro!
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1.1rem', marginBottom: '2rem' }}>
          Your Pro plan is now active. Enjoy unlimited experiments and all Pro features.
        </p>
        <Link href="/dashboard" style={{
          display: 'inline-block', padding: '0.875rem 2rem',
          background: '#6c47ff', color: '#fff', borderRadius: '0.75rem',
          fontWeight: 700, textDecoration: 'none', fontSize: '1rem',
        }}>
          Go to Dashboard →
        </Link>
        <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: '#9ca3af' }}>
          <Link href="/billing" style={{ color: '#6c47ff' }}>Manage billing</Link>
          {' · '}
          <Link href="/pricing" style={{ color: '#6c47ff' }}>Back to pricing</Link>
        </p>
      </div>
    </div>
  )
}
