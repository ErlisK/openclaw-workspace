'use client'
import Link from 'next/link'
import { track } from '@/lib/analytics'

interface ProGateProps {
  feature: string
  description?: string
}

export default function ProGate({ feature, description }: ProGateProps) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
      border: '1px solid #c4b5fd',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      textAlign: 'center',
    }} data-testid="pro-gate">
      <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🔒</div>
      <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#5b21b6' }}>
        Pro feature: {feature}
      </h3>
      {description && (
        <p style={{ color: '#7c3aed', fontSize: '0.9rem', marginBottom: '1rem' }}>
          {description}
        </p>
      )}
      <Link
        href="/pricing"
        onClick={() => track('upgrade_clicked', { source: 'pro_gate', feature })}
        style={{
          display: 'inline-block',
          background: '#6c47ff',
          color: '#fff',
          padding: '0.6rem 1.5rem',
          borderRadius: '0.5rem',
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: '0.9rem',
        }}
        data-testid="pro-gate-upgrade-link"
      >
        Upgrade to Pro — $29/month →
      </Link>
      <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#9ca3af' }}>
        Cancel anytime · Stripe test mode
      </p>
    </div>
  )
}
