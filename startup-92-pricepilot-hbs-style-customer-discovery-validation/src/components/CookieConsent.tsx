'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const CONSENT_KEY = 'pp_cookie_consent'

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY)
      if (!stored) setVisible(true)
    } catch {
      // ignore SSR / private browsing
    }
  }, [])

  const accept = (all: boolean) => {
    try {
      localStorage.setItem(CONSENT_KEY, all ? 'all' : 'essential')
      if (all && typeof window !== 'undefined') {
        // Signal consent to analytics
        (window as unknown as Record<string, unknown>).__analyticsConsent = true
      }
    } catch { /* ignore */ }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        position: 'fixed',
        bottom: '1rem',
        left: '1rem',
        right: '1rem',
        maxWidth: 480,
        margin: '0 auto',
        background: '#fff',
        border: '1px solid var(--border, #e5e7eb)',
        borderRadius: '0.75rem',
        padding: '1.25rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        zIndex: 9999,
        fontSize: '0.875rem',
        color: '#374151',
      }}
    >
      <p style={{ marginBottom: '1rem', lineHeight: 1.5 }}>
        We use essential cookies for authentication and optional analytics cookies to improve the product.{' '}
        <Link href="/privacy" style={{ color: '#6c47ff', textDecoration: 'underline' }}>
          Privacy Policy
        </Link>
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => accept(true)}
          data-testid="cookie-accept-all"
          style={{
            background: '#6c47ff',
            color: '#fff',
            border: 'none',
            borderRadius: '0.4rem',
            padding: '0.4rem 0.9rem',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          Accept all
        </button>
        <button
          onClick={() => accept(false)}
          data-testid="cookie-essential-only"
          style={{
            background: '#f3f4f6',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '0.4rem',
            padding: '0.4rem 0.9rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Essential only
        </button>
      </div>
    </div>
  )
}
