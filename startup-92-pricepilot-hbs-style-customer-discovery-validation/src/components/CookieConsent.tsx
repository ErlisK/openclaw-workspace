'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const CONSENT_KEY = 'pp_cookie_consent'

// Auth and public pages where the banner must not appear
const HIDDEN_PATHS = ['/login', '/signup', '/reset-password']

export function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // Don't show on auth pages at all
    if (HIDDEN_PATHS.some(p => pathname.startsWith(p))) return
    try {
      const stored = localStorage.getItem(CONSENT_KEY)
      if (!stored) setVisible(true)
    } catch {
      // ignore SSR / private browsing
    }
  }, [pathname])

  const accept = (all: boolean) => {
    try {
      localStorage.setItem(CONSENT_KEY, all ? 'all' : 'essential')
      if (all && typeof window !== 'undefined') {
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
        bottom: 0,
        left: 0,
        right: 0,
        background: '#fff',
        borderTop: '1px solid #e5e7eb',
        padding: '1rem 1.5rem',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
        zIndex: 1000,
        fontSize: '0.875rem',
        color: '#374151',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        pointerEvents: 'auto',
      }}
    >
      <p style={{ margin: 0, lineHeight: 1.5, flex: 1 }}>
        We use essential cookies for authentication and optional analytics cookies to improve the product.{' '}
        <Link href="/cookies" style={{ color: '#6c47ff', textDecoration: 'underline' }}>
          Cookie Policy
        </Link>
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        <button
          onClick={() => accept(true)}
          data-testid="cookie-accept-btn"
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
