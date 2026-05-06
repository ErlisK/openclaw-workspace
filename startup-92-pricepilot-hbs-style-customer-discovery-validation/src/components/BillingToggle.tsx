'use client'
import { useState } from 'react'
import Link from 'next/link'

interface BillingToggleProps {
  isAuthed: boolean
}

export function BillingToggle({ isAuthed }: BillingToggleProps) {
  const [annual, setAnnual] = useState(false)
  const monthlyPrice = 29
  const annualMonthly = 19
  const annualTotal = annualMonthly * 12 // $228

  return (
    <div>
      {/* Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
        <span style={{ fontSize: '0.9rem', color: annual ? '#9ca3af' : '#111827', fontWeight: annual ? 400 : 700 }}>Monthly</span>
        <button
          onClick={() => setAnnual(!annual)}
          aria-pressed={annual}
          style={{
            position: 'relative',
            width: 48,
            height: 26,
            borderRadius: 999,
            border: 'none',
            background: annual ? '#6c47ff' : '#d1d5db',
            cursor: 'pointer',
            transition: 'background 0.2s',
            padding: 0,
          }}
        >
          <span style={{
            position: 'absolute',
            top: 3,
            left: annual ? 25 : 3,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </button>
        <span style={{ fontSize: '0.9rem', color: annual ? '#111827' : '#9ca3af', fontWeight: annual ? 700 : 400 }}>
          Annual
        </span>
        {annual && (
          <span style={{
            background: '#dcfce7',
            color: '#166534',
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '0.2rem 0.6rem',
            borderRadius: 999,
          }}>
            Save $120/yr
          </span>
        )}
      </div>

      {/* Pro card price section */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.25rem' }}>
        <span style={{ fontSize: '3rem', fontWeight: 900, color: '#111827' }}>
          ${annual ? annualMonthly : monthlyPrice}
        </span>
        <span style={{ color: '#9ca3af' }}>/month</span>
        {annual && (
          <span style={{ color: '#9ca3af', fontSize: '0.8rem', marginLeft: '0.25rem', textDecoration: 'line-through' }}>
            $29
          </span>
        )}
      </div>
      {annual && (
        <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.25rem' }}>
          Billed as ${annualTotal}/year
        </p>
      )}
      <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        {annual ? '2 months free · cancel anytime' : 'Cancel anytime'}
      </p>

      {/* CTA */}
      {isAuthed ? (
        <form method="post" action={`/api/billing/checkout${annual ? '?plan=annual' : ''}`} style={{ marginBottom: '1.5rem' }}>
          <button
            type="submit"
            data-testid="upgrade-btn"
            style={{
              display: 'block',
              width: '100%',
              padding: '0.75rem',
              background: '#6c47ff',
              color: '#fff',
              border: 'none',
              borderRadius: '0.75rem',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            {annual ? 'Upgrade to Pro (Annual) →' : 'Upgrade to Pro →'}
          </button>
        </form>
      ) : (
        <Link
          href={`/signup?intent=upgrade${annual ? '&plan=annual' : ''}`}
          rel="nofollow"
          data-testid="upgrade-btn"
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '0.75rem',
            background: '#6c47ff',
            color: '#fff',
            borderRadius: '0.75rem',
            fontWeight: 700,
            fontSize: '1rem',
            textDecoration: 'none',
            marginBottom: '1.5rem',
          }}
        >
          {annual ? 'Get Pro Annual — $19/mo →' : 'Upgrade to Pro →'}
        </Link>
      )}
    </div>
  )
}
