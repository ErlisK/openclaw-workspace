'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

/**
 * Sticky bottom CTA bar — appears after user scrolls 60% of the page.
 * Targets visitors who read the whole page but haven't clicked a primary CTA.
 */
export function StickySignupBar() {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)
      if (scrolled > 0.55) setVisible(true)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (dismissed || !visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: '#1e1b4b',
        color: '#fff',
        padding: '0.875rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.25)',
        animation: 'slideUp 0.3s ease',
      }}
    >
      <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
      <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>
        🎯 Get your free pricing audit — no signup needed
      </span>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <Link
          href="/free-audit"
          style={{
            background: '#6c47ff',
            color: '#fff',
            padding: '0.5rem 1.25rem',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '0.875rem',
            whiteSpace: 'nowrap',
          }}
        >
          Free audit →
        </Link>
        <Link
          href="/signup"
          style={{
            background: 'transparent',
            color: '#c4b5fd',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            border: '1px solid #4c1d95',
            whiteSpace: 'nowrap',
          }}
        >
          Sign up free
        </Link>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          background: 'none',
          border: 'none',
          color: '#9ca3af',
          cursor: 'pointer',
          fontSize: '1.1rem',
          padding: '0.25rem',
          lineHeight: 1,
          position: 'absolute',
          right: '1rem',
        }}
      >
        ×
      </button>
    </div>
  )
}
